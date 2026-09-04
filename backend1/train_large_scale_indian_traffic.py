import os
import sys
import glob
import json
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from torch.utils.data import Dataset, DataLoader
from PIL import Image
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATASET_DIR = os.path.join(BASE_DIR, "datasets", "indian_traffic")

os.makedirs(MODELS_DIR, exist_ok=True)

def train_large_scale_yolo():
    """Trains 100% offline open-source YOLOv12 on multi-camera Indian traffic dataset."""
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"🚀 Starting Large-Scale Open-Source Indian Traffic YOLOv12 Training on {device}...")
    
    yaml_path = os.path.join(DATASET_DIR, "data.yaml")
    if not os.path.exists(yaml_path):
        print(f"Error: {yaml_path} not found. Please generate dataset first.")
        return
        
    model = YOLO("yolo12n.pt")
    
    results = model.train(
        data=yaml_path,
        epochs=30,
        imgsz=640,
        batch=16,
        device=device,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        weight_decay=0.0005,
        mosaic=1.0,
        mixup=0.15,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        fliplr=0.5,
        project=os.path.join(BASE_DIR, "runs", "train"),
        name="large_scale_indian_traffic",
        exist_ok=True
    )
    
    best_pt = os.path.join(BASE_DIR, "runs", "train", "large_scale_indian_traffic", "weights", "best.pt")
    target_pt = os.path.join(MODELS_DIR, "indian_traffic_yolo12_best.pt")
    if os.path.exists(best_pt):
        import shutil
        shutil.copy(best_pt, target_pt)
        print(f"🎉 Saved trained open-source model to: {target_pt}")

if __name__ == "__main__":
    train_large_scale_yolo()
