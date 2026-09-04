"""
Live RTSP CCTV Dataset Capture & Auto-Labeling Script
=====================================================
Captures frames from 30 live Gujarat Police CCTV cameras via RTSP,
auto-labels using YOLOv8x (strongest COCO teacher), and maps to
10-class Indian traffic taxonomy for fine-tuning.

Classes:
  0: auto_rickshaw
  1: motorcycle
  2: scooter
  3: car
  4: ambulance
  5: truck
  6: bus
  7: van
  8: pedestrian
  9: emergency_vehicle
"""

import os
import cv2
import sys
import time
import random
import numpy as np
from ultralytics import YOLO

# ─── Configuration ─────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "datasets", "indian_traffic_live")
RTSP_BASE = "rtsp://parthlodaya257%40gmail.com:RDT5-S2ZG-L7JD@103.250.160.189:8554/stream"

# All 30 camera IDs
CAMERA_IDS = [f"cam{str(i).zfill(2)}" for i in range(1, 31)]

# How many frames to capture per camera
FRAMES_PER_CAMERA = 100

# Capture interval in seconds (grab 1 frame every N seconds)
CAPTURE_INTERVAL = 2.0

# Minimum detections per frame to save (skip empty frames)
MIN_DETECTIONS = 1

# 10-class Indian Traffic Taxonomy
CLASS_NAMES = [
    "auto_rickshaw",   # 0
    "motorcycle",      # 1
    "scooter",         # 2
    "car",             # 3
    "ambulance",       # 4
    "truck",           # 5
    "bus",             # 6
    "van",             # 7
    "pedestrian",      # 8
    "emergency_vehicle" # 9
]

# ─── Setup ─────────────────────────────────────────────────────────────

def prepare_directories():
    for split in ["train", "val"]:
        os.makedirs(os.path.join(DATASET_DIR, "images", split), exist_ok=True)
        os.makedirs(os.path.join(DATASET_DIR, "labels", split), exist_ok=True)
    print(f"📁 Dataset directory: {DATASET_DIR}")


def write_data_yaml():
    yaml_content = f"""path: {DATASET_DIR}
train: images/train
val: images/val

nc: {len(CLASS_NAMES)}
names:
"""
    for i, name in enumerate(CLASS_NAMES):
        yaml_content += f"  {i}: {name}\n"

    yaml_path = os.path.join(DATASET_DIR, "data.yaml")
    with open(yaml_path, "w") as f:
        f.write(yaml_content)
    print(f"✅ Created data.yaml at: {yaml_path}")
    return yaml_path


# ─── Classification Logic ─────────────────────────────────────────────

def classify_detection(frame, box, coco_cls_id, conf, teacher_model):
    """
    Maps a COCO detection to the 10-class Indian traffic taxonomy using
    multi-signal analysis: aspect ratio, size, color, position.
    """
    x1, y1, x2, y2 = map(int, box.xyxy[0])
    h_frame, w_frame = frame.shape[:2]
    bw = x2 - x1
    bh = y2 - y1

    # Skip tiny noise
    if bw < 15 or bh < 15:
        return None

    # Skip detections in the very top of frame (sky/HUD area)
    if y1 < 20:
        return None

    crop = frame[max(0, y1):min(h_frame, y2), max(0, x1):min(w_frame, x2)]
    if crop.size == 0:
        return None

    aspect = bh / float(max(1, bw))  # height / width
    area = bw * bh

    # ─── Color Analysis ───
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    # Sample center 60% to avoid background
    ch, cw = crop.shape[:2]
    center_crop = crop[int(ch*0.2):int(ch*0.8), int(cw*0.2):int(cw*0.8)]
    if center_crop.size > 0:
        hsv_center = cv2.cvtColor(center_crop, cv2.COLOR_BGR2HSV)
    else:
        hsv_center = hsv

    mean_h = np.mean(hsv_center[:, :, 0])
    mean_s = np.mean(hsv_center[:, :, 1])
    mean_v = np.mean(hsv_center[:, :, 2])

    # Emergency red accent check
    mask_red1 = cv2.inRange(hsv, np.array([0, 80, 80]), np.array([10, 255, 255]))
    mask_red2 = cv2.inRange(hsv, np.array([160, 80, 80]), np.array([180, 255, 255]))
    red_ratio = (np.count_nonzero(mask_red1 | mask_red2) / float(max(1, bw * bh)))
    has_emergency_red = red_ratio > 0.035

    # Emergency blue beacon check (police vehicles)
    mask_blue = cv2.inRange(hsv, np.array([95, 80, 80]), np.array([130, 255, 255]))
    blue_ratio = (np.count_nonzero(mask_blue) / float(max(1, bw * bh)))
    has_emergency_blue = blue_ratio > 0.04

    # Yellow/green check (auto-rickshaw indicator)
    mask_yellow = cv2.inRange(hsv, np.array([18, 60, 80]), np.array([40, 255, 255]))
    mask_green = cv2.inRange(hsv, np.array([36, 60, 80]), np.array([85, 255, 255]))
    yellow_green_ratio = (np.count_nonzero(mask_yellow) + np.count_nonzero(mask_green)) / float(max(1, bw * bh))

    # ─── Classification Rules ───

    # COCO class 0 = person → pedestrian
    if coco_cls_id == 0:
        return 8  # pedestrian

    # COCO class 1 = bicycle
    if coco_cls_id == 1:
        # In India, could be a bicycle or e-rickshaw
        if bw > 80 and aspect < 0.9:
            return 0  # auto_rickshaw (e-rickshaw)
        return 1  # motorcycle (bicycle rider, close enough)

    # COCO class 3 = motorcycle
    if coco_cls_id == 3:
        # Scooter vs Motorcycle distinction
        # Scooters: wider body, lighter colors, step-through frame
        if bw > bh * 0.55 or (mean_s < 40 and mean_v > 120):
            return 2  # scooter
        else:
            return 1  # motorcycle

    # COCO class 5 = bus
    if coco_cls_id == 5:
        return 6  # bus

    # COCO class 7 = truck
    if coco_cls_id == 7:
        return 5  # truck

    # COCO class 2 = car (most complex — need to sub-classify)
    if coco_cls_id == 2:
        # 1. AMBULANCE: White/silver body + red emergency markings + large
        if mean_s < 45 and mean_v > 120 and has_emergency_red and bw > 80:
            return 4  # ambulance

        # 2. EMERGENCY VEHICLE (police van): White + blue beacon
        if mean_s < 50 and has_emergency_blue and bw > 70:
            return 9  # emergency_vehicle

        # 3. AUTO-RICKSHAW: Yellow/green body + compact + boxy aspect
        if yellow_green_ratio > 0.25 and 0.70 < aspect < 1.50 and bw < 120:
            return 0  # auto_rickshaw

        # 4. VAN: White/silver + boxy tall shape
        if mean_s < 40 and 0.70 < aspect < 1.10 and 70 < bw < 180:
            return 7  # van

        # 5. Default: car
        return 3  # car

    # COCO class 9 = traffic light — skip
    # COCO class 10 = fire hydrant — skip
    # Other classes: skip
    return None


# ─── Main Capture Loop ────────────────────────────────────────────────

def capture_dataset():
    prepare_directories()

    # Load YOLOv8x as the strongest teacher model
    print("🔄 Loading YOLOv8x teacher model (this may download ~130MB on first run)...")
    teacher = YOLO("yolov8x.pt")
    print("✅ YOLOv8x teacher model loaded!")

    # Target COCO classes to detect
    # 0=person, 1=bicycle, 2=car, 3=motorcycle, 5=bus, 7=truck
    target_coco_classes = [0, 1, 2, 3, 5, 7]

    total_images = 0
    total_detections = 0
    class_counts = {i: 0 for i in range(len(CLASS_NAMES))}
    failed_cameras = []

    for cam_idx, cam_id in enumerate(CAMERA_IDS):
        rtsp_url = f"{RTSP_BASE}/{cam_id}"
        print(f"\n📷 [{cam_idx+1}/{len(CAMERA_IDS)}] Connecting to {cam_id} → {rtsp_url}")

        # Configure RTSP transport
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)

        if not cap.isOpened():
            print(f"  ❌ Failed to connect to {cam_id}, skipping...")
            failed_cameras.append(cam_id)
            continue

        # Read and discard first few frames (often corrupted I-frames)
        for _ in range(3):
            cap.read()

        frames_captured = 0
        consecutive_failures = 0

        for frame_idx in range(FRAMES_PER_CAMERA * 3):  # Allow extra attempts
            if frames_captured >= FRAMES_PER_CAMERA:
                break

            ret, frame = cap.read()
            if not ret or frame is None:
                consecutive_failures += 1
                if consecutive_failures > 10:
                    print(f"  ⚠️ Too many read failures on {cam_id}, moving on...")
                    break
                time.sleep(0.5)
                continue

            consecutive_failures = 0

            # Skip frames to avoid redundancy (capture every Nth frame)
            if frame_idx % max(1, int(CAPTURE_INTERVAL * 10)) != 0:
                continue

            h, w = frame.shape[:2]

            # Resize very large frames (e.g., cam26 at 2560x1440)
            if w > 1920:
                scale = 1920.0 / w
                frame = cv2.resize(frame, (1920, int(h * scale)), interpolation=cv2.INTER_AREA)
                h, w = frame.shape[:2]

            # Run YOLOv8x teacher inference
            results = teacher.predict(
                frame,
                imgsz=960,
                conf=0.20,
                iou=0.50,
                classes=target_coco_classes,
                device="mps",
                verbose=False
            )

            label_lines = []

            if results and len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                for box in boxes:
                    coco_cls = int(box.cls[0])
                    conf_val = float(box.conf[0])

                    # Map COCO → Indian traffic class
                    indian_cls = classify_detection(frame, box, coco_cls, conf_val, teacher)
                    if indian_cls is None:
                        continue

                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    bw = x2 - x1
                    bh = y2 - y1

                    # YOLO normalized format
                    cx_norm = (x1 + bw / 2.0) / float(w)
                    cy_norm = (y1 + bh / 2.0) / float(h)
                    bw_norm = float(bw) / float(w)
                    bh_norm = float(bh) / float(h)

                    label_lines.append(f"{indian_cls} {cx_norm:.6f} {cy_norm:.6f} {bw_norm:.6f} {bh_norm:.6f}")
                    class_counts[indian_cls] += 1
                    total_detections += 1

            if len(label_lines) >= MIN_DETECTIONS:
                # 85/15 train/val split
                split = "train" if random.random() < 0.85 else "val"
                img_name = f"live_{cam_id}_f{frame_idx:05d}.jpg"
                lbl_name = f"live_{cam_id}_f{frame_idx:05d}.txt"

                img_dest = os.path.join(DATASET_DIR, "images", split, img_name)
                lbl_dest = os.path.join(DATASET_DIR, "labels", split, lbl_name)

                cv2.imwrite(img_dest, frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
                with open(lbl_dest, "w") as f:
                    f.write("\n".join(label_lines) + "\n")

                total_images += 1
                frames_captured += 1

                if frames_captured % 20 == 0:
                    print(f"  📸 {frames_captured}/{FRAMES_PER_CAMERA} frames captured from {cam_id}")

        cap.release()
        print(f"  ✅ {cam_id}: captured {frames_captured} frames")

    # Write data.yaml
    write_data_yaml()

    # Print summary
    print("\n" + "=" * 60)
    print(f"🎉 DATASET CAPTURE COMPLETE!")
    print(f"=" * 60)
    print(f"Total images:     {total_images}")
    print(f"Total detections: {total_detections}")
    print(f"Failed cameras:   {len(failed_cameras)} ({', '.join(failed_cameras) if failed_cameras else 'none'})")
    print(f"\nClass distribution:")
    for cls_id, count in class_counts.items():
        bar = "█" * min(50, count // 10)
        print(f"  {cls_id:2d} {CLASS_NAMES[cls_id]:20s}: {count:5d} {bar}")
    print(f"\nDataset saved to: {DATASET_DIR}")


if __name__ == "__main__":
    capture_dataset()
