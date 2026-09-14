"""
Sentinel Production High-Accuracy Training Pipeline
==================================================
Tuned for maximum mAP and real-time inference on Gujarat CCTV feeds.
- Base: YOLO11s (State-of-the-art C3k2 + dynamic head)
- Dataset: sentinel_10class_gujarat_dataset (4,054 frames, 10 standardized classes)
- Accelerator: Apple Silicon Metal Performance Shaders (MPS)
- Target Output: backend1/models/sentinel_10class_traffic_best.pt
"""

import os
import sys
import shutil
import time
import torch
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
DATA_YAML = os.path.join(BASE_DIR, "datasets", "sentinel_10class_gujarat_dataset", "data.yaml")
MODELS_DIR = os.path.join(BASE_DIR, "models")
PROJECT_RUNS = os.path.join(BASE_DIR, "runs", "train")
RUN_NAME = "sentinel_production_yolo11s"

def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(PROJECT_RUNS, exist_ok=True)
    
    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    
    print("=" * 75)
    print("🎯 SENTINEL HIGH-PRECISION PRODUCTION AI TRAINING")
    print("=" * 75)
    print(f"⚡ Hardware Accelerator: {device.upper()} ({'Apple Silicon Metal GPU' if device == 'mps' else 'CUDA GPU' if device == 'cuda' else 'CPU'})")
    print(f"📊 Dataset: {DATA_YAML}")
    print(f"📦 Base Architecture: YOLO11s (yolo11s.pt)")
    print(f"🔄 Epochs: 40 | Batch: 16 | Resolution: 640px | Patience: 10")
    print(f"💾 Checkpoints Output: {os.path.join(PROJECT_RUNS, RUN_NAME)}\n")
    
    base_model = os.path.join(ROOT_DIR, "yolo11s.pt")
    if not os.path.exists(base_model):
        base_model = os.path.join(BASE_DIR, "yolo11s.pt")
    if not os.path.exists(base_model):
        base_model = "yolo11s.pt"
        
    print(f"Loading base weights from: {base_model}")
    model = YOLO(base_model)
    
    start_time = time.time()
    
    results = model.train(
        data=DATA_YAML,
        epochs=40,
        imgsz=640,
        batch=16,
        workers=2,
        device=device,
        optimizer="AdamW",
        lr0=0.0015,
        lrf=0.01,
        weight_decay=0.0005,
        warmup_epochs=3,
        cos_lr=True,
        # Enhanced augmentations for Indian traffic diversity & density
        mosaic=1.0,
        mixup=0.15,
        scale=0.40,
        degrees=5.0,
        translate=0.10,
        hsv_h=0.015,
        hsv_s=0.6,
        hsv_v=0.4,
        fliplr=0.5,
        iou=0.5,
        project=PROJECT_RUNS,
        name=RUN_NAME,
        exist_ok=True,
        verbose=True,
        patience=10,
        save=True
    )
    
    elapsed = (time.time() - start_time) / 60.0
    print(f"\n✅ Training completed in {elapsed:.2f} minutes!")
    
    # Locate best weights
    best_weights = os.path.join(PROJECT_RUNS, RUN_NAME, "weights", "best.pt")
    last_weights = os.path.join(PROJECT_RUNS, RUN_NAME, "weights", "last.pt")
    target_weights = best_weights if os.path.exists(best_weights) else last_weights
    
    if os.path.exists(target_weights):
        dest_1 = os.path.join(MODELS_DIR, "sentinel_10class_traffic_best.pt")
        dest_2 = os.path.join(MODELS_DIR, "sentinel_indian_traffic_best.pt")
        dest_3 = os.path.join(ROOT_DIR, "GUJARAT_TRAFFIC_AI_MODEL_V3.pt")
        
        shutil.copy(target_weights, dest_1)
        shutil.copy(target_weights, dest_2)
        shutil.copy(target_weights, dest_3)
        
        file_size_mb = os.path.getsize(dest_1) / (1024 * 1024)
        print("=" * 75)
        print("🎉 BEST MODEL DEPLOYED SUCCESSFULLY TO ENGINE!")
        print(f"✅ {dest_1} ({file_size_mb:.2f} MB)")
        print(f"✅ {dest_2} ({file_size_mb:.2f} MB)")
        print(f"✅ {dest_3} ({file_size_mb:.2f} MB)")
        print("=" * 75)
    else:
        print("⚠️ No checkpoint weights found in runs directory.")

if __name__ == "__main__":
    main()
