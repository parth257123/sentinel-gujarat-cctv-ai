import os
import shutil
import torch
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_YAML = os.path.join(BASE_DIR, "datasets", "indian_traffic", "data.yaml")
MODELS_DIR = os.path.join(BASE_DIR, "models")
RUNS_DIR = os.path.join(BASE_DIR, "runs", "train_apple_silicon")

def train_on_mac():
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print("==================================================")
    print("🚀 SENTINEL — APPLE SILICON LOCAL GPU TRAINING")
    print("==================================================")
    print(f"⚡ Hardware Accelerator: {device.upper()} (Apple Silicon Metal GPU)")
    print(f"📁 Dataset Config: {DATA_YAML}")
    print(f"💾 Checkpoints Output: {RUNS_DIR}\n")
    
    # Load base YOLOv12 architecture
    base_model_path = os.path.join(BASE_DIR, "yolo12s.pt")
    if not os.path.exists(base_model_path):
        base_model_path = "yolo12s.pt"
        
    model = YOLO(base_model_path)
    
    print("🚀 Launching High-Precision Training on Apple Silicon GPU...")
    results = model.train(
        data=DATA_YAML,
        epochs=60,
        imgsz=960,          # High-Res 960px tuned for Apple Silicon MPS
        batch=8,            # Optimized for unified memory
        workers=2,
        device=device,
        optimizer="AdamW",
        lr0=0.0015,
        lrf=0.01,
        weight_decay=0.001,
        warmup_epochs=3,
        cos_lr=True,
        box=8.5,            # Small-object boundary precision
        cls=1.5,            # Small-object classification priority
        dfl=1.8,
        mosaic=1.0,
        mixup=0.20,
        scale=0.75,         # Heavy scale jitter for microscopic bikes and distant cars
        degrees=10.0,
        hsv_h=0.02,
        hsv_s=0.7,
        hsv_v=0.4,
        fliplr=0.5,
        project=RUNS_DIR,
        name="indian_traffic_m4pro",
        exist_ok=True,
        verbose=True
    )
    
    # Deploy trained weights to Sentinel models directory
    best_weights = os.path.join(RUNS_DIR, "indian_traffic_m4pro", "weights", "best.pt")
    if os.path.exists(best_weights):
        dest_1 = os.path.join(MODELS_DIR, "indian_traffic_yolo12_twowheeler_best.pt")
        dest_2 = os.path.join(MODELS_DIR, "indian_traffic_yolo12_best.pt")
        
        shutil.copy(best_weights, dest_1)
        shutil.copy(best_weights, dest_2)
        
        size_mb = os.path.getsize(dest_1) / (1024 * 1024)
        print(f"\n==================================================")
        print(f"🎉 LOCAL TRAINING COMPLETE & DEPLOYED!")
        print(f"==================================================")
        print(f"✅ Deployed: {dest_1} ({size_mb:.1f} MB)")
        print(f"✅ Deployed: {dest_2} ({size_mb:.1f} MB)")
        print(f"🚀 Sentinel will automatically run these weights live on your CCTV feeds!")
    else:
        print("⚠️ Checkpoint file not found in runs directory.")

if __name__ == "__main__":
    train_on_mac()
