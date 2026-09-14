"""
IIT Hyderabad IDD (India Driving Dataset) Ingestion Engine
=========================================================
Extracts verified Indian road frames from the official IIIT Hyderabad AutoNUE
dataset (IDD Detection), specifically targeting rare classes:
- Class 6: truck/tempo
- Class 7: bus
- Class 8: auto_rickshaw
- Class 9: others (vehicle fallback)
- Class 2: two_wheeler (motorcycle)
- Class 1: car
- Class 0: pedestrian & rider

Converts COCO [xmin, ymin, w, h] to normalized YOLO [cls_id, xc, yc, w, h]
and merges into datasets/manual_annotated_gujarat/ for immediate training
and visual verification in the Annotation Studio.
"""

import os
import sys
import io
import time
import numpy as np
import cv2
import pyarrow.parquet as pq
import fsspec

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "datasets", "manual_annotated_gujarat")
TRAIN_IMG_DIR = os.path.join(DATASET_DIR, "images", "train")
TRAIN_LBL_DIR = os.path.join(DATASET_DIR, "labels", "train")

# IDD to Sentinel 10-Class Taxonomy Mapping
# IDD Classes: 0: traffic sign, 1: motorcycle, 2: car, 3: rider, 4: person, 5: truck, 6: autorickshaw, 7: vehicle fallback, 8: bus
IDD_TO_SENTINEL = {
    1: 2,  # motorcycle -> two_wheeler
    2: 1,  # car -> car
    3: 0,  # rider -> pedestrian
    4: 0,  # person -> pedestrian
    5: 6,  # truck -> truck/tempo (PRIMARY TARGET)
    6: 8,  # autorickshaw -> auto_rickshaw
    7: 6,  # vehicle fallback (tempo/commercial goods) -> truck/tempo
    8: 7,  # bus -> bus
}

PARQUET_URL = "https://huggingface.co/datasets/izzako/IDD_Detection_CPPE5/resolve/main/data/train-00000-of-00034.parquet"

def ingest_idd(max_frames=200):
    print("=" * 70, flush=True)
    print("🇮🇳 INGESTING IIT HYDERABAD (IDD) DATASET — TRUCK/TEMPO & HEAVY VEHICLES", flush=True)
    print("=" * 70, flush=True)
    
    os.makedirs(TRAIN_IMG_DIR, exist_ok=True)
    os.makedirs(TRAIN_LBL_DIR, exist_ok=True)
    
    print(f"📡 Connecting to IDD stream: {PARQUET_URL}", flush=True)
    fs, path = fsspec.core.url_to_fs(PARQUET_URL, headers={"User-Agent": "Mozilla/5.0"})
    
    total_added = 0
    box_stats = {6: 0, 7: 0, 8: 0, 1: 0, 2: 0, 0: 0, 9: 0}
    
    start_time = time.time()
    
    with fs.open(path, "rb") as f:
        pf = pq.ParquetFile(f)
        num_rg = pf.num_row_groups
        print(f"📦 IDD Parquet loaded: {num_rg} row groups available.", flush=True)
        
        for rg_idx in range(min(num_rg, 4)):
            if total_added >= max_frames:
                break
                
            print(f"⏳ Reading Row Group {rg_idx + 1}/{min(num_rg, 4)}...", flush=True)
            rg = pf.read_row_group(rg_idx)
            rows = rg.to_pylist()
            
            for row in rows:
                if total_added >= max_frames:
                    break
                    
                raw_cats = row.get("objects", {}).get("category", [])
                raw_bboxes = row.get("objects", {}).get("bbox", [])
                
                # Filter: specifically pick frames with trucks (5), vehicle fallback/tempo (7), buses (8), or autorickshaws (6)
                if not (5 in raw_cats or 7 in raw_cats or 8 in raw_cats or 6 in raw_cats):
                    continue
                
                img_bytes = row.get("image", {}).get("bytes")
                if not img_bytes:
                    continue
                
                # Decode image to verify validity and extract dimensions
                img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
                if img is None:
                    continue
                    
                h_img, w_img = img.shape[:2]
                if h_img <= 0 or w_img <= 0:
                    continue
                
                yolo_lines = []
                has_target_vehicle = False
                
                for cat, bbox in zip(raw_cats, raw_bboxes):
                    if cat not in IDD_TO_SENTINEL:
                        continue
                        
                    sentinel_cls = IDD_TO_SENTINEL[cat]
                    xmin, ymin, bw, bh = bbox
                    
                    # Sanity check bbox
                    if bw < 5 or bh < 5:
                        continue
                    
                    # Normalized center x, center y, width, height
                    xc = max(0.001, min(0.999, (xmin + bw / 2.0) / w_img))
                    yc = max(0.001, min(0.999, (ymin + bh / 2.0) / h_img))
                    nw = max(0.001, min(1.0, bw / w_img))
                    nh = max(0.001, min(1.0, bh / h_img))
                    
                    yolo_lines.append(f"{sentinel_cls} {xc:.6f} {yc:.6f} {nw:.6f} {nh:.6f}")
                    box_stats[sentinel_cls] = box_stats.get(sentinel_cls, 0) + 1
                    
                    if sentinel_cls in (6, 7, 8):
                        has_target_vehicle = True
                
                if not yolo_lines or not has_target_vehicle:
                    continue
                
                # File naming
                raw_name = row.get("filename", f"idd_frame_{total_added:04d}")
                clean_name = raw_name.replace("/", "_").replace("\\", "_").replace(" ", "_")
                base_id = f"idd_{clean_name}"
                
                img_dest = os.path.join(TRAIN_IMG_DIR, f"{base_id}.jpg")
                lbl_dest = os.path.join(TRAIN_LBL_DIR, f"{base_id}.txt")
                
                # Write image directly from original bytes
                with open(img_dest, "wb") as img_fp:
                    img_fp.write(img_bytes)
                
                # Write YOLO annotations
                with open(lbl_dest, "w") as lbl_fp:
                    lbl_fp.write("\n".join(yolo_lines) + "\n")
                
                total_added += 1
                if total_added % 25 == 0 or total_added == max_frames:
                    elapsed = time.time() - start_time
                    print(f"  ⚡ Ingested {total_added}/{max_frames} frames ({elapsed:.1f}s) — trucks/tempos: {box_stats[6]}, buses: {box_stats[7]}, auto-rickshaws: {box_stats[8]}", flush=True)

    print("\n" + "=" * 70, flush=True)
    print(f"✅ IIT HYDERABAD (IDD) INGESTION COMPLETE! Added {total_added} frames.", flush=True)
    print("📊 Bounding Boxes Added to Training Set:", flush=True)
    print(f"  • 🚚 Truck / Tempo (Class 6): {box_stats[6]} new annotations", flush=True)
    print(f"  • 🚌 Bus (Class 7):           {box_stats[7]} new annotations", flush=True)
    print(f"  • 🛺 Auto-Rickshaw (Class 8):  {box_stats[8]} new annotations", flush=True)
    print(f"  • 🚗 Car (Class 1):            {box_stats[1]} new annotations", flush=True)
    print(f"  • 🏍️ Two-Wheeler (Class 2):    {box_stats[2]} new annotations", flush=True)
    print(f"  • 🚶 Pedestrian (Class 0):     {box_stats[0]} new annotations", flush=True)
    print("=" * 70, flush=True)

if __name__ == "__main__":
    count = 200
    if len(sys.argv) > 1:
        count = int(sys.argv[1])
    ingest_idd(max_frames=count)
