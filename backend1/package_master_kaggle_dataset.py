"""
Master Sentinel Traffic Dataset Synthesizer & Kaggle Packager
============================================================
Combines:
  1. Live Gujarat Police CCTV Dataset (all 30 cameras)
  2. Gujarat CCTV Road Benchmark Dataset (1,800+ frames)
  3. Standardized 8-Class Indian Vehicle Taxonomy
  4. Generates SENTINEL_MEGA_GUJARAT_TRAFFIC_DATASET.zip
"""

import os
import glob
import shutil
import yaml

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

TARGET_DATASET_DIR = os.path.join(BASE_DIR, "datasets", "master_sentinel_traffic_dataset")
LIVE_DATASET_DIR = os.path.join(BASE_DIR, "datasets", "gujarat_cctv_live_dataset")
EXISTING_DATASET_DIR = os.path.join(BASE_DIR, "datasets", "indian_traffic")

OUTPUT_ZIP = os.path.join(PROJECT_ROOT, "SENTINEL_MEGA_GUJARAT_TRAFFIC_DATASET.zip")

CLASSES = [
    "auto_rickshaw",   # 0
    "motorcycle",      # 1
    "scooter",         # 2
    "car",             # 3
    "bus",             # 4
    "truck",           # 5
    "ambulance",       # 6
    "van"              # 7
]

def main():
    print("=" * 70)
    print("🚀 SYNTHESIZING MASTER GUJARAT TRAFFIC DATASET FOR KAGGLE")
    print("=" * 70)

    # Initialize directories
    for split in ["train", "val"]:
        os.makedirs(os.path.join(TARGET_DATASET_DIR, "images", split), exist_ok=True)
        os.makedirs(os.path.join(TARGET_DATASET_DIR, "labels", split), exist_ok=True)

    copied_existing = 0
    copied_live = 0

    # 1. Ingest existing Gujarat CCTV frames (1,800+ frames)
    if os.path.exists(EXISTING_DATASET_DIR):
        print(f"📦 Merging existing Gujarat CCTV frames from {os.path.basename(EXISTING_DATASET_DIR)}...")
        for split in ["train", "val"]:
            img_files = glob.glob(os.path.join(EXISTING_DATASET_DIR, "images", split, "*.*"))
            for img_path in img_files:
                fname = os.path.basename(img_path)
                base = os.path.splitext(fname)[0]
                lbl_path = os.path.join(EXISTING_DATASET_DIR, "labels", split, f"{base}.txt")
                
                dest_img = os.path.join(TARGET_DATASET_DIR, "images", split, f"bench_{fname}")
                dest_lbl = os.path.join(TARGET_DATASET_DIR, "labels", split, f"bench_{base}.txt")
                
                shutil.copy(img_path, dest_img)
                if os.path.exists(lbl_path):
                    shutil.copy(lbl_path, dest_lbl)
                else:
                    open(dest_lbl, "w").close()
                copied_existing += 1

    # 2. Ingest live Gujarat Police CCTV frames
    if os.path.exists(LIVE_DATASET_DIR):
        print(f"📹 Merging live Gujarat Police CCTV frames from {os.path.basename(LIVE_DATASET_DIR)}...")
        for split in ["train", "val"]:
            img_files = glob.glob(os.path.join(LIVE_DATASET_DIR, "images", split, "*.jpg"))
            for img_path in img_files:
                fname = os.path.basename(img_path)
                base = os.path.splitext(fname)[0]
                lbl_path = os.path.join(LIVE_DATASET_DIR, "labels", split, f"{base}.txt")
                
                dest_img = os.path.join(TARGET_DATASET_DIR, "images", split, f"live_{fname}")
                dest_lbl = os.path.join(TARGET_DATASET_DIR, "labels", split, f"live_{base}.txt")
                
                shutil.copy(img_path, dest_img)
                
                # Remap classes from live dataset (0:car, 1:auto, 2:tw, 3:bus, 4:truck)
                # to master taxonomy (0:auto, 1:moto, 2:scoot, 3:car, 4:bus, 5:truck, ...)
                if os.path.exists(lbl_path):
                    with open(lbl_path, "r") as f_in, open(dest_lbl, "w") as f_out:
                        for line in f_in:
                            parts = line.strip().split()
                            if len(parts) == 5:
                                cid = int(parts[0])
                                # Mapping:
                                if cid == 0: master_id = 3  # car
                                elif cid == 1: master_id = 0  # auto_rickshaw
                                elif cid == 2: master_id = 1  # two_wheeler -> motorcycle
                                elif cid == 3: master_id = 4  # bus
                                elif cid == 4: master_id = 5  # truck
                                else: master_id = 3
                                f_out.write(f"{master_id} {' '.join(parts[1:])}\n")
                else:
                    open(dest_lbl, "w").close()
                copied_live += 1

    print(f"\n✅ Merged {copied_existing} benchmark frames + {copied_live} live CCTV frames!")

    # Write unified data.yaml
    data_yaml_content = f"""path: ./master_sentinel_traffic_dataset
train: images/train
val: images/val

nc: {len(CLASSES)}
names:
"""
    for i, cname in enumerate(CLASSES):
        data_yaml_content += f"  {i}: {cname}\n"

    yaml_path = os.path.join(TARGET_DATASET_DIR, "data.yaml")
    with open(yaml_path, "w") as f:
        f.write(data_yaml_content)

    train_count = len(glob.glob(os.path.join(TARGET_DATASET_DIR, "images", "train", "*.*")))
    val_count = len(glob.glob(os.path.join(TARGET_DATASET_DIR, "images", "val", "*.*")))
    print(f"📊 Total Master Dataset: {train_count} Training Frames | {val_count} Validation Frames")

    # Zip into root
    print(f"\n📦 Compressing into master archive: {os.path.basename(OUTPUT_ZIP)}...")
    if os.path.exists(OUTPUT_ZIP):
        os.remove(OUTPUT_ZIP)
        
    shutil.make_archive(OUTPUT_ZIP.replace(".zip", ""), "zip", TARGET_DATASET_DIR)
    zip_size_mb = os.path.getsize(OUTPUT_ZIP) / (1024 * 1024)
    print(f"🎉 MASTER DATASET CREATED SUCCESSFULLY!")
    print(f"📁 Archive: {OUTPUT_ZIP} ({zip_size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
