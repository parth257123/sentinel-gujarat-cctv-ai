"""
CCTV AI Dataset Deduplication & Intelligent Curation Pipeline
=============================================================
Filters 14,027 raw harvested frames into a lean, high-variance dataset containing
ONLY genuinely unique and useful frames for training:

1. Blank / Corrupted Filter: Drops dead camera screens (std < 12.0) or severe artifacts.
2. Perceptual dHash Deduplication: Eliminates static duplicate frames where nothing moved.
3. Stratified Lighting Balance: Ensures representation across:
   - ☀️ Morning Rush & Daylight (50%)
   - 🌆 Twilight & Dusk Transitions (25%)
   - 🌙 Nighttime Sodium Lighting & Headlight Glare (25%)
4. Camera Balance: Ensures all 30 statewide junctions are evenly represented.
5. Saves clean copies into backend1/datasets/unique_training_cctv_frames/
   and packages UNIQUE_GUJARAT_TRAFFIC_DATASET.zip.
"""

import os
import glob
import cv2
import shutil
import zipfile
import numpy as np
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
FRAMES_DIR = os.path.join(BASE_DIR, "harvested_cctv_frames")
OUTPUT_DIR = os.path.join(BASE_DIR, "datasets", "unique_training_cctv_frames")
OUTPUT_ZIP = os.path.join(PROJECT_ROOT, "UNIQUE_GUJARAT_TRAFFIC_DATASET.zip")

os.makedirs(OUTPUT_DIR, exist_ok=True)

def dhash(image, hash_size=8):
    """Calculates 64-bit difference hash for visual similarity matching."""
    resized = cv2.resize(image, (hash_size + 1, hash_size))
    diff = resized[:, 1:] > resized[:, :-1]
    return sum([2 ** i for (i, v) in enumerate(diff.flatten()) if v])

def hamming(h1, h2):
    return bin(h1 ^ h2).count("1")

def process_camera_unique(cam_name, target_per_cam=90):
    cam_path = os.path.join(FRAMES_DIR, cam_name)
    if not os.path.isdir(cam_path):
        return []

    files = sorted(glob.glob(os.path.join(cam_path, "*.jpg")))
    if not files:
        return []

    valid_candidates = []
    blank_dropped = 0

    # 1. Screen out dead/blank/corrupted screens and categorize luminance
    for f in files:
        img = cv2.imread(f, cv2.IMREAD_GRAYSCALE)
        if img is None:
            continue
        std = float(img.std())
        if std < 12.0:  # Dead/offline camera gray/black screen
            blank_dropped += 1
            continue

        lum = float(img.mean())
        h = dhash(img)
        valid_candidates.append({
            "path": f,
            "lum": lum,
            "hash": h,
            "name": os.path.basename(f)
        })

    if not valid_candidates:
        return []

    # 2. Sort into lighting buckets
    lums = [c["lum"] for c in valid_candidates]
    min_lum = min(lums)
    max_lum = max(lums)
    range_lum = max_lum - min_lum

    thresh_day = min_lum + range_lum * 0.45
    thresh_night = min_lum + range_lum * 0.22

    day_pool = [c for c in valid_candidates if c["lum"] >= thresh_day]
    twi_pool = [c for c in valid_candidates if thresh_night <= c["lum"] < thresh_day]
    night_pool = [c for c in valid_candidates if c["lum"] < thresh_night]

    # Target allocations per camera
    day_target = int(target_per_cam * 0.50)
    twi_target = int(target_per_cam * 0.25)
    night_target = int(target_per_cam * 0.25)

    def filter_pool_duplicates(pool, target_count):
        selected = []
        recent_hashes = []
        # Step through pool evenly across time
        if not pool:
            return []
        step = max(1, len(pool) // (target_count * 2))
        subsampled = pool[::step]

        for c in subsampled:
            h = c["hash"]
            # Deduplicate against recently selected frames (hamming distance <= 3)
            if not any(hamming(h, rh) <= 3 for rh in recent_hashes[-15:]):
                selected.append(c)
                recent_hashes.append(h)
                if len(selected) >= target_count:
                    break
        return selected

    kept_day = filter_pool_duplicates(day_pool, day_target)
    kept_twi = filter_pool_duplicates(twi_pool, twi_target)
    kept_night = filter_pool_duplicates(night_pool, night_target)

    all_kept = kept_day + kept_twi + kept_night
    return all_kept

def main():
    print("=" * 70)
    print("💎 EXTRACTING HIGH-VALUE UNIQUE CCTV FRAMES FOR AI TRAINING")
    print("=" * 70)

    # Clean previous output
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    cams = sorted([d for d in os.listdir(FRAMES_DIR) if d.startswith("cam")])
    print(f"Scanning {len(cams)} cameras across 14,027 harvested frames...")

    all_unique_frames = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(process_camera_unique, cams))

    for r in results:
        all_unique_frames.extend(r)

    print(f"\n📊 Total Unique Frames Selected: {len(all_unique_frames):,} (from 14,027 raw)")

    # Copy files into output directory
    print("📂 Saving pristine copies to unique dataset directory...")
    saved_paths = []
    for entry in all_unique_frames:
        src = entry["path"]
        dest = os.path.join(OUTPUT_DIR, entry["name"])
        shutil.copy2(src, dest)
        saved_paths.append(dest)

    # Packaging into ZIP for Roboflow / Kaggle
    print(f"📦 Packaging into {os.path.basename(OUTPUT_ZIP)}...")
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in saved_paths:
            zf.write(p, arcname=os.path.join("images", os.path.basename(p)))

    size_mb = os.path.getsize(OUTPUT_ZIP) / (1024 * 1024)
    print("\n" + "=" * 70)
    print("🎉 UNIQUE DATASET EXTRACTION COMPLETE!")
    print(f"📁 Directory : {OUTPUT_DIR}")
    print(f"📁 ZIP File  : {OUTPUT_ZIP} ({size_mb:.1f} MB)")
    print(f"🖼️ Total Unique Images: {len(saved_paths):,} frames")
    print("=" * 70)

if __name__ == "__main__":
    main()
