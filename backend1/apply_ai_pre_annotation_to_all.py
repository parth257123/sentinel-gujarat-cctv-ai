"""
Sentinel Gujarat Police CCTV AI - Master 1-Click AI Pre-Annotation Engine
========================================================================
Applies the exact same model and taxonomy mapping as the Annotation Studio's
'⚡ AI Pre-Annotate' button across all 19,407 harvested CCTV frames.

Model: backend1/models/sentinel_indian_traffic_best.pt
Taxonomy: Standardized 10-Class Indian Traffic & Pedestrian Schema
Device: Apple Silicon GPU (MPS) with optimized batching (batch=64)
"""

import os
import sys
import glob
import time
import json
import random
import logging
import torch
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRAMES_DIR = os.path.join(BASE_DIR, "harvested_cctv_frames")
DATASET_DIR = os.path.join(BASE_DIR, "datasets", "manual_annotated_gujarat")
MODEL_PATH = os.path.join(BASE_DIR, "models", "sentinel_indian_traffic_best.pt")
TELEMETRY_FILE = os.path.join(DATASET_DIR, "auto_annotation_telemetry.json")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AIPreAnnotator] %(message)s"
)
logger = logging.getLogger("AIPreAnnotator")

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

def map_class_to_10class(model_names, raw_cls):
    """Exact mapping logic from AnnotationEngine.generate_ai_draft_boxes"""
    name = str(model_names.get(raw_cls, "")).lower()
    lower_classes = [c.lower() for c in CLASSES]
    
    if name in lower_classes:
        return lower_classes.index(name)
    elif "person" in name or "pedestrian" in name:
        return 0  # pedestrian
    elif "motorcycle" in name or "scooter" in name or "bike" in name or "two" in name:
        return 2  # two_wheeler
    elif "heavy" in name or "machinery" in name or "tractor" in name or "jcb" in name or "crane" in name:
        return 3  # heavy_machinery
    elif "emergency" in name or "ambulance" in name or "police" in name:
        return 4  # emergency_vehicle
    elif "van" in name or "omni" in name or "eeco" in name:
        return 5  # van
    elif "truck" in name or "lorry" in name or "goods" in name:
        return 6  # truck
    elif "bus" in name or "transit" in name or "passenger" in name:
        return 7  # bus
    elif "rickshaw" in name or "auto" in name:
        return 8  # auto_rickshaw
    elif "cart" in name or "other" in name:
        return 9  # others
    else:
        return 1  # car

def run_pre_annotation_on_everything(batch_size=64, conf_thresh=0.20):
    logger.info("=" * 75)
    logger.info("⚡ SENTINEL CCTV AI - MASTER 1-CLICK AI PRE-ANNOTATION ON EVERYTHING")
    logger.info(f"📦 Model: {os.path.basename(MODEL_PATH)}")
    logger.info(f"🎯 Target: All harvested frames at conf={conf_thresh}")
    logger.info("=" * 75)

    # 1. Ensure target directories
    for split in ["train", "val"]:
        os.makedirs(os.path.join(DATASET_DIR, "images", split), exist_ok=True)
        os.makedirs(os.path.join(DATASET_DIR, "labels", split), exist_ok=True)

    # 2. Collect all frames
    all_frames = sorted(glob.glob(os.path.join(FRAMES_DIR, "**", "*.jpg"), recursive=True))
    total_frames = len(all_frames)
    logger.info(f"📁 Total frames found to annotate: {total_frames:,}")

    if total_frames == 0:
        logger.error("No frames found in harvested_cctv_frames!")
        return

    # 3. Load model
    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"⚡ Loading model on device: {device}")
    model = YOLO(MODEL_PATH)
    model_names = model.names
    logger.info(f"📋 Model raw classes: {model_names}")

    # 4. Process in batches
    class_counts = {c: 0 for c in CLASSES}
    total_boxes = 0
    t0 = time.time()
    random.seed(42)

    telemetry = {
        "status": "running",
        "total_target": total_frames,
        "processed": 0,
        "total_boxes": 0,
        "class_distribution": class_counts,
        "elapsed_seconds": 0,
        "fps": 0.0,
        "mode": "ai_pre_annotation_button_all"
    }

    for i in range(0, total_frames, batch_size):
        batch = all_frames[i : i + batch_size]

        try:
            results = model.predict(batch, conf=conf_thresh, device=device, batch=len(batch), verbose=False, imgsz=640)
        except Exception as e:
            logger.warning(f"Batch prediction warning: {e}, falling back to CPU")
            results = model.predict(batch, conf=conf_thresh, device="cpu", batch=len(batch), verbose=False, imgsz=640)

        for img_path, res in zip(batch, results):
            fname = os.path.basename(img_path)
            base_id = os.path.splitext(fname)[0]

            # Consistent 90/10 train/val split based on filename hash
            split = "val" if (hash(base_id) % 10 == 0) else "train"
            other_split = "train" if split == "val" else "val"

            # Clean up other split to avoid duplicates
            old_other_lbl = os.path.join(DATASET_DIR, "labels", other_split, f"{base_id}.txt")
            if os.path.exists(old_other_lbl):
                try: os.remove(old_other_lbl)
                except Exception: pass

            old_other_img = os.path.join(DATASET_DIR, "images", other_split, fname)
            if os.path.exists(old_other_img):
                try: os.remove(old_other_img)
                except Exception: pass

            dst_img = os.path.join(DATASET_DIR, "images", split, fname)
            dst_lbl = os.path.join(DATASET_DIR, "labels", split, f"{base_id}.txt")

            # Link or copy image
            if not os.path.exists(dst_img):
                try:
                    os.link(img_path, dst_img)
                except Exception:
                    import shutil
                    shutil.copy2(img_path, dst_img)

            # Generate and format bounding boxes
            lines = []
            if res.boxes is not None and len(res.boxes) > 0:
                for box in res.boxes:
                    raw_cls = int(box.cls[0])
                    mapped_cls = map_class_to_10class(model_names, raw_cls)
                    class_counts[CLASSES[mapped_cls]] += 1
                    total_boxes += 1

                    # Normalized xywh
                    cx, cy, w, h = map(float, box.xywhn[0])
                    lines.append(f"{mapped_cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n")

            with open(dst_lbl, "w") as f:
                f.writelines(lines)

        processed = min(total_frames, i + len(batch))
        if processed % 1000 == 0 or processed == total_frames:
            elapsed = round(time.time() - t0, 1)
            fps = round(processed / max(0.1, elapsed), 1)
            pct = round((processed / total_frames) * 100.0, 1)
            logger.info(f"🚀 Pre-Annotated {processed:,} / {total_frames:,} frames ({pct}%) | Boxes: {total_boxes:,} | Speed: {fps} FPS")

            telemetry["processed"] = processed
            telemetry["total_boxes"] = total_boxes
            telemetry["class_distribution"] = class_counts
            telemetry["elapsed_seconds"] = elapsed
            telemetry["fps"] = fps
            with open(TELEMETRY_FILE, "w") as tf:
                json.dump(telemetry, tf, indent=2)

    telemetry["status"] = "completed"
    with open(TELEMETRY_FILE, "w") as tf:
        json.dump(telemetry, tf, indent=2)

    logger.info("=" * 75)
    logger.info(f"✅ COMPLETED! Total Frames: {total_frames:,} | Total High-Accuracy Boxes: {total_boxes:,}")
    logger.info(f"📊 Class Distribution: {class_counts}")
    logger.info("=" * 75)

if __name__ == "__main__":
    run_pre_annotation_on_everything()
