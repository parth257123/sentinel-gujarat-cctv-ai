"""
Sentinel Gujarat CCTV — 10-Class Indian Traffic Training Script for Kaggle
===========================================================================
Paste this entire script into a Kaggle Notebook cell with GPU enabled (GPU T4 x2 or P100).

Dataset Classes:
  0: pedestrian
  1: car
  2: two_wheeler
  3: heavy_machinery
  4: emergency_vehicle
  5: van
  6: truck/tempo
  7: bus
  8: auto_rickshaw
  9: others
"""

import os
import glob
import shutil
import zipfile
import torch

print("=" * 70)
print("🚀 SENTINEL GUJARAT CCTV — KAGGLE GPU MODEL TRAINING PIPELINE")
print("=" * 70)

# 1. GPU Check
print(f"PyTorch Version : {torch.__version__}")
if torch.cuda.is_available():
    device_name = torch.cuda.get_device_name(0)
    device_count = torch.cuda.device_count()
    print(f"✅ GPU Detected: {device_name} (Total GPUs: {device_count})")
else:
    print("⚠️ WARNING: No GPU detected! Please enable GPU in Kaggle Notebook settings (Accelerator -> GPU T4 x2).")

# 2. Install / Upgrade Ultralytics
print("\n📦 Ensuring Ultralytics YOLO is installed...")
os.system("pip install -q --upgrade ultralytics albumentations")

from ultralytics import YOLO

# 3. Locate or Extract Dataset
DATA_DIR = "/kaggle/working/dataset"
os.makedirs(DATA_DIR, exist_ok=True)

# Check if dataset is mounted from Kaggle Input or uploaded as ZIP
input_candidates = glob.glob("/kaggle/input/**/data.yaml", recursive=True)
zip_candidates = glob.glob("/kaggle/input/**/*.zip", recursive=True) + glob.glob("/kaggle/working/*.zip")

yaml_path = None

if input_candidates:
    # Mounted Kaggle Dataset
    yaml_path = input_candidates[0]
    print(f"📂 Found mounted dataset at: {os.path.dirname(yaml_path)}")
elif zip_candidates:
    # Unpack ZIP archive
    zip_path = zip_candidates[0]
    print(f"📦 Extracting ZIP dataset: {zip_path} -> {DATA_DIR}...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(DATA_DIR)
    yaml_path = os.path.join(DATA_DIR, "data.yaml")
else:
    # Look directly in working directory
    if os.path.exists(os.path.join(DATA_DIR, "data.yaml")):
        yaml_path = os.path.join(DATA_DIR, "data.yaml")
    else:
        raise FileNotFoundError("Could not find data.yaml or dataset ZIP in /kaggle/input or /kaggle/working!")

# Ensure data.yaml path is absolute for Kaggle training
import yaml
with open(yaml_path, "r") as f:
    cfg = yaml.safe_load(f)

dataset_root = os.path.dirname(os.path.abspath(yaml_path))
cfg["path"] = dataset_root
cfg["train"] = "images/train"
cfg["val"] = "images/val"

with open(yaml_path, "w") as f:
    yaml.dump(cfg, f, sort_keys=False)

print(f"✅ Verified data.yaml ({cfg['nc']} classes):")
for cid, cname in cfg.get("names", {}).items():
    print(f"   Class {cid}: {cname}")

# 4. Initialize YOLO Model
# We recommend YOLO11m or YOLO11s for state-of-the-art accuracy on dense Indian traffic
MODEL_VARIANT = "yolo11m.pt"  # Options: yolo11s.pt, yolo11m.pt, yolo11x.pt, yolov8m.pt
print(f"\n🧠 Loading base architecture: {MODEL_VARIANT}...")
model = YOLO(MODEL_VARIANT)

# 5. Start Training with Production Hyperparameters
print("\n🔥 Commencing 10-Class Fine-Tuning...")
results = model.train(
    data=yaml_path,
    epochs=60,                  # 50-60 epochs is optimal for 9,800 frames
    imgsz=640,                  # Use 640 (or 1024 if high-memory GPU available)
    batch=32 if torch.cuda.device_count() >= 2 else 16,
    device=0 if torch.cuda.is_available() else "cpu",
    workers=4,
    optimizer="AdamW",
    lr0=0.001,
    lrf=0.01,
    weight_decay=0.0005,
    warmup_epochs=3.0,
    # Indian Traffic Augmentation & Imbalance Tuning:
    mosaic=1.0,                 # Handles extreme clustering of bikes and rickshaws
    mixup=0.15,                 # Improves generalization on overlapping vehicles
    close_mosaic=10,            # Sharp boundary refinement in the final 10 epochs
    save=True,
    save_period=10,
    plots=True,
    project="/kaggle/working/sentinel_run",
    name="sentinel_10class_gujarat"
)

# 6. Evaluate Model on Validation Split
print("\n📊 Evaluating Best Model on Validation Benchmark...")
best_weights = "/kaggle/working/sentinel_run/sentinel_10class_gujarat/weights/best.pt"
if os.path.exists(best_weights):
    eval_model = YOLO(best_weights)
    metrics = eval_model.val(data=yaml_path, imgsz=640)
    print(f"\n🎯 Overall mAP@50: {metrics.box.map50:.4f}")
    print(f"🎯 Overall mAP@50-95: {metrics.box.map:.4f}")

    # Copy best weights to working root for 1-click download
    final_output = "/kaggle/working/sentinel_indian_traffic_best.pt"
    shutil.copy(best_weights, final_output)
    print(f"\n🏆 Best Model saved to: {final_output}")
    print("👉 In Kaggle, click 'Output' in the right sidebar to download 'sentinel_indian_traffic_best.pt'!")
else:
    print("Training finished. Check runs directory for checkpoints.")
