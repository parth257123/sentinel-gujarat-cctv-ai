"""
Sentinel Gujarat Police CCTV AI - Master Auto-Annotation Engine
===============================================================
Runs AI Auto-Annotation across ALL harvested CCTV frames using our
fine-tuned 10-class Indian traffic model.

Preserves all 830 existing manual annotations without overwriting.
Generates full YOLO format datasets with 90/10 train/val split.
Hardlinks images on APFS (instantaneous, 0 extra disk space).
"""

import os
import sys
import glob
import time
import json
import logging
import random
import yaml
import torch
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRAMES_DIR = os.path.join(BASE_DIR, "harvested_cctv_frames")
DATASET_DIR = os.path.join(BASE_DIR, "datasets", "manual_annotated_gujarat")
TELEMETRY_FILE = os.path.join(DATASET_DIR, "auto_annotation_telemetry.json")

MODEL_PATH = os.path.join(BASE_DIR, "models", "sentinel_10class_traffic_best.pt")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AutoAnnotator] %(message)s"
)
logger = logging.getLogger("AutoAnnotator")

CLASSES = [
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

def run_auto_annotation(batch_size=32, conf_thresh=0.25):
    logger.info("=" * 70)
    logger.info("🤖 SENTINEL GUJARAT POLICE MASTER AUTO-ANNOTATION ENGINE")
    logger.info(f"📦 Model: {os.path.basename(MODEL_PATH)} (10-Class Indian Traffic Taxonomy)")
    logger.info("🛡️ Safety: Preserving all existing manual annotations (will not overwrite)")
    logger.info("=" * 70)

    # 1. Ensure target directory structure exists
    for split in ["train", "val"]:
        os.makedirs(os.path.join(DATASET_DIR, "images", split), exist_ok=True)
        os.makedirs(os.path.join(DATASET_DIR, "labels", split), exist_ok=True)

    # 2. Collect existing annotations
    existing_annotated = set()
    for split in ["train", "val"]:
        lbl_dir = os.path.join(DATASET_DIR, "labels", split)
        if os.path.exists(lbl_dir):
            for fn in os.listdir(lbl_dir):
                if fn.endswith(".txt"):
                    existing_annotated.add(os.path.splitext(fn)[0])

    logger.info(f"🔒 Found {len(existing_annotated)} existing manually verified annotations (PROTECTED).")

    # 3. Collect candidate harvested frames
    all_frame_paths = sorted(glob.glob(os.path.join(FRAMES_DIR, "**", "*.jpg"), recursive=True))
    logger.info(f"📁 Found {len(all_frame_paths)} total harvested CCTV frames on disk.")

    unannotated_frames = [
        fp for fp in all_frame_paths 
        if os.path.splitext(os.path.basename(fp))[0] not in existing_annotated
    ]
    logger.info(f"🎯 Frames to Auto-Annotate: {len(unannotated_frames)} frames.")

    if not unannotated_frames:
        logger.info("✅ All frames are already annotated!")
        return

    # 4. Load Teacher Model
    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"⚡ Loading 10-class model on compute device: {device}")
    model = YOLO(MODEL_PATH)

    # 5. Process in batches
    total_to_process = len(unannotated_frames)
    processed_count = 0
    total_boxes_created = 0
    class_counts = {c: 0 for c in CLASSES}
    t0 = time.time()

    telemetry = {
        "status": "running",
        "total_target": total_to_process,
        "processed": 0,
        "protected_manual": len(existing_annotated),
        "total_boxes": 0,
        "class_distribution": class_counts,
        "elapsed_seconds": 0,
        "fps": 0.0
    }

    # Deterministic split seed for reproducibility
    random.seed(42)

    for i in range(0, total_to_process, batch_size):
        batch_paths = unannotated_frames[i : i + batch_size]
        
        try:
            results = model.predict(batch_paths, conf=conf_thresh, device=device, batch=batch_size, verbose=False)
        except Exception as e:
            logger.warning(f"Batch inference warning: {e}, retrying on cpu...")
            results = model.predict(batch_paths, conf=conf_thresh, device="cpu", batch=batch_size, verbose=False)

        for img_path, res in zip(batch_paths, results):
            fname = os.path.basename(img_path)
            base_id = os.path.splitext(fname)[0]

            # 90% train, 10% val split
            split = "val" if random.random() < 0.10 else "train"

            dst_img = os.path.join(DATASET_DIR, "images", split, fname)
            dst_lbl = os.path.join(DATASET_DIR, "labels", split, f"{base_id}.txt")

            # Hardlink image (instantaneous on APFS, 0 extra disk space)
            if not os.path.exists(dst_img):
                try:
                    os.link(img_path, dst_img)
                except Exception:
                    # Fallback to file copy if across volumes
                    import shutil
                    shutil.copy2(img_path, dst_img)

            # Write YOLO bounding box lines
            lines = []
            if res.boxes is not None and len(res.boxes) > 0:
                for box in res.boxes:
                    cls_id = int(box.cls[0])
                    if cls_id < len(CLASSES):
                        class_counts[CLASSES[cls_id]] += 1
                    else:
                        cls_id = 1  # default car fallback

                    # Normalized coordinates [0, 1]
                    cx, cy, w, h = map(float, box.xywhn[0])
                    lines.append(f"{cls_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n")
                    total_boxes_created += 1

            # Save .txt label file (even if empty to indicate verified background negative frame)
            with open(dst_lbl, "w") as f:
                f.writelines(lines)

            processed_count += 1

        # Periodic telemetry update
        if processed_count % 500 == 0 or processed_count == total_to_process:
            elapsed = time.time() - t0
            fps = round(processed_count / max(0.1, elapsed), 1)
            pct = round((processed_count / total_to_process) * 100.0, 1)
            logger.info(f"✨ [Progress] Auto-Annotated {processed_count:,} / {total_to_process:,} frames ({pct}%) | Boxes: {total_boxes_created:,} | Speed: {fps} FPS")

            telemetry["processed"] = processed_count
            telemetry["total_boxes"] = total_boxes_created
            telemetry["class_distribution"] = class_counts
            telemetry["elapsed_seconds"] = round(elapsed, 1)
            telemetry["fps"] = fps
            with open(TELEMETRY_FILE, "w") as f:
                json.dump(telemetry, f, indent=2)

    # 6. Update data.yaml with 10-class taxonomy and paths
    yaml_path = os.path.join(DATASET_DIR, "data.yaml")
    data_cfg = {
        "path": DATASET_DIR,
        "train": "images/train",
        "val": "images/val",
        "nc": len(CLASSES),
        "names": {i: name for i, name in enumerate(CLASSES)}
    }
    with open(yaml_path, "w") as f:
        yaml.dump(data_cfg, f, sort_keys=False)

    telemetry["status"] = "completed"
    with open(TELEMETRY_FILE, "w") as f:
        json.dump(telemetry, f, indent=2)

    logger.info("=" * 70)
    logger.info("🎉 MASTER AUTO-ANNOTATION COMPLETE FOR ALL HARVESTED FRAMES!")
    logger.info(f"📁 Total Dataset Frames: {len(existing_annotated) + processed_count:,} (Manual: {len(existing_annotated)}, Auto: {processed_count:,})")
    logger.info(f"📦 Total Bounding Boxes: {total_boxes_created:,}")
    logger.info("=" * 70)


if __name__ == "__main__":
    run_auto_annotation(batch_size=32, conf_thresh=0.25)
