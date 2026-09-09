"""
Manual Annotation & Active Learning Engine for Gujarat Police CCTV
==================================================================
Manages manual bounding box labeling, AI-assisted pre-annotation,
and structured YOLO dataset generation from harvested frames.
"""

import os
import glob
import json
import shutil
import random
import cv2
import yaml
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HEAVYWEIGHT_DIR = os.path.join(BASE_DIR, "datasets", "heavyweight_5500_cctv_dataset")
HARVESTED_DIR = os.path.join(BASE_DIR, "harvested_cctv_frames")

# Point directly to harvested frames directory containing 15,000+ clean frames
FRAMES_DIR = HARVESTED_DIR
DATASET_DIR = os.path.join(BASE_DIR, "datasets", "manual_annotated_gujarat")

# Standardized 10-Class Indian Traffic & Pedestrian Taxonomy
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

CLASS_COLORS = {
    0: "#06b6d4",  # Cyan for Pedestrian
    1: "#3b82f6",  # Blue for Car
    2: "#10b981",  # Green for Two Wheeler
    3: "#d97706",  # Amber for Heavy Machinery
    4: "#ef4444",  # Red for Emergency Vehicle
    5: "#8b5cf6",  # Purple for Van
    6: "#ec4899",  # Pink for Truck
    7: "#6366f1",  # Indigo for Bus
    8: "#f59e0b",  # Orange for Auto-Rickshaw
    9: "#64748b",  # Slate for Others
}

class AnnotationEngine:
    def __init__(self):
        self._ensure_dataset_dirs()
        # Load teacher model for AI auto-assist if available
        model_path = os.path.join(BASE_DIR, "models", "sentinel_indian_traffic_best.pt")
        if not os.path.exists(model_path):
            model_path = os.path.join(BASE_DIR, "models", "indian_traffic_live_10class_best.pt")
        if not os.path.exists(model_path):
            model_path = "yolov8n.pt"
        try:
            self.detector = YOLO(model_path)
        except Exception:
            self.detector = None

    def reload_model(self):
        model_path = os.path.join(BASE_DIR, "models", "sentinel_indian_traffic_best.pt")
        if not os.path.exists(model_path):
            model_path = os.path.join(BASE_DIR, "models", "indian_traffic_live_10class_best.pt")
        if not os.path.exists(model_path):
            model_path = "yolov8n.pt"
        try:
            self.detector = YOLO(model_path)
            print(f"🔄 AnnotationEngine successfully reloaded model: {model_path} ({len(self.detector.names)} classes)")
            return True
        except Exception as e:
            print("Failed to reload model:", e)
            return False

    def _ensure_dataset_dirs(self):
        for split in ["train", "val"]:
            os.makedirs(os.path.join(DATASET_DIR, "images", split), exist_ok=True)
            os.makedirs(os.path.join(DATASET_DIR, "labels", split), exist_ok=True)
        
        # Write data.yaml if missing
        yaml_path = os.path.join(DATASET_DIR, "data.yaml")
        if not os.path.exists(yaml_path):
            data_dict = {
                "path": DATASET_DIR,
                "train": "images/train",
                "val": "images/val",
                "nc": len(CLASSES),
                "names": {i: name for i, name in enumerate(CLASSES)}
            }
            with open(yaml_path, "w") as f:
                yaml.dump(data_dict, f, default_flow_style=False)

    def list_available_frames(self, limit=25000):
        """Returns list of curated heavyweight CCTV frames with annotation status."""
        all_frames = glob.glob(os.path.join(FRAMES_DIR, "**", "*.jpg"), recursive=True)
        # Sort by filename
        all_frames.sort(key=lambda x: os.path.basename(x))

        annotated_basenames = set()
        for split in ["train", "val"]:
            lbl_files = glob.glob(os.path.join(DATASET_DIR, "labels", split, "*.txt"))
            for lf in lbl_files:
                annotated_basenames.add(os.path.splitext(os.path.basename(lf))[0])

        results = []
        for fp in all_frames:
            if len(results) >= limit:
                break
            fname = os.path.basename(fp)
            base = os.path.splitext(fname)[0]
            cam_id = fname.split("_")[0] if fname.startswith("cam") else os.path.basename(os.path.dirname(fp))

            # Categorize lighting condition accurately for UI filtering
            if "_clahe" in fname or "_night" in fname or "_sodium" in fname:
                lighting_cat = "night_sodium_lighting"
            else:
                parts = fname.split("_")
                lighting_cat = "daylight_morning_rush"
                for p in parts:
                    if len(p) == 6 and p.isdigit():
                        h = int(p[:2])
                        if 6 <= h < 17:
                            lighting_cat = "daylight_morning_rush"
                        elif 17 <= h < 20:
                            lighting_cat = "twilight_dawn_dusk"
                        else:
                            lighting_cat = "night_sodium_lighting"
                        break

            is_annotated = base in annotated_basenames
            results.append({
                "filename": fname,
                "base_id": base,
                "cam_id": cam_id,
                "lighting": lighting_cat,
                "full_path": fp,
                "is_annotated": is_annotated,
                "size_kb": round(os.path.getsize(fp) / 1024, 1),
                "is_clahe": "_clahe" in fname
            })
        return results

    def get_frame_labels(self, base_id):
        """Returns existing bounding boxes for a frame if previously annotated."""
        for split in ["train", "val"]:
            lbl_path = os.path.join(DATASET_DIR, "labels", split, f"{base_id}.txt")
            if os.path.exists(lbl_path):
                boxes = []
                with open(lbl_path, "r") as f:
                    for line in f:
                        parts = line.strip().split()
                        if len(parts) >= 5:
                            cls_id = int(parts[0])
                            cx, cy, bw, bh = map(float, parts[1:5])
                            boxes.append({
                                "cls_id": cls_id,
                                "class_name": CLASSES[cls_id] if cls_id < len(CLASSES) else f"class_{cls_id}",
                                "color": CLASS_COLORS.get(cls_id, "#10b981"),
                                "cx": cx, "cy": cy, "w": bw, "h": bh
                            })
                return {"annotated": True, "split": split, "boxes": boxes}
        return {"annotated": False, "boxes": []}

    def generate_ai_draft_boxes(self, image_path, conf_thresh=0.22):
        """
        Runs YOLO model on the frame and returns suggested candidate boxes
        to accelerate manual labeling by 10x.
        """
        if not os.path.exists(image_path) or self.detector is None:
            return []

        frame = cv2.imread(image_path)
        if frame is None:
            return []
        h, w = frame.shape[:2]

        results = self.detector.predict(frame, conf=conf_thresh, verbose=False)
        draft_boxes = []

        if results and len(results) > 0 and results[0].boxes is not None:
            for box in results[0].boxes:
                raw_cls = int(box.cls[0])
                name = str(self.detector.names.get(raw_cls, "")).lower()
                conf_val = float(box.conf[0])

                # Map model classes into our 10-class taxonomy:
                cls_id = 1  # default car
                lower_classes = [c.lower() for c in CLASSES]
                if name in lower_classes:
                    cls_id = lower_classes.index(name)
                elif "person" in name or "pedestrian" in name:
                    cls_id = 0  # pedestrian
                elif "motorcycle" in name or "scooter" in name or "bike" in name or "two" in name:
                    cls_id = 2  # two_wheeler
                elif "heavy" in name or "machinery" in name or "tractor" in name or "jcb" in name or "crane" in name:
                    cls_id = 3  # heavy_machinery
                elif "emergency" in name or "ambulance" in name or "police" in name:
                    cls_id = 4  # emergency_vehicle
                elif "van" in name or "omni" in name or "eeco" in name:
                    cls_id = 5  # van
                elif "truck" in name or "lorry" in name or "goods" in name:
                    cls_id = 6  # truck
                elif "bus" in name or "transit" in name or "passenger" in name:
                    cls_id = 7  # bus
                elif "rickshaw" in name or "auto" in name:
                    cls_id = 8  # auto_rickshaw
                elif "cart" in name or "other" in name:
                    cls_id = 9  # others
                else:
                    cls_id = 1  # car

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                bw_px = x2 - x1
                bh_px = y2 - y1

                # Normalize to [0, 1] for YOLO format
                cx = (x1 + bw_px / 2.0) / float(w)
                cy = (y1 + bh_px / 2.0) / float(h)
                norm_w = float(bw_px) / float(w)
                norm_h = float(bh_px) / float(h)

                draft_boxes.append({
                    "cls_id": cls_id,
                    "class_name": CLASSES[cls_id],
                    "color": CLASS_COLORS[cls_id],
                    "cx": round(cx, 6),
                    "cy": round(cy, 6),
                    "w": round(norm_w, 6),
                    "h": round(norm_h, 6),
                    "confidence": round(conf_val, 2)
                })

        return draft_boxes

    def save_manual_annotation(self, src_path, boxes, split="train"):
        """
        Saves user-annotated boxes into standard YOLO .txt format and copies frame into dataset.
        """
        if not os.path.exists(src_path):
            raise FileNotFoundError(f"Frame not found: {src_path}")

        fname = os.path.basename(src_path)
        base_id = os.path.splitext(fname)[0]

        # Destination paths
        os.makedirs(os.path.join(DATASET_DIR, "images", split), exist_ok=True)
        os.makedirs(os.path.join(DATASET_DIR, "labels", split), exist_ok=True)
        dst_img = os.path.join(DATASET_DIR, "images", split, fname)
        dst_lbl = os.path.join(DATASET_DIR, "labels", split, f"{base_id}.txt")

        # Copy image safely (handle existing files and APFS hardlinks without crashing)
        if not os.path.exists(dst_img) or not os.path.samefile(src_path, dst_img):
            try:
                shutil.copy2(src_path, dst_img)
            except (shutil.SameFileError, Exception):
                pass

        # If switching split, clean up old label in other split to prevent duplicates
        other_split = "val" if split == "train" else "train"
        other_lbl = os.path.join(DATASET_DIR, "labels", other_split, f"{base_id}.txt")
        if os.path.exists(other_lbl):
            try:
                os.remove(other_lbl)
            except Exception:
                pass

        # Write label lines: <class_id> <cx> <cy> <w> <h>
        lines = []
        for b in boxes:
            cls_id = int(b["cls_id"])
            cx = float(b["cx"])
            cy = float(b["cy"])
            bw = float(b["w"])
            bh = float(b["h"])
            lines.append(f"{cls_id} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")

        with open(dst_lbl, "w") as f:
            f.write("\n".join(lines) + "\n")

        # Record into manually verified manifest
        manifest_path = os.path.join(DATASET_DIR, "manually_verified_manifest.json")
        try:
            manifest = {}
            if os.path.exists(manifest_path):
                with open(manifest_path, "r") as mf:
                    manifest = json.load(mf)
            manifest[base_id] = {
                "timestamp": time.time(),
                "split": split,
                "box_count": len(boxes),
                "image_path": dst_img,
                "verified": True
            }
            with open(manifest_path, "w") as mf:
                json.dump(manifest, mf, indent=2)
        except Exception:
            pass

        return {
            "status": "success",
            "saved_image": dst_img,
            "saved_label": dst_lbl,
            "box_count": len(boxes),
            "split": split
        }

    def get_dataset_stats(self):
        """Returns total annotated images count and class breakdown."""
        total_train = len(glob.glob(os.path.join(DATASET_DIR, "images", "train", "*.*")))
        total_val = len(glob.glob(os.path.join(DATASET_DIR, "images", "val", "*.*")))
        
        class_counts = {c: 0 for c in CLASSES}
        for split in ["train", "val"]:
            for lf in glob.glob(os.path.join(DATASET_DIR, "labels", split, "*.txt")):
                with open(lf, "r") as f:
                    for line in f:
                        parts = line.strip().split()
                        if parts:
                            cid = int(parts[0])
                            if cid < len(CLASSES):
                                class_counts[CLASSES[cid]] += 1

        return {
            "total_annotated_frames": total_train + total_val,
            "train_frames": total_train,
            "val_frames": total_val,
            "class_counts": class_counts,
            "classes": CLASSES,
            "class_colors": CLASS_COLORS,
            "dataset_dir": DATASET_DIR
        }

    def delete_frame(self, full_path, base_id=None):
        """Permanently deletes an image frame from disk and removes its labels if present."""
        deleted = False
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
                deleted = True
            except Exception as e:
                print(f"Error removing {full_path}: {e}")

        # Also remove from manual dataset if it was saved
        if base_id:
            for split in ["train", "val"]:
                lbl = os.path.join(DATASET_DIR, "labels", split, f"{base_id}.txt")
                if os.path.exists(lbl):
                    try:
                        os.remove(lbl)
                    except Exception:
                        pass
                img = os.path.join(DATASET_DIR, "images", split, f"{base_id}.jpg")
                if os.path.exists(img):
                    try:
                        os.remove(img)
                    except Exception:
                        pass

        return {"status": "success" if deleted else "failed", "deleted": deleted}

    def purge_corrupted_frames(self):
        """Scans FRAMES_DIR and removes frames with severe decoder drop / vertical stripes / blank gray."""
        all_frames = glob.glob(os.path.join(FRAMES_DIR, "**", "*.jpg"), recursive=True)
        purged = 0
        purged_files = []
        import numpy as np

        for fp in all_frames:
            try:
                sz = os.path.getsize(fp)
                if sz < 55000:
                    os.remove(fp)
                    purged += 1
                    purged_files.append(os.path.basename(fp))
                    continue

                img = cv2.imread(fp)
                if img is None:
                    os.remove(fp)
                    purged += 1
                    purged_files.append(os.path.basename(fp))
                    continue

                small = cv2.resize(img, (160, 90))
                gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
                col_diff = np.mean(np.abs(np.diff(gray, axis=0)))
                row_diff = np.mean(np.abs(np.diff(gray, axis=1)))
                ratio = col_diff / (row_diff + 1e-5)
                std = np.std(gray)

                # Striped decoder artifact or solid flat empty/gray
                if (ratio < 0.28 and row_diff > 30) or std < 15:
                    os.remove(fp)
                    purged += 1
                    purged_files.append(os.path.basename(fp))
            except Exception:
                pass

        return {"status": "success", "purged_count": purged, "purged_samples": purged_files[:10]}

annotation_engine = AnnotationEngine()

