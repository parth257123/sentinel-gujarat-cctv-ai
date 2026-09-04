"""
Sentinel Gujarat AI Model v2 — Quick Test Script
================================================
Test your newly trained custom Gujarat CCTV model on any image, video, or camera feed.

Usage:
    python test_gujarat_ai.py <optional_path_to_image_or_video>

Examples:
    python test_gujarat_ai.py
    python test_gujarat_ai.py "backend1/datasets/heavyweight_5500_cctv_dataset/daylight_morning_rush/cam01_chimanbhai_bridge_20260904_011020.jpg"
    python test_gujarat_ai.py "backend1/videos/live_highlights/cam01_highlight.mp4"
"""

import sys
import os
from ultralytics import YOLO

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "GUJARAT_TRAFFIC_AI_MODEL_V2.pt")

def run_test():
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Model not found at: {MODEL_PATH}")
        return

    model = YOLO(MODEL_PATH)
    print("=" * 60)
    print("🤖 SENTINEL GUJARAT TRAFFIC AI MODEL V2")
    print("=" * 60)
    print(f"📁 Weights: {MODEL_PATH}")
    print(f"🏷️ Classes ({len(model.names)}): {list(model.names.values())}\n")

    # Pick test image
    if len(sys.argv) > 1:
        source = sys.argv[1]
    else:
        # Default test frame
        source = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend1", "datasets", "manual_annotated_gujarat", "images", "train", "cam01_chimanbhai_bridge_20260904_021209.jpg")

    if not os.path.exists(source):
        print(f"❌ Target image/video not found: {source}")
        return

    print(f"🔍 Running inference on: {os.path.basename(source)} ...")
    results = model.predict(source, conf=0.25, save=True, project="runs/test_predictions", name="demo", exist_ok=True)

    boxes = results[0].boxes
    print(f"\n🎉 Successfully detected {len(boxes)} vehicles/pedestrians!")
    from collections import Counter
    class_counts = Counter(model.names[int(b.cls[0])] for b in boxes)
    for cname, count in class_counts.items():
        print(f"   - {cname}: {count}")

    save_path = os.path.join(results[0].save_dir, os.path.basename(source))
    print(f"\n📸 Annotated visual output saved to:\n   {save_path}")

if __name__ == "__main__":
    run_test()
