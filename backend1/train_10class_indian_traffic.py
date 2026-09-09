"""
Sentinel 10-Class Practical Indian Traffic YOLO Training Script
=============================================================
Fine-tunes open-source YOLO (YOLOv12 / YOLO11 / YOLOv8) on the
standardized 10-class Gujarat Police CCTV dataset.

Hardware Support:
  - Apple Silicon GPU (MPS)
  - NVIDIA GPU (CUDA)
  - CPU Fallback

Classes (10):
  0: pedestrian
  1: car
  2: two_wheeler
  3: heavy_machinery
  4: emergency_vehicle
  5: van
  6: truck
  7: bus
  8: auto_rickshaw
  9: others
"""

import os
import sys
import glob
import json
import yaml
import shutil
import argparse
import torch
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DEFAULT_DATASET_YAML = os.path.join(BASE_DIR, "datasets", "manual_annotated_gujarat", "data.yaml")
FINAL_MODEL_PATH = os.path.join(MODELS_DIR, "sentinel_10class_traffic_best.pt")

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

def parse_args():
    parser = argparse.ArgumentParser(description="Train 10-Class Sentinel Indian Traffic AI")
    parser.add_argument("--data", type=str, default=DEFAULT_DATASET_YAML, help="Path to dataset data.yaml")
    parser.add_argument("--mode", type=str, default="full", choices=["full", "manual_only", "sample"],
                        help="Training subset: 'manual_only' (only frames manually verified by user/friend), 'full' (all frames), 'sample' (benchmark 100 frames)")
    parser.add_argument("--model", type=str, default="yolo12n.pt", help="Base model weights")
    parser.add_argument("--epochs", type=int, default=35, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image input resolution")
    parser.add_argument("--device", type=str, default="", help="Hardware device ('mps', 'cuda', 'cpu')")
    parser.add_argument("--patience", type=int, default=10, help="Early stopping patience")
    return parser.parse_args()

def train():
    args = parse_args()
    os.makedirs(MODELS_DIR, exist_ok=True)
    DATASET_YAML = args.data
    dataset_dir = os.path.dirname(DEFAULT_DATASET_YAML)

    # 1. Handle dataset subset selection
    if args.mode == "sample":
        sample_yaml = os.path.join(os.path.dirname(BASE_DIR), "sample_dataset_10class", "data.yaml")
        if os.path.exists(sample_yaml):
            DATASET_YAML = sample_yaml
            print(f"🎯 Selected mode: sample ({sample_yaml})")
    elif args.mode == "manual_only":
        manifest_path = os.path.join(dataset_dir, "manually_verified_manifest.json")
        verified_bases = set()
        if os.path.exists(manifest_path):
            try:
                with open(manifest_path, "r") as mf:
                    verified_bases = set(json.load(mf).keys())
            except Exception:
                pass

        # Also include user manual backup session if manifest is small
        user_backup_dir = os.path.join(dataset_dir, "labels_backup_user_manual_1to71")
        if os.path.exists(user_backup_dir):
            for f in glob.glob(os.path.join(user_backup_dir, "**", "*.txt"), recursive=True):
                verified_bases.add(os.path.splitext(os.path.basename(f))[0])

        if not verified_bases:
            print("⚠️ No manually verified frames found in manifest! Falling back to full dataset.")
        else:
            # Build train_verified.txt and val_verified.txt
            train_paths = []
            val_paths = []
            for base in sorted(verified_bases):
                for split, p_list in [("train", train_paths), ("val", val_paths)]:
                    lbl_p = os.path.join(dataset_dir, "labels", split, f"{base}.txt")
                    img_p = os.path.join(dataset_dir, "images", split, f"{base}.jpg")
                    if os.path.exists(lbl_p) and os.path.exists(img_p):
                        p_list.append(os.path.abspath(img_p))

            train_txt = os.path.join(dataset_dir, "train_verified.txt")
            val_txt = os.path.join(dataset_dir, "val_verified.txt")
            with open(train_txt, "w") as f:
                f.write("\n".join(train_paths) + "\n")
            with open(val_txt, "w") as f:
                f.write("\n".join(val_paths) + "\n")

            # Create data_manual_verified.yaml
            manual_yaml_path = os.path.join(dataset_dir, "data_manual_verified.yaml")
            manual_yaml_content = {
                "path": dataset_dir,
                "train": "train_verified.txt",
                "val": "val_verified.txt",
                "nc": len(CLASSES),
                "names": {i: name for i, name in enumerate(CLASSES)}
            }
            with open(manual_yaml_path, "w") as f:
                yaml.dump(manual_yaml_content, f, default_flow_style=False)

            DATASET_YAML = manual_yaml_path
            print(f"🎯 Selected mode: manual_only | Train: {len(train_paths)} frames, Val: {len(val_paths)} frames")

    
    if not os.path.exists(DATASET_YAML):
        print(f"❌ Dataset YAML not found at {DATASET_YAML}")
        print("   Please run build_10class_dataset.py first to generate the dataset.")
        sys.exit(1)
        
    device = args.device
    if not device:
        device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
        
    print("=" * 70)
    print("🚀 TRAINING 10-CLASS SENTINEL GUJARAT TRAFFIC AI")
    print("=" * 70)
    print(f"📊 Dataset: {DATASET_YAML}")
    print(f"⚡ Device: {device} ({'Apple Silicon GPU' if device == 'mps' else 'CUDA GPU' if device == 'cuda' else 'CPU'})")
    print(f"📦 Base Model: {args.model}")
    print(f"🔄 Epochs: {args.epochs} | Batch: {args.batch} | ImgSz: {args.imgsz}")
    
    # Locate base model
    base_model_path = os.path.join(BASE_DIR, args.model)
    if not os.path.exists(base_model_path):
        base_model_path = args.model
        
    model = YOLO(base_model_path)
    
    # Run training with augmentations tuned for Gujarat CCTV
    results = model.train(
        data=DATASET_YAML,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=device,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        weight_decay=0.0005,
        warmup_epochs=2,
        # Augmentations for diverse lighting & high density
        mosaic=1.0,
        mixup=0.15,
        hsv_h=0.015,
        hsv_s=0.6,
        hsv_v=0.4,
        degrees=5.0,
        translate=0.1,
        scale=0.35,
        fliplr=0.5,
        iou=0.5,
        project=os.path.join(BASE_DIR, "runs", "train"),
        name="sentinel_10class_gujarat",
        exist_ok=True,
        verbose=True,
        patience=args.patience,
    )
    
    # Copy best weights to models/
    run_dir = os.path.join(BASE_DIR, "runs", "train", "sentinel_10class_gujarat", "weights")
    best_weights = os.path.join(run_dir, "best.pt")
    last_weights = os.path.join(run_dir, "last.pt")
    
    chosen = best_weights if os.path.exists(best_weights) else last_weights
    if os.path.exists(chosen):
        shutil.copy(chosen, FINAL_MODEL_PATH)
        print(f"\n🎉 TRAINING COMPLETED!")
        print(f"📁 Best model saved to: {FINAL_MODEL_PATH}")
        
        # Verify model
        trained = YOLO(FINAL_MODEL_PATH)
        print(f"   Classes ({len(trained.names)}): {trained.names}")
    else:
        print("⚠️ No checkpoint found in weights directory.")

if __name__ == "__main__":
    train()
