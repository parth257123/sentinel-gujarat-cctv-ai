import os
import shutil
import time
import urllib.request
import json
import torch
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_YAML = os.path.join(BASE_DIR, "datasets", "manual_annotated_gujarat", "data.yaml")
MODELS_DIR = os.path.join(BASE_DIR, "models")
RUNS_DIR = os.path.join(BASE_DIR, "runs", "train_active_learning")

def train_active_learning():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(RUNS_DIR, exist_ok=True)

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print("=" * 60)
    print("🚀 SENTINEL ACTIVE LEARNING — FINE-TUNING GUJARAT TRAFFIC MODEL")
    print("=" * 60)
    print(f"⚡ Device: {device.upper()} (Apple Silicon Metal GPU Acceleration)")
    print(f"📁 Dataset: {DATA_YAML}")
    print(f"💾 Checkpoints: {RUNS_DIR}\n")

    # Load base architecture (YOLOv11 Small)
    base_model_path = os.path.join(os.path.dirname(BASE_DIR), "yolo11s.pt")
    if not os.path.exists(base_model_path):
        base_model_path = "yolo11s.pt"

    print(f"📦 Loading base model: {base_model_path}")
    model = YOLO(base_model_path)

    start_time = time.time()
    print("🚀 Starting training for 40 epochs...")
    results = model.train(
        data=DATA_YAML,
        epochs=40,
        imgsz=640,
        batch=8,
        device=device,
        workers=2,
        optimizer="AdamW",
        lr0=0.002,
        lrf=0.01,
        weight_decay=0.0005,
        warmup_epochs=2,
        box=7.5,
        cls=1.5,
        dfl=1.5,
        project=RUNS_DIR,
        name="gujarat_active_v1",
        exist_ok=True,
        verbose=True
    )

    elapsed = time.time() - start_time
    print(f"\n⏱️ Training finished in {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)!")

    # Locate best weights
    best_weights = os.path.join(RUNS_DIR, "gujarat_active_v1", "weights", "best.pt")
    if os.path.exists(best_weights):
        target_model_path = os.path.join(MODELS_DIR, "sentinel_indian_traffic_best.pt")
        backup_model_path = os.path.join(MODELS_DIR, "sentinel_indian_traffic_best_backup_v1.pt")

        if os.path.exists(target_model_path) and not os.path.exists(backup_model_path):
            shutil.copy(target_model_path, backup_model_path)
            print(f"📦 Backed up previous weights to {os.path.basename(backup_model_path)}")

        # Deploy newly fine-tuned weights
        shutil.copy(best_weights, target_model_path)
        size_mb = os.path.getsize(target_model_path) / (1024 * 1024)
        print("=" * 60)
        print("🎉 SUCCESS! NEW GUJARAT TRAFFIC WEIGHTS DEPLOYED!")
        print("=" * 60)
        print(f"✅ Deployed: {target_model_path} ({size_mb:.1f} MB)")

        # Hot reload into active FastAPI backend
        try:
            req = urllib.request.Request("http://localhost:8000/api/annotation/reload_model", data=b"{}", headers={"Content-Type": "application/json"})
            resp = urllib.request.urlopen(req, timeout=5)
            print("🔄 AI Pre-Annotate engine HOT-RELOADED in running server!")
        except Exception as e:
            print(f"ℹ️ Backend hot-reload note: {e}")

        print("⚡ Now, clicking 'AI Pre-Annotate' in the web studio will use YOUR newly trained model!")
    else:
        print("⚠️ Checkpoint file not found in runs directory.")

if __name__ == "__main__":
    train_active_learning()
