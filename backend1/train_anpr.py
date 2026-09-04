"""
Fine-Tuning YOLOv8 on Indian License Plates (HSRP & Commercial)
Hardware: Apple M4 Pro GPU (MPS Acceleration)
Dataset: 362 train images, 39 validation images
"""

import os
import shutil
import torch
from ultralytics import YOLO

def train():
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"[Training] Using compute device: {device} (Apple Silicon GPU)")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_yaml = os.path.join(base_dir, "data.yaml")
    project_dir = os.path.join(base_dir, "runs", "detect")
    
    # Load base model for transfer learning
    model = YOLO("yolov8n.pt")
    
    print("[Training] Commencing transfer learning on Indian license plates...")
    results = model.train(
        data=data_yaml,
        epochs=20,
        imgsz=640,
        batch=16,
        device=device,
        project=project_dir,
        name="indian_plate_model",
        exist_ok=True,
        workers=2,
        optimizer="AdamW",
        lr0=0.001,
        verbose=True,
    )
    
    best_weights = os.path.join(project_dir, "indian_plate_model", "weights", "best.pt")
    target_weights_dir = os.path.join(base_dir, "models")
    os.makedirs(target_weights_dir, exist_ok=True)
    target_weights = os.path.join(target_weights_dir, "indian_plate_best.pt")
    
    if os.path.exists(best_weights):
        shutil.copy2(best_weights, target_weights)
        print(f"[Training Complete] Successfully saved fine-tuned model to: {target_weights}")
    else:
        print(f"[Warning] Best weights not found at {best_weights}")
        
    print("[Validation] Evaluating fine-tuned model on validation set...")
    metrics = model.val()
    print(f"mAP@50: {metrics.box.map50:.4f}")
    print(f"mAP@50-95: {metrics.box.map:.4f}")

if __name__ == "__main__":
    train()
