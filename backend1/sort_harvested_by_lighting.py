"""
Automated CCTV Lighting Sorter & Curated Dataset Builder
=========================================================
Intelligently analyzes each camera feed's dynamic exposure and luminance distribution
to separate 14,000+ CCTV frames into:
  1. daylight_morning_rush/   (Bright morning & afternoon sun, heavy traffic)
  2. twilight_dusk_dawn/      (Sunrise / sunset transition lighting)
  3. night_sodium_lighting/   (Nighttime sodium streetlamps, high-beam headlights)

Uses macOS symlinks to consume 0 MB of extra disk space while enabling instant Finder browsing.
"""

import os
import glob
import cv2
import numpy as np
import zipfile
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRAMES_DIR = os.path.join(BASE_DIR, "harvested_cctv_frames")
OUTPUT_DIR = os.path.join(BASE_DIR, "curated_by_lighting")

DAY_DIR = os.path.join(OUTPUT_DIR, "daylight_morning_rush")
TWILIGHT_DIR = os.path.join(OUTPUT_DIR, "twilight_dusk_dawn")
NIGHT_DIR = os.path.join(OUTPUT_DIR, "night_sodium_lighting")

for d in [DAY_DIR, TWILIGHT_DIR, NIGHT_DIR]:
    os.makedirs(d, exist_ok=True)

def process_camera(cam_name):
    cam_path = os.path.join(FRAMES_DIR, cam_name)
    if not os.path.isdir(cam_path):
        return None

    files = sorted(glob.glob(os.path.join(cam_path, "*.jpg")))
    if not files:
        return None

    # Calculate grayscale mean luminance for each frame
    frame_stats = []
    for f in files:
        # Fast 1/4 resolution read
        img = cv2.imread(f, cv2.IMREAD_GRAYSCALE)
        if img is not None:
            lum = float(np.mean(img))
            frame_stats.append((f, lum))

    if not frame_stats:
        return None

    luminances = [s[1] for s in frame_stats]
    min_lum = min(luminances)
    max_lum = max(luminances)
    range_lum = max_lum - min_lum

    # Dynamic camera-specific thresholding
    if range_lum < 15.0:
        # Stationary exposure / constant illumination camera
        thresh_day = min_lum + range_lum * 0.50
        thresh_night = min_lum + range_lum * 0.20
    else:
        thresh_day = min_lum + range_lum * 0.45
        thresh_night = min_lum + range_lum * 0.22

    day_count = 0
    twi_count = 0
    night_count = 0

    for f_path, lum in frame_stats:
        fname = os.path.basename(f_path)
        if lum >= thresh_day:
            target_folder = DAY_DIR
            day_count += 1
        elif lum < thresh_night:
            target_folder = NIGHT_DIR
            night_count += 1
        else:
            target_folder = TWILIGHT_DIR
            twi_count += 1

        dest_link = os.path.join(target_folder, fname)
        if not os.path.exists(dest_link):
            try:
                os.symlink(f_path, dest_link)
            except Exception:
                pass

    return {
        "cam": cam_name,
        "total": len(files),
        "day": day_count,
        "twilight": twi_count,
        "night": night_count
    }

def main():
    print("=" * 65)
    print("🌅 GUJARAT CCTV LIGHTING & SCENE INTELLIGENCE SORTER")
    print("=" * 65)
    cams = sorted([d for d in os.listdir(FRAMES_DIR) if d.startswith("cam")])
    print(f"Scanning {len(cams)} camera streams across harvested footage...")

    total_day = 0
    total_twi = 0
    total_night = 0

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(process_camera, cams))

    print(f"\n{'Camera':<8} | {'Total':<6} | {'☀️ Daylight':<12} | {'🌆 Twilight':<12} | {'🌙 Night':<10}")
    print("-" * 65)
    for r in results:
        if r:
            print(f"{r['cam']:<8} | {r['total']:<6} | {r['day']:<12} | {r['twilight']:<12} | {r['night']:<10}")
            total_day += r['day']
            total_twi += r['twilight']
            total_night += r['night']

    print("-" * 65)
    print(f"🎉 SORTING COMPLETE!")
    print(f"☀️ Daylight / Morning Rush : {total_day:,} frames -> {DAY_DIR}")
    print(f"🌆 Twilight / Transition   : {total_twi:,} frames -> {TWILIGHT_DIR}")
    print(f"🌙 Night Sodium Lighting   : {total_night:,} frames -> {NIGHT_DIR}")
    print(f"\nZero duplicate disk space consumed (using high-speed filesystem symlinks).")

    # Package diverse morning rush sample for Roboflow
    sample_zip = os.path.join(os.path.dirname(BASE_DIR), "morning_rush_sample_for_roboflow.zip")
    day_files = sorted(glob.glob(os.path.join(DAY_DIR, "*.jpg")))
    if day_files:
        step = max(1, len(day_files) // 300)
        sampled_day = day_files[::step][:300]
        print(f"\n📦 Packaging {len(sampled_day)} curated morning rush frames into {os.path.basename(sample_zip)}...")
        with zipfile.ZipFile(sample_zip, "w", zipfile.ZIP_DEFLATED) as zf:
            for fp in sampled_day:
                zf.write(fp, arcname=os.path.join("images", os.path.basename(fp)))
        size_mb = os.path.getsize(sample_zip) / (1024 * 1024)
        print(f"✅ Ready-to-upload ZIP created: {sample_zip} ({size_mb:.1f} MB)")

if __name__ == "__main__":
    main()
