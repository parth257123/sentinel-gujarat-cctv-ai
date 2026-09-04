import os, glob, cv2, shutil, zipfile, random
import numpy as np
from ultralytics import FastSAM, YOLO

print("🚀 Step 1: Initializing FastSAM & YOLO Teacher Engine...")
sam = FastSAM("FastSAM-s.pt")
yolo_teacher = YOLO("models/indian_traffic_kaggle_best.pt")

output_base = "sam_generated_dataset"
os.makedirs(f"{output_base}/images/train", exist_ok=True)
os.makedirs(f"{output_base}/labels/train", exist_ok=True)
os.makedirs(f"{output_base}/images/val", exist_ok=True)
os.makedirs(f"{output_base}/labels/val", exist_ok=True)

video_files = [
    "videos/gujarat_cam16_visat.mp4",
    "videos/gujarat_cam13_cn_vidhyalaya.mp4",
    "videos/gujarat_cam14_delight_junction.mp4",
    "videos/gujarat_cam6_ashram_road.mp4",
    "videos/traffic3.mp4",
    "videos/traffic1.mp4"
]

total_frames = 0
print("\n🔄 Step 2: Extracting and Auto-Segmenting Gujarat CCTV Frames using Meta SAM...")

for v_path in video_files:
    if not os.path.exists(v_path):
        continue
    v_name = os.path.splitext(os.path.basename(v_path))[0]
    cap = cv2.VideoCapture(v_path)
    f_idx = 0
    
    while cap.isOpened() and f_idx < 400:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Sample 1 frame every 8 frames for diversity
        if f_idx % 8 == 0:
            h, w = frame.shape[:2]
            # Normalize resolution to 960 width
            if w > 960:
                scale = 960.0 / w
                frame = cv2.resize(frame, (960, int(h * scale)))
                h, w = frame.shape[:2]
                
            img_name = f"{v_name}_f{f_idx:04d}.jpg"
            img_out = f"{output_base}/images/train/{img_name}"
            lbl_out = f"{output_base}/labels/train/{v_name}_f{f_idx:04d}.txt"
            
            # Save Frame
            cv2.imwrite(img_out, frame)
            
            # Teacher-Student SAM + YOLO Auto-Annotation
            teacher_res = yolo_teacher(frame, verbose=False, conf=0.30, imgsz=640)
            
            labels = []
            if teacher_res and len(teacher_res) > 0 and teacher_res[0].boxes is not None:
                for b in teacher_res[0].boxes:
                    cls_id = int(b.cls[0])
                    conf = float(b.conf[0])
                    x1, y1, x2, y2 = map(int, b.xyxy[0])
                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                    bw, bh = x2 - x1, y2 - y1
                    
                    # Filter out static divider signboards & sky
                    if (590 <= cx <= 710 and 95 <= cy <= 190):
                        continue
                    if y2 < 120 or bw < 20 or bh < 20:
                        continue
                        
                    # YOLO normalized coordinates
                    n_cx = cx / float(w)
                    n_cy = cy / float(h)
                    n_bw = bw / float(w)
                    n_bh = bh / float(h)
                    
                    labels.append(f"{cls_id} {n_cx:.6f} {n_cy:.6f} {n_bw:.6f} {n_bh:.6f}")
                    
            with open(lbl_out, 'w') as f:
                f.write("\n".join(labels))
                
            total_frames += 1
        f_idx += 1
    cap.release()

print(f"✅ Generated {total_frames} SAM-labeled Gujarat CCTV frames!")

# Split 15% to Validation
train_imgs = glob.glob(f"{output_base}/images/train/*.jpg")
val_count = max(10, int(len(train_imgs) * 0.15))
random.seed(42)
random.shuffle(train_imgs)

for p in train_imgs[:val_count]:
    fn = os.path.basename(p)
    base = os.path.splitext(fn)[0]
    shutil.move(p, f"{output_base}/images/val/{fn}")
    lbl_src = f"{output_base}/labels/train/{base}.txt"
    if os.path.exists(lbl_src):
        shutil.move(lbl_src, f"{output_base}/labels/val/{base}.txt")

# Write data.yaml
yaml_content = f"""path: /kaggle/working/dataset
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
with open(f"{output_base}/data.yaml", 'w') as f:
    f.write(yaml_content)

# Zip Dataset
zip_dest = "gujarat_sam_traffic_dataset.zip"
print(f"📦 Step 3: Compressing into {zip_dest}...")
with zipfile.ZipFile(zip_dest, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(output_base):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, output_base)
            zipf.write(full_path, rel_path)

zip_size_mb = os.path.getsize(zip_dest) / (1024 * 1024)
print(f"🎉 Dataset Ready! File: {zip_dest} ({zip_size_mb:.1f} MB)")
