import os
import cv2
import glob
import random
import zipfile
import numpy as np
from ultralytics import YOLO

# 8 Dedicated Gujarat Road Traffic Classes
CLASSES = [
    "auto_rickshaw",
    "motorcycle",
    "scooter",
    "car",
    "ambulance",
    "truck",
    "bus",
    "van"
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEOS_DIR = os.path.join(BASE_DIR, "videos")
DATASET_DIR = os.path.join(BASE_DIR, "datasets", "indian_traffic")
ZIP_OUTPUT = os.path.join(BASE_DIR, "gujarat_cctv_dataset.zip")

def prepare_directories():
    for split in ["train", "val"]:
        os.makedirs(os.path.join(DATASET_DIR, "images", split), exist_ok=True)
        os.makedirs(os.path.join(DATASET_DIR, "labels", split), exist_ok=True)

def generate_cctv_dataset():
    prepare_directories()
    
    video_files = glob.glob(os.path.join(VIDEOS_DIR, "*.mp4"))
    print(f"🎬 Found {len(video_files)} Gujarat CCTV Source Videos:")
    for vf in video_files:
        size_mb = os.path.getsize(vf) / (1024 * 1024)
        print(f"  📹 {os.path.basename(vf)} ({size_mb:.1f} MB)")
        
    # Load best available detector for high-precision pseudo-labeling
    best_model_path = os.path.join(BASE_DIR, "models", "indian_traffic_yolo12_best.pt")
    if os.path.exists(best_model_path):
        model = YOLO(best_model_path)
        print(f"⚡ Loaded Custom Indian Traffic Detector: {best_model_path}")
    else:
        model = YOLO("yolo12s.pt")
        print("⚡ Loaded YOLOv12s Detector")
        
    total_extracted = 0
    class_counts = {i: 0 for i in range(len(CLASSES))}
    
    for vpath in video_files:
        vname = os.path.basename(vpath)
        cap = cv2.VideoCapture(vpath)
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 10
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 100
        
        # Sample every 8-12 frames for diverse vehicle poses and lighting
        sample_step = max(4, int(fps / 2))
        f_idx = 0
        
        print(f"\n🔍 Processing {vname} ({total_frames} frames)...")
        
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                break
                
            f_idx += 1
            if f_idx % sample_step != 0:
                continue
                
            h, w = frame.shape[:2]
            
            # Predict at 1024px high resolution
            results = model.predict(
                frame,
                imgsz=1024,
                conf=0.15,
                device="mps",
                verbose=False
            )
            
            label_lines = []
            
            if results and len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    bw = x2 - x1
                    bh = y2 - y1
                    aspect = bh / float(max(1, bw))
                    
                    # Filter out tiny distant noise or top sky artifacts
                    if bw < 18 or bh < 18 or y1 < 20:
                        continue
                        
                    # Target class mapping
                    target_cls = cls_id
                    if target_cls >= len(CLASSES):
                        target_cls = 3 # fallback to car
                        
                    # Geometric Disambiguation for Indian Traffic:
                    # 1. Auto-Rickshaw vs Truck
                    if target_cls == 5 and bw < 95 and bh < 120:
                        target_cls = 0 # auto_rickshaw
                    # 2. Transit Bus vs Truck
                    elif target_cls == 5 and bh > 140 and bw > 115 and y1 < 400:
                        target_cls = 6 # bus
                    # 3. Two-Wheelers (Scooter vs Motorcycle)
                    elif target_cls in [1, 2] or (bw < 75 and aspect > 1.10):
                        if bw > bh * 0.50:
                            target_cls = 2 # scooter
                        else:
                            target_cls = 1 # motorcycle
                            
                    class_counts[target_cls] += 1
                    
                    # Normalize YOLO coordinates
                    cx_norm = (x1 + bw / 2.0) / float(w)
                    cy_norm = (y1 + bh / 2.0) / float(h)
                    bw_norm = float(bw) / float(w)
                    bh_norm = float(bh) / float(h)
                    
                    label_lines.append(f"{target_cls} {cx_norm:.6f} {cy_norm:.6f} {bw_norm:.6f} {bh_norm:.6f}")
                    
            if len(label_lines) > 0:
                split = "train" if random.random() < 0.85 else "val"
                img_name = f"cctv_{os.path.splitext(vname)[0]}_f{f_idx:05d}.jpg"
                lbl_name = f"cctv_{os.path.splitext(vname)[0]}_f{f_idx:05d}.txt"
                
                img_dest = os.path.join(DATASET_DIR, "images", split, img_name)
                lbl_dest = os.path.join(DATASET_DIR, "labels", split, lbl_name)
                
                cv2.imwrite(img_dest, frame)
                with open(lbl_dest, "w") as f:
                    f.write("\n".join(label_lines) + "\n")
                    
                total_extracted += 1
                
        cap.release()
        
    print(f"\n==================================================")
    print(f"✅ Extracted {total_extracted} Real Gujarat CCTV Frames!")
    print(f"📊 Class Instance Counts:")
    for cid, cname in enumerate(CLASSES):
        print(f"  [{cid}] {cname:15s}: {class_counts[cid]} instances")
        
    # Write dataset yaml
    yaml_content = f"""path: {DATASET_DIR}
train: images/train
val: images/val

names:
  0: auto_rickshaw
  1: motorcycle
  2: scooter
  3: car
  4: ambulance
  5: truck
  6: bus
  7: van
"""
    yaml_path = os.path.join(DATASET_DIR, "data.yaml")
    with open(yaml_path, "w") as f:
        f.write(yaml_content)
    print(f"✅ Created data.yaml at: {yaml_path}")
    
    # Auto-Zip the entire dataset for Google Colab / Kaggle
    print(f"\n📦 Compressing dataset into {ZIP_OUTPUT}...")
    with zipfile.ZipFile(ZIP_OUTPUT, "w", zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(DATASET_DIR):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, os.path.dirname(DATASET_DIR))
                z.write(full_path, rel_path)
                
    zip_size_mb = os.path.getsize(ZIP_OUTPUT) / (1024 * 1024)
    print(f"🎉 Created {ZIP_OUTPUT} ({zip_size_mb:.1f} MB) Ready for Colab / Kaggle!")

if __name__ == "__main__":
    generate_cctv_dataset()
