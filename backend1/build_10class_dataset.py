"""
Sentinel 10-Class Practical Indian Traffic Dataset Builder & Synthesizer
=======================================================================
Aggregates, auto-labels, and standardizes multi-camera Gujarat Police CCTV
footage into a high-precision 10-class YOLO training dataset.

Taxonomy (10 Classes):
  0: pedestrian         (Pedestrians, street vendors, foot traffic)
  1: car                (Hatchbacks, Sedans, SUVs, MUVs)
  2: two_wheeler        (Motorcycles, Scooters, Mopeds, Bicycles)
  3: heavy_machinery    (Tractors, JCBs, Excavators, Cranes, Rollers)
  4: emergency_vehicle  (Ambulances, Police PCRs/Vans, Fire Tenders)
  5: van                (Utility Vans, Omni, Eeco, Tempo Travelers)
  6: truck              (Heavy Duty Lorries, Dumpers, Container Trucks)
  7: bus                (GSRTC State Buses, City Transit, Private Coaches)
  8: auto_rickshaw      (3-Wheel Autos, E-Rickshaws, Chhakdas)
  9: others             (Animal/Bullock Carts, Handcarts, Misc Transport)
"""

import os
import cv2
import glob
import time
import shutil
import random
import zipfile
import numpy as np
import torch
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

HARVESTED_DIR = os.path.join(BASE_DIR, "harvested_cctv_frames")
HEAVYWEIGHT_DIR = os.path.join(BASE_DIR, "datasets", "heavyweight_5500_cctv_dataset")
EXISTING_MASTER_DIR = os.path.join(BASE_DIR, "datasets", "master_sentinel_traffic_dataset")
EXISTING_LIVE_DIR = os.path.join(BASE_DIR, "datasets", "indian_traffic_live")

TARGET_DATASET_DIR = os.path.join(BASE_DIR, "datasets", "sentinel_10class_gujarat_dataset")
OUTPUT_ZIP = os.path.join(PROJECT_ROOT, "SENTINEL_10CLASS_GUJARAT_TRAFFIC_DATASET.zip")

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

def setup_target_structure():
    """Initializes images and labels directory structure for train and val splits."""
    if os.path.exists(TARGET_DATASET_DIR):
        print(f"🧹 Clearing previous dataset directory: {TARGET_DATASET_DIR}")
        shutil.rmtree(TARGET_DATASET_DIR)
        
    for split in ["train", "val"]:
        os.makedirs(os.path.join(TARGET_DATASET_DIR, "images", split), exist_ok=True)
        os.makedirs(os.path.join(TARGET_DATASET_DIR, "labels", split), exist_ok=True)

    yaml_path = os.path.join(TARGET_DATASET_DIR, "data.yaml")
    yaml_lines = [
        f"path: {TARGET_DATASET_DIR}",
        "train: images/train",
        "val: images/val",
        "",
        f"nc: {len(CLASSES)}",
        "names:"
    ]
    for idx, cname in enumerate(CLASSES):
        yaml_lines.append(f"  {idx}: {cname}")
    
    with open(yaml_path, "w") as f:
        f.write("\n".join(yaml_lines) + "\n")
    print(f"✅ Initialized data.yaml at {yaml_path}")


def analyze_crop_features(crop):
    """
    Analyzes visual features of a bounding box crop to distinguish:
    - Heavy machinery (construction yellow/orange, high chassis)
    - Emergency vehicle (red cross, blue/red flashing beacons)
    - Auto-rickshaw (yellow/green body paint)
    - Van (boxy tall aspect ratio)
    """
    if crop is None or crop.size == 0:
        return {}
        
    ch, cw = crop.shape[:2]
    aspect = ch / float(max(1, cw))
    
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    
    # 1. Emergency Red & Blue Accents
    mask_r1 = cv2.inRange(hsv, np.array([0, 70, 70]), np.array([10, 255, 255]))
    mask_r2 = cv2.inRange(hsv, np.array([165, 70, 70]), np.array([180, 255, 255]))
    red_ratio = np.count_nonzero(mask_r1 | mask_r2) / float(max(1, ch * cw))
    
    mask_b = cv2.inRange(hsv, np.array([95, 70, 70]), np.array([130, 255, 255]))
    blue_ratio = np.count_nonzero(mask_b) / float(max(1, ch * cw))
    
    # 2. Construction / Heavy Machinery Yellow & Orange (JCB, Cat, Escorts, Mahindra Tractor)
    mask_industrial_yellow = cv2.inRange(hsv, np.array([15, 80, 80]), np.array([32, 255, 255]))
    industrial_ratio = np.count_nonzero(mask_industrial_yellow) / float(max(1, ch * cw))
    
    # 3. Auto-Rickshaw Traditional Green & Yellow
    mask_auto_green = cv2.inRange(hsv, np.array([35, 60, 50]), np.array([85, 255, 255]))
    auto_green_ratio = np.count_nonzero(mask_auto_green) / float(max(1, ch * cw))
    
    # 4. Brightness & Saturation
    mean_s = np.mean(hsv[:, :, 1])
    mean_v = np.mean(hsv[:, :, 2])
    
    return {
        "aspect": aspect,
        "width": cw,
        "height": ch,
        "red_ratio": red_ratio,
        "blue_ratio": blue_ratio,
        "industrial_ratio": industrial_ratio,
        "auto_green_ratio": auto_green_ratio,
        "mean_s": mean_s,
        "mean_v": mean_v
    }


def map_coco_to_10class(coco_cls_id, frame, box, conf):
    """
    Maps COCO detections to the 10-class taxonomy using multi-signal analysis.
    """
    x1, y1, x2, y2 = map(int, box.xyxy[0])
    h_frame, w_frame = frame.shape[:2]
    bw = x2 - x1
    bh = y2 - y1
    
    # Discard tiny artifacts or detections high in the sky/OSD
    if bw < 14 or bh < 14 or y1 < 15:
        return None
        
    crop = frame[max(0, y1):min(h_frame, y2), max(0, x1):min(w_frame, x2)]
    feats = analyze_crop_features(crop)
    if not feats:
        return None
        
    aspect = feats["aspect"]
    
    # ── 0: PEDESTRIAN (COCO 0: person) ──
    if coco_cls_id == 0:
        if aspect > 1.2 and bh > 22:
            return 0  # pedestrian
        return None
        
    # ── 2: TWO-WHEELER (COCO 1: bicycle, COCO 3: motorcycle) ──
    if coco_cls_id in [1, 3]:
        # If wide box with auto colors, could be e-rickshaw
        if feats["auto_green_ratio"] > 0.35 and 0.8 < aspect < 1.3:
            return 8  # auto_rickshaw
        return 2  # two_wheeler
        
    # ── 7: BUS (COCO 5: bus) ──
    if coco_cls_id == 5:
        return 7  # bus
        
    # ── 6: TRUCK / 3: HEAVY MACHINERY (COCO 7: truck) ──
    if coco_cls_id == 7:
        # Heavy machinery check: industrial yellow + tractor/JCB aspect
        if feats["industrial_ratio"] > 0.22 and (0.75 < aspect < 1.4 or bh > 80):
            return 3  # heavy_machinery
        if (feats["red_ratio"] > 0.05 and feats["mean_v"] > 110) or (feats["blue_ratio"] > 0.04):
            return 4  # emergency_vehicle (fire tender / large emergency truck)
        return 6  # truck
        
    # ── COCO 2: CAR (dissected into Car, Emergency, Van, Auto, Heavy Machinery) ──
    if coco_cls_id == 2:
        # 1. Emergency vehicle (Ambulance with red cross or police PCR beacon)
        if (feats["red_ratio"] > 0.04 and feats["mean_s"] < 48 and feats["mean_v"] > 120 and bw > 65) or \
           (feats["blue_ratio"] > 0.035 and bw > 60):
            return 4  # emergency_vehicle
            
        # 2. Heavy machinery (compact tractor / mini excavator)
        if feats["industrial_ratio"] > 0.28 and aspect > 0.85:
            return 3  # heavy_machinery
            
        # 3. Auto-rickshaw (Yellow/green or typical Indian 3-wheeler profile)
        if (feats["auto_green_ratio"] > 0.22 or feats["industrial_ratio"] > 0.25) and \
           (0.72 < aspect < 1.45) and (bw < 130 and bh < 140):
            return 8  # auto_rickshaw
            
        # 4. Van (Boxy tall silhouette: Omni, Eeco, Tempo Traveler)
        if (0.72 < aspect < 1.15) and (feats["mean_s"] < 45) and (60 < bw < 170):
            return 5  # van
            
        # 5. Default passenger car
        return 1  # car

    return None


def remap_legacy_annotations(line, source_type="master"):
    """
    Remaps existing annotated datasets to the standardized 10-class taxonomy.
    """
    parts = line.strip().split()
    if len(parts) != 5:
        return None
        
    old_cid = int(parts[0])
    new_cid = 1  # default car
    
    if source_type == "master":
        # Master classes:
        # 0: auto_rickshaw, 1: motorcycle, 2: scooter, 3: car, 4: bus, 5: truck, 6: ambulance, 7: van
        if old_cid == 0: new_cid = 8      # auto_rickshaw
        elif old_cid in [1, 2]: new_cid = 2 # two_wheeler
        elif old_cid == 3: new_cid = 1      # car
        elif old_cid == 4: new_cid = 7      # bus
        elif old_cid == 5: new_cid = 6      # truck
        elif old_cid == 6: new_cid = 4      # emergency_vehicle
        elif old_cid == 7: new_cid = 5      # van
        elif old_cid == 8: new_cid = 0      # pedestrian
        else: new_cid = 9                   # others
        
    elif source_type == "live_10class":
        # 0: auto_rickshaw, 1: motorcycle, 2: scooter, 3: car, 4: ambulance,
        # 5: truck, 6: bus, 7: van, 8: pedestrian, 9: emergency_vehicle
        if old_cid == 0: new_cid = 8        # auto_rickshaw
        elif old_cid in [1, 2]: new_cid = 2 # two_wheeler
        elif old_cid == 3: new_cid = 1      # car
        elif old_cid in [4, 9]: new_cid = 4 # emergency_vehicle
        elif old_cid == 5: new_cid = 6      # truck
        elif old_cid == 6: new_cid = 7      # bus
        elif old_cid == 7: new_cid = 5      # van
        elif old_cid == 8: new_cid = 0      # pedestrian
        else: new_cid = 9                   # others
        
    return f"{new_cid} {' '.join(parts[1:])}"


def run_pipeline():
    print("=" * 75)
    print("🚀 BUILDING 10-CLASS SENTINEL GUJARAT TRAFFIC DATASET (4,500+ FRAMES)")
    print("=" * 75)
    
    setup_target_structure()
    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    print(f"⚡ Inference accelerator: {device}")
    
    # 1. Load Teacher Models
    print("📦 Loading teacher models...")
    teacher_coco = YOLO(os.path.join(BASE_DIR, "yolov8x.pt"))
    print("✅ Loaded YOLOv8x COCO High-Resolution Teacher")
    
    indian_model_path = os.path.join(BASE_DIR, "models", "sentinel_indian_traffic_best.pt")
    teacher_indian = YOLO(indian_model_path) if os.path.exists(indian_model_path) else None
    if teacher_indian:
        print(f"✅ Loaded Sentinel Indian Traffic Specialist: {os.path.basename(indian_model_path)}")
        
    stats = {
        "processed_frames": 0,
        "saved_images": 0,
        "total_annotations": 0,
        "class_counts": {c: 0 for c in CLASSES}
    }
    
    # ──────────────────────────────────────────────────────────────────────────
    # PHASE 1: INGEST AND REMAP EXISTING VERIFIED BENCHMARKS (1,900+ FRAMES)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[Phase 1] Ingesting & re-mapping existing verified datasets...")
    
    # Ingest master sentinel dataset
    if os.path.exists(EXISTING_MASTER_DIR):
        for split in ["train", "val"]:
            img_paths = glob.glob(os.path.join(EXISTING_MASTER_DIR, "images", split, "*.*"))
            print(f"  Ingesting {len(img_paths)} {split} frames from master_sentinel...")
            for img_path in img_paths:
                fname = os.path.basename(img_path)
                base = os.path.splitext(fname)[0]
                lbl_path = os.path.join(EXISTING_MASTER_DIR, "labels", split, f"{base}.txt")
                
                if not os.path.exists(lbl_path):
                    continue
                    
                remapped_lines = []
                with open(lbl_path, "r") as f:
                    for line in f:
                        rem = remap_legacy_annotations(line, source_type="master")
                        if rem:
                            remapped_lines.append(rem)
                            cid = int(rem.split()[0])
                            stats["class_counts"][CLASSES[cid]] += 1
                            stats["total_annotations"] += 1
                            
                if remapped_lines:
                    dst_img = os.path.join(TARGET_DATASET_DIR, "images", split, f"bench_{fname}")
                    dst_lbl = os.path.join(TARGET_DATASET_DIR, "labels", split, f"bench_{base}.txt")
                    shutil.copy2(img_path, dst_img)
                    with open(dst_lbl, "w") as f:
                        f.write("\n".join(remapped_lines) + "\n")
                    stats["saved_images"] += 1

    # Ingest indian_traffic_live
    if os.path.exists(EXISTING_LIVE_DIR):
        for split in ["train", "val"]:
            img_paths = glob.glob(os.path.join(EXISTING_LIVE_DIR, "images", split, "*.jpg"))
            print(f"  Ingesting {len(img_paths)} {split} frames from indian_traffic_live...")
            for img_path in img_paths:
                fname = os.path.basename(img_path)
                base = os.path.splitext(fname)[0]
                lbl_path = os.path.join(EXISTING_LIVE_DIR, "labels", split, f"{base}.txt")
                
                if not os.path.exists(lbl_path):
                    continue
                    
                remapped_lines = []
                with open(lbl_path, "r") as f:
                    for line in f:
                        rem = remap_legacy_annotations(line, source_type="live_10class")
                        if rem:
                            remapped_lines.append(rem)
                            cid = int(rem.split()[0])
                            stats["class_counts"][CLASSES[cid]] += 1
                            stats["total_annotations"] += 1
                            
                if remapped_lines:
                    dst_img = os.path.join(TARGET_DATASET_DIR, "images", split, f"live_{fname}")
                    dst_lbl = os.path.join(TARGET_DATASET_DIR, "labels", split, f"live_{base}.txt")
                    shutil.copy2(img_path, dst_img)
                    with open(dst_lbl, "w") as f:
                        f.write("\n".join(remapped_lines) + "\n")
                    stats["saved_images"] += 1
                    
    print(f"✅ Phase 1 complete: {stats['saved_images']} benchmark frames integrated.")

    # ──────────────────────────────────────────────────────────────────────────
    # PHASE 2: HARVEST & AUTO-LABEL 3,000+ CCTV SNAPSHOTS ACROSS ALL 30 CAMERAS
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[Phase 2] Harvesting & Auto-Labeling from 16,197 CCTV frames across 30 cameras...")
    
    camera_dirs = sorted(glob.glob(os.path.join(HARVESTED_DIR, "cam*")))
    print(f"  Found {len(camera_dirs)} camera folders.")
    
    # We aim to sample ~90-100 high-diversity frames per camera
    FRAMES_PER_CAM = 95
    batch_size = 16
    
    for cam_idx, cam_dir in enumerate(camera_dirs):
        cam_name = os.path.basename(cam_dir)
        all_cam_files = sorted(glob.glob(os.path.join(cam_dir, "*.jpg")))
        if not all_cam_files:
            continue
            
        # Sample evenly across time (morning, afternoon, dusk, night)
        step = max(1, len(all_cam_files) // FRAMES_PER_CAM)
        sampled_cam_files = all_cam_files[::step][:FRAMES_PER_CAM]
        
        print(f"  📸 [{cam_idx+1}/{len(camera_dirs)}] Processing {cam_name}: {len(sampled_cam_files)} diverse frames...")
        
        for b_start in range(0, len(sampled_cam_files), batch_size):
            batch_files = sampled_cam_files[b_start : b_start + batch_size]
            
            # Predict using YOLOv8x teacher
            results = teacher_coco.predict(
                batch_files,
                conf=0.28,
                device=device,
                verbose=False,
                imgsz=640
            )
            
            # If Indian specialist available, run on batch for auto-rickshaw & two-wheeler boost
            indian_results = None
            if teacher_indian:
                try:
                    indian_results = teacher_indian.predict(batch_files, conf=0.35, device=device, verbose=False, imgsz=640)
                except Exception:
                    indian_results = None
            
            for f_idx, (fpath, res) in enumerate(zip(batch_files, results)):
                stats["processed_frames"] += 1
                frame = cv2.imread(fpath)
                if frame is None:
                    continue
                    
                h_img, w_img = frame.shape[:2]
                label_lines = []
                used_boxes = []
                
                # Ingest COCO detections mapped through heuristics
                if res.boxes is not None and len(res.boxes) > 0:
                    for box in res.boxes:
                        coco_cls = int(box.cls[0])
                        c_conf = float(box.conf[0])
                        target_cid = map_coco_to_10class(coco_cls, frame, box, c_conf)
                        
                        if target_cid is not None:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            bw = x2 - x1
                            bh = y2 - y1
                            
                            cx = (x1 + bw / 2.0) / float(w_img)
                            cy = (y1 + bh / 2.0) / float(h_img)
                            nw = float(bw) / float(w_img)
                            nh = float(bh) / float(h_img)
                            
                            label_lines.append(f"{target_cid} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")
                            used_boxes.append((x1, y1, x2, y2))
                            stats["class_counts"][CLASSES[target_cid]] += 1
                            stats["total_annotations"] += 1
                
                # Ingest Indian teacher detections (especially for autos and two-wheelers missed by COCO)
                if indian_results and f_idx < len(indian_results):
                    ires = indian_results[f_idx]
                    if ires.boxes is not None and len(ires.boxes) > 0:
                        for box in ires.boxes:
                            icls = int(box.cls[0])
                            iconf = float(box.conf[0])
                            ix1, iy1, ix2, iy2 = map(int, box.xyxy[0])
                            
                            # Check overlap with existing boxes
                            is_overlap = False
                            for (ux1, uy1, ux2, uy2) in used_boxes:
                                inter_x1 = max(ix1, ux1)
                                inter_y1 = max(iy1, uy1)
                                inter_x2 = min(ix2, ux2)
                                inter_y2 = min(iy2, uy2)
                                if inter_x1 < inter_x2 and inter_y1 < inter_y2:
                                    inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
                                    box_area = (ix2 - ix1) * (iy2 - iy1)
                                    if inter_area / float(max(1, box_area)) > 0.45:
                                        is_overlap = True
                                        break
                                        
                            if not is_overlap:
                                # Map Indian model classes:
                                # {0: 'car', 1: 'auto', 2: 'passenger_vehicle', 3: 'goods_vehicle', 4: 'two_wheeler', 5: 'pedestrian', 6: 'others'}
                                target_cid = None
                                if icls == 1: target_cid = 8       # auto_rickshaw
                                elif icls == 4: target_cid = 2     # two_wheeler
                                elif icls == 5: target_cid = 0     # pedestrian
                                elif icls == 3 and iconf > 0.55: target_cid = 6 # truck
                                elif icls == 2 and iconf > 0.55: target_cid = 7 # bus
                                
                                if target_cid is not None:
                                    ibw = ix2 - ix1
                                    ibh = iy2 - iy1
                                    icx = (ix1 + ibw / 2.0) / float(w_img)
                                    icy = (iy1 + ibh / 2.0) / float(h_img)
                                    inw = float(ibw) / float(w_img)
                                    inh = float(ibh) / float(h_img)
                                    label_lines.append(f"{target_cid} {icx:.6f} {icy:.6f} {inw:.6f} {inh:.6f}")
                                    stats["class_counts"][CLASSES[target_cid]] += 1
                                    stats["total_annotations"] += 1
                
                # Save labeled frame if it has valid detections
                if len(label_lines) >= 1:
                    split = "val" if random.random() < 0.15 else "train"
                    fname = os.path.basename(fpath)
                    base = os.path.splitext(fname)[0]
                    dst_img = os.path.join(TARGET_DATASET_DIR, "images", split, f"cctv_{fname}")
                    dst_lbl = os.path.join(TARGET_DATASET_DIR, "labels", split, f"cctv_{base}.txt")
                    
                    cv2.imwrite(dst_img, frame)
                    with open(dst_lbl, "w") as f:
                        f.write("\n".join(label_lines) + "\n")
                    stats["saved_images"] += 1

    # ──────────────────────────────────────────────────────────────────────────
    # PHASE 3: SUMMARY & PACKAGING INTO KAGGLE / COLAB ZIP
    # ──────────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 75)
    print("📊 DATASET GENERATION SUMMARY")
    print("=" * 75)
    print(f"📁 Total Images Saved: {stats['saved_images']}")
    print(f"🏷️ Total Bounding Boxes: {stats['total_annotations']}")
    print("\n📈 10-Class Distribution:")
    for cname, count in stats["class_counts"].items():
        pct = (count / max(1, stats["total_annotations"])) * 100.0
        bar = "█" * int(pct / 2.5)
        print(f"  {cname.ljust(18)} : {str(count).rjust(6)} ({pct:5.1f}%) {bar}")
        
    print(f"\n📦 Packaging Scaled Dataset into {OUTPUT_ZIP}...")
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(TARGET_DATASET_DIR):
            for f in files:
                abs_path = os.path.join(root, f)
                rel_path = os.path.relpath(abs_path, BASE_DIR)
                zf.write(abs_path, rel_path)
                
    zip_size_mb = os.path.getsize(OUTPUT_ZIP) / (1024 * 1024)
    print(f"🎉 Successfully created {OUTPUT_ZIP} ({zip_size_mb:.1f} MB) ready for Colab / Kaggle training!")

if __name__ == "__main__":
    run_pipeline()
