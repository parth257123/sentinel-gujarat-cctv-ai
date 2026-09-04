import os
import sys
import glob
import shutil
import zipfile
from collections import Counter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_DATASET = os.path.join(BASE_DIR, "datasets", "manual_annotated_gujarat")
CLASSES = ["car", "auto", "bus", "truck", "two_wheeler", "pedestrian"]

def merge_collaborator_data(input_path):
    print("=" * 60)
    print("🤝 SENTINEL GUJARAT CCTV — DATASET COLLABORATION MERGER")
    print("=" * 60)

    temp_dir = os.path.join(BASE_DIR, "temp_merge_collaborator")
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)

    # 1. Unpack if ZIP, or use directly if directory
    if os.path.isfile(input_path) and input_path.endswith(".zip"):
        print(f"📦 Extracting ZIP: {input_path}")
        with zipfile.ZipFile(input_path, "r") as z:
            z.extractall(temp_dir)
        search_root = temp_dir
    elif os.path.isdir(input_path):
        search_root = input_path
    else:
        print(f"❌ Error: {input_path} is not a valid zip file or directory.")
        return

    # 2. Find all images and labels in the collaborator's submission
    incoming_images = glob.glob(os.path.join(search_root, "**", "*.jpg"), recursive=True)
    incoming_labels = glob.glob(os.path.join(search_root, "**", "*.txt"), recursive=True)

    img_map = {os.path.splitext(os.path.basename(p))[0]: p for p in incoming_images}
    lbl_map = {os.path.splitext(os.path.basename(p))[0]: p for p in incoming_labels if not os.path.basename(p).startswith("classes")}

    print(f"🔍 Found {len(img_map)} images and {len(lbl_map)} label files in collaborator submission.")

    # Target directories
    master_train_imgs = os.path.join(MASTER_DATASET, "images", "train")
    master_train_lbls = os.path.join(MASTER_DATASET, "labels", "train")
    os.makedirs(master_train_imgs, exist_ok=True)
    os.makedirs(master_train_lbls, exist_ok=True)

    existing_bases = set()
    for s in ["train", "val"]:
        for f in glob.glob(os.path.join(MASTER_DATASET, "labels", s, "*.txt")):
            existing_bases.add(os.path.splitext(os.path.basename(f))[0])

    merged_count = 0
    duplicate_count = 0
    new_boxes_count = 0
    class_counter = Counter()

    for base, lbl_path in lbl_map.items():
        if base in existing_bases:
            duplicate_count += 1
            continue

        if base not in img_map:
            continue

        img_path = img_map[base]

        # Count boxes and classes
        with open(lbl_path, "r") as f:
            for line in f:
                parts = line.strip().split()
                if parts:
                    try:
                        cid = int(parts[0])
                        if cid < len(CLASSES):
                            class_counter[CLASSES[cid]] += 1
                            new_boxes_count += 1
                    except ValueError:
                        pass

        # Copy image and label to master dataset
        dest_img = os.path.join(master_train_imgs, f"{base}.jpg")
        dest_lbl = os.path.join(master_train_lbls, f"{base}.txt")

        shutil.copy2(img_path, dest_img)
        shutil.copy2(lbl_path, dest_lbl)
        merged_count += 1

    # Cleanup temp
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)

    print("\n" + "=" * 60)
    print("🎉 MERGE COMPLETE!")
    print("=" * 60)
    print(f"✅ Newly Merged Frames: {merged_count}")
    print(f"✅ Newly Added Bounding Boxes: {new_boxes_count}")
    if duplicate_count > 0:
        print(f"ℹ️ Skipped Existing/Duplicate Frames: {duplicate_count}")

    print("\n📊 Newly Added Class Breakdown:")
    for c in CLASSES:
        print(f"   - {c}: {class_counter[c]}")

    total_now = len(glob.glob(os.path.join(MASTER_DATASET, "images", "**", "*.jpg"), recursive=True))
    print(f"\n🚀 Master Combined Dataset Total: {total_now} Frames Ready For Training!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python merge_collaborator_dataset.py <path_to_friend_zip_or_folder>")
    else:
        merge_collaborator_data(sys.argv[1])
