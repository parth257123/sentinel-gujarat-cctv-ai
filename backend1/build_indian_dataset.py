import os
import cv2
import glob
import random
import numpy as np
from ultralytics import YOLO

# 8 Dedicated Indian Road Traffic Classes
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

def prepare_directories():
    for split in ["train", "val"]:
        os.makedirs(os.path.join(DATASET_DIR, "images", split), exist_ok=True)
        os.makedirs(os.path.join(DATASET_DIR, "labels", split), exist_ok=True)

def extract_cctv_dataset():
    prepare_directories()
    
    video_files = glob.glob(os.path.join(VIDEOS_DIR, "*.mp4"))
    print(f"Found {len(video_files)} Gujarat CCTV source videos: {[os.path.basename(v) for v in video_files]}")
    
    base_model = YOLO(os.path.join(BASE_DIR, "yolo12n.pt"))
    total_images = 0
    
    for vpath in video_files:
        vname = os.path.basename(vpath)
        cap = cv2.VideoCapture(vpath)
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 10
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 100
        
        sample_step = max(3, int(fps / 2))
        f_idx = 0
        
        print(f"Processing {vname} ({total_frames} frames)...")
        
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                break
                
            f_idx += 1
            if f_idx % sample_step != 0:
                continue
                
            h, w = frame.shape[:2]
            
            results = base_model.predict(
                frame,
                imgsz=960,
                conf=0.08,
                classes=[0, 1, 2, 3, 5, 7],
                device="mps",
                verbose=False
            )
            
            label_lines = []
            
            if results and len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                for box in boxes:
                    coco_cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    bw = x2 - x1
                    bh = y2 - y1
                    
                    if bw < 20 or bh < 20 or y1 < 25:
                        continue
                        
                    crop = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
                    if crop.size == 0:
                        continue
                        
                    aspect = bh / float(max(1, bw))
                    
                    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
                    mean_s = np.mean(hsv[:, :, 1])
                    mean_v = np.mean(hsv[:, :, 2])
                    hist_h = cv2.calcHist([hsv], [0], None, [180], [0, 180])
                    h_val = int(np.argmax(hist_h))
                    
                    mask_red1 = cv2.inRange(hsv, np.array([0, 80, 80]), np.array([10, 255, 255]))
                    mask_red2 = cv2.inRange(hsv, np.array([160, 80, 80]), np.array([180, 255, 255]))
                    has_red = (np.count_nonzero(mask_red1 | mask_red2) / float(max(1, crop.shape[0] * crop.shape[1]))) > 0.04
                    
                    # 0: auto_rickshaw, 1: motorcycle, 2: scooter, 3: car, 4: ambulance, 5: truck, 6: bus, 7: van
                    indian_cls_id = 3
                    
                    if coco_cls in [0, 1, 3] or (bw < 70 and aspect > 1.05):
                        if bw > bh * 0.52 or mean_s < 35:
                            indian_cls_id = 2 # scooter
                        else:
                            indian_cls_id = 1 # motorcycle
                    elif mean_s < 35 and mean_v > 130 and has_red and bw > 80:
                        indian_cls_id = 4 # ambulance
                    elif (22 <= h_val <= 85 and aspect > 0.75 and bw < 100) or (0.80 < aspect < 1.30 and 45 < bw < 88):
                        indian_cls_id = 0 # auto_rickshaw
                    elif coco_cls == 7 or (aspect > 0.90 and 10 <= h_val <= 30 and bh > 110):
                        indian_cls_id = 5 # truck
                    elif coco_cls == 5 or (aspect < 0.52 and bw > 220):
                        indian_cls_id = 6 # bus
                    elif mean_s < 35 and 0.68 < aspect < 1.05 and 85 < bw < 160:
                        indian_cls_id = 7 # van
                    else:
                        indian_cls_id = 3 # car
                        
                    cx_norm = (x1 + bw / 2.0) / float(w)
                    cy_norm = (y1 + bh / 2.0) / float(h)
                    bw_norm = float(bw) / float(w)
                    bh_norm = float(bh) / float(h)
                    
                    label_lines.append(f"{indian_cls_id} {cx_norm:.6f} {cy_norm:.6f} {bw_norm:.6f} {bh_norm:.6f}")
            
            if len(label_lines) > 0:
                split = "train" if random.random() < 0.85 else "val"
                img_name = f"cctv_{os.path.splitext(vname)[0]}_f{f_idx:05d}.jpg"
                lbl_name = f"cctv_{os.path.splitext(vname)[0]}_f{f_idx:05d}.txt"
                
                img_dest = os.path.join(DATASET_DIR, "images", split, img_name)
                lbl_dest = os.path.join(DATASET_DIR, "labels", split, lbl_name)
                
                cv2.imwrite(img_dest, frame)
                with open(lbl_dest, "w") as f:
                    f.write("\n".join(label_lines) + "\n")
                    
                total_images += 1
                
        cap.release()
        
    print(f"\n✅ Successfully generated {total_images} annotated images in {DATASET_DIR}")
    
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
    print(f"✅ Created dataset configuration at: {yaml_path}")

if __name__ == "__main__":
    extract_cctv_dataset()
