import os
import torch
import shutil
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_MODELS_DIR = os.path.join(BASE_DIR, "models")

# Priority: use live RTSP dataset if available, fallback to old dataset
LIVE_DATASET_YAML = os.path.join(BASE_DIR, "datasets", "indian_traffic_live", "data.yaml")
OLD_DATASET_YAML = os.path.join(BASE_DIR, "datasets", "indian_traffic", "data.yaml")
DATASET_YAML = LIVE_DATASET_YAML if os.path.exists(LIVE_DATASET_YAML) else OLD_DATASET_YAML

FINAL_MODEL_PATH = os.path.join(OUTPUT_MODELS_DIR, "indian_traffic_live_10class_best.pt")
BACKUP_MODEL_PATH = os.path.join(OUTPUT_MODELS_DIR, "indian_traffic_yolo12_best.pt")

def train():
    os.makedirs(OUTPUT_MODELS_DIR, exist_ok=True)
    
    # Verify dataset exists
    if not os.path.exists(DATASET_YAML):
        print(f"❌ Dataset YAML not found at {DATASET_YAML}")
        print("   Run capture_live_dataset.py first to build the dataset from live CCTV feeds.")
        return
    
    print(f"📊 Using dataset: {DATASET_YAML}")
        
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"⚡ Training device: {device} (Apple Silicon GPU)")
    
    # Load base YOLOv12s model (small, better than nano for accuracy)
    base_model_path = os.path.join(BASE_DIR, "yolo12n.pt")
    if not os.path.exists(base_model_path):
        base_model_path = "yolo12n.pt"
        
    model = YOLO(base_model_path)
    
    # Train for 10-class Indian Traffic Detection
    # Classes: auto_rickshaw, motorcycle, scooter, car, ambulance,
    #          truck, bus, van, pedestrian, emergency_vehicle
    results = model.train(
        data=DATASET_YAML,
        epochs=35,
        imgsz=640,
        batch=8,
        device=device,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        weight_decay=0.0005,
        warmup_epochs=2,
        mosaic=1.0,
        mixup=0.1,
        degrees=5.0,
        translate=0.1,
        scale=0.4,
        fliplr=0.5,
        iou=0.5,
        project=os.path.join(BASE_DIR, "runs", "train"),
        name="indian_traffic_live_yolo12",
        exist_ok=True,
        verbose=True,
        patience=10,
    )
    
    # Locate best.pt and copy to models/
    best_weights = os.path.join(BASE_DIR, "runs", "train", "indian_traffic_live_yolo12", "weights", "best.pt")
    if os.path.exists(best_weights):
        shutil.copy(best_weights, FINAL_MODEL_PATH)
        shutil.copy(best_weights, BACKUP_MODEL_PATH)
        print(f"\n🎉 TRAINING COMPLETE! Best model saved to: {FINAL_MODEL_PATH}")
        
        # Verify the trained model
        trained = YOLO(FINAL_MODEL_PATH)
        print(f"   Classes: {trained.names}")
        print(f"   Number of classes: {len(trained.names)}")
    else:
        last_weights = os.path.join(BASE_DIR, "runs", "train", "indian_traffic_live_yolo12", "weights", "last.pt")
        if os.path.exists(last_weights):
            shutil.copy(last_weights, FINAL_MODEL_PATH)
            shutil.copy(last_weights, BACKUP_MODEL_PATH)
            print(f"\n🎉 TRAINING COMPLETE! Last checkpoint saved to: {FINAL_MODEL_PATH}")

if __name__ == "__main__":
    train()
