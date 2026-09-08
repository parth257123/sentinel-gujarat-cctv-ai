"""
Gujarat Police CCTV AI - Label Taxonomy Migration Script
=========================================================
Safely converts manual annotations from legacy 7-class taxonomy to standardized 10-class taxonomy.

Mapping:
  Old 0 (car)                -> New 1 (car)
  Old 1 (auto)               -> New 8 (auto_rickshaw)
  Old 2 (passenger_vehicle)  -> New 7 (bus)
  Old 3 (goods_vehicle)      -> New 6 (truck)
  Old 4 (two_wheeler)        -> New 2 (two_wheeler)
  Old 5 (pedestrian)         -> New 0 (pedestrian)
  Old 6 (others)             -> New 9 (others)
  Old 7 (bus/already 10-cls) -> New 7 (bus)
  Old 8 (auto/already 10-cls)-> New 8 (auto_rickshaw)
"""

import os
import glob
import shutil
import yaml

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "datasets", "manual_annotated_gujarat")
LABELS_DIR = os.path.join(DATASET_DIR, "labels")
BACKUP_DIR = os.path.join(DATASET_DIR, "labels_backup_7class")

MAPPING_7_TO_10 = {
    0: 1,  # car -> car
    1: 8,  # auto -> auto_rickshaw
    2: 7,  # passenger_vehicle -> bus
    3: 6,  # goods_vehicle -> truck
    4: 2,  # two_wheeler -> two_wheeler
    5: 0,  # pedestrian -> pedestrian
    6: 9,  # others -> others
    7: 7,  # bus -> bus
    8: 8,  # auto -> auto_rickshaw
    9: 9,  # others -> others
}

NEW_10_CLASSES = [
    "pedestrian",         # 0
    "car",                # 1
    "two_wheeler",        # 2
    "heavy_machinery",    # 3
    "emergency_vehicle",  # 4
    "van",                # 5
    "truck",              # 6
    "bus",                # 7
    "auto_rickshaw",      # 8
    "others"              # 9
]

def migrate_labels():
    if not os.path.exists(LABELS_DIR):
        print(f"❌ Error: Labels directory not found at {LABELS_DIR}")
        return

    # 1. Create full backup if not already present
    if not os.path.exists(BACKUP_DIR):
        print(f"📦 Creating safety backup of original labels to: {BACKUP_DIR}")
        shutil.copytree(LABELS_DIR, BACKUP_DIR)
        print("✅ Backup complete.")
    else:
        print(f"ℹ️ Safety backup already exists at: {BACKUP_DIR}")

    label_files = glob.glob(os.path.join(LABELS_DIR, "**", "*.txt"), recursive=True)
    print(f"🔍 Found {len(label_files)} label files to process...")

    modified_files = 0
    total_boxes = 0
    class_counter = {i: 0 for i in range(10)}

    for fpath in label_files:
        with open(fpath, "r") as f:
            lines = f.readlines()

        new_lines = []
        file_changed = False

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            parts = line_str.split()
            old_cls = int(parts[0])

            if old_cls in MAPPING_7_TO_10:
                new_cls = MAPPING_7_TO_10[old_cls]
                if new_cls != old_cls:
                    file_changed = True
                new_lines.append(f"{new_cls} " + " ".join(parts[1:]) + "\n")
                class_counter[new_cls] += 1
                total_boxes += 1
            else:
                new_lines.append(line)
                total_boxes += 1

        if file_changed or True:
            with open(fpath, "w") as f:
                f.writelines(new_lines)
            modified_files += 1

    # 2. Update data.yaml to 10-class taxonomy
    yaml_path = os.path.join(DATASET_DIR, "data.yaml")
    yaml_content = {
        "path": DATASET_DIR,
        "train": "images/train",
        "val": "images/val",
        "nc": len(NEW_10_CLASSES),
        "names": {i: name for i, name in enumerate(NEW_10_CLASSES)}
    }
    with open(yaml_path, "w") as f:
        yaml.dump(yaml_content, f, sort_keys=False)

    print("\n" + "=" * 60)
    print("🎉 MIGRATION TO 10-CLASS TAXONOMY COMPLETED SUCCESSFULLY!")
    print(f"📁 Files Updated: {modified_files} files")
    print(f"📦 Total Bounding Boxes Remapped: {total_boxes} boxes")
    print("\nUpdated Class Distribution:")
    for cid, cname in enumerate(NEW_10_CLASSES):
        print(f"  [{cid}] {cname:<18}: {class_counter[cid]:>5} boxes")
    print("=" * 60)


if __name__ == "__main__":
    migrate_labels()
