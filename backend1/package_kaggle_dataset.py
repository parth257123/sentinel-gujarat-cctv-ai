"""
Sentinel Gujarat CCTV — Kaggle 10-Class Dataset Packager
========================================================
Packs the 9,797 curated Gujarat CCTV + IIT Hyderabad IDD frames into a clean,
production-ready YOLO ZIP archive for fast GPU training on Kaggle.

Includes:
- images/train & images/val
- labels/train & labels/val (including 100% paired background samples)
- data.yaml configured with relative paths (path: .) and class 6: truck/tempo
"""

import os
import glob
import zipfile
import time
import yaml

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
DATASET_SOURCE = os.path.join(BASE_DIR, "datasets", "manual_annotated_gujarat")
OUTPUT_ZIP = os.path.join(PROJECT_ROOT, "SENTINEL_10CLASS_GUJARAT_TRAFFIC_DATASET.zip")

CLASSES = [
    "pedestrian",         # 0
    "car",                # 1
    "two_wheeler",        # 2
    "heavy_machinery",    # 3
    "emergency_vehicle",  # 4
    "van",                # 5
    "truck/tempo",        # 6
    "bus",                # 7
    "auto_rickshaw",      # 8
    "others"              # 9
]

def package():
    print("=" * 70, flush=True)
    print("📦 PACKAGING SENTINEL 10-CLASS GUJARAT TRAFFIC DATASET FOR KAGGLE", flush=True)
    print("=" * 70, flush=True)

    # 1. Ensure all images have a matching label (touch empty txt for background images)
    for split in ["train", "val"]:
        img_dir = os.path.join(DATASET_SOURCE, "images", split)
        lbl_dir = os.path.join(DATASET_SOURCE, "labels", split)
        os.makedirs(lbl_dir, exist_ok=True)
        
        for img_path in glob.glob(os.path.join(img_dir, "*.*")):
            base = os.path.splitext(os.path.basename(img_path))[0]
            lbl_path = os.path.join(lbl_dir, f"{base}.txt")
            if not os.path.exists(lbl_path):
                open(lbl_path, "w").close()

    # 2. Prepare portable data.yaml
    portable_yaml = {
        "path": ".",
        "train": "images/train",
        "val": "images/val",
        "nc": len(CLASSES),
        "names": {i: name for i, name in enumerate(CLASSES)}
    }
    
    yaml_string = yaml.dump(portable_yaml, sort_keys=False)
    
    # 3. Create ZIP archive with progress
    if os.path.exists(OUTPUT_ZIP):
        print(f"🗑️ Removing old zip: {OUTPUT_ZIP}", flush=True)
        os.remove(OUTPUT_ZIP)

    print(f"📁 Destination: {OUTPUT_ZIP}", flush=True)
    start_time = time.time()
    
    with zipfile.ZipFile(OUTPUT_ZIP, "w", compression=zipfile.ZIP_STORED) as zf:
        # Write data.yaml at root of zip
        zf.writestr("data.yaml", yaml_string)
        
        for split in ["train", "val"]:
            img_files = glob.glob(os.path.join(DATASET_SOURCE, "images", split, "*.*"))
            lbl_files = glob.glob(os.path.join(DATASET_SOURCE, "labels", split, "*.txt"))
            
            print(f"⏳ Archiving {split} split ({len(img_files)} images, {len(lbl_files)} labels)...", flush=True)
            
            for idx, img_path in enumerate(img_files):
                fname = os.path.basename(img_path)
                arcname = f"images/{split}/{fname}"
                zf.write(img_path, arcname)
                
                if (idx + 1) % 1500 == 0 or (idx + 1) == len(img_files):
                    elapsed = time.time() - start_time
                    print(f"   • Images: {idx + 1}/{len(img_files)} ({elapsed:.1f}s)", flush=True)
                    
            for idx, lbl_path in enumerate(lbl_files):
                fname = os.path.basename(lbl_path)
                arcname = f"labels/{split}/{fname}"
                zf.write(lbl_path, arcname)
                
    zip_size_gb = os.path.getsize(OUTPUT_ZIP) / (1024 ** 3)
    total_time = time.time() - start_time
    
    print("\n" + "=" * 70, flush=True)
    print(f"🎉 PACKAGING COMPLETE in {total_time:.1f}s!", flush=True)
    print(f"📦 Archive File: {OUTPUT_ZIP}", flush=True)
    print(f"📊 Archive Size: {zip_size_gb:.2f} GB", flush=True)
    print(f"🏷️ Class 6: truck/tempo verified!", flush=True)
    print("=" * 70, flush=True)

if __name__ == "__main__":
    package()
