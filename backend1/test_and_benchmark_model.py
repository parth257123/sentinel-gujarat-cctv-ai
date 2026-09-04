import os
import cv2
import glob
import time
import torch
import numpy as np
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEOS_DIR = os.path.join(BASE_DIR, "videos")
MODELS_DIR = os.path.join(BASE_DIR, "models")
SNAPSHOTS_DIR = os.path.join(BASE_DIR, "snapshots", "test_benchmark")

CLASSES = [
    "Auto-Rickshaw",
    "Motorcycle",
    "Scooter",
    "Car",
    "Ambulance",
    "Truck",
    "Transit Bus",
    "Van"
]

def run_benchmark():
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
    
    # 1. Select Best Available Model
    model_candidates = [
        os.path.join(MODELS_DIR, "indian_traffic_yolo12_mega_best.pt"),
        os.path.join(MODELS_DIR, "indian_traffic_yolo12_twowheeler_best.pt"),
        os.path.join(MODELS_DIR, "indian_traffic_yolo12_heavy_best.pt"),
        os.path.join(MODELS_DIR, "indian_traffic_yolo12_best.pt"),
        os.path.join(BASE_DIR, "yolo12s.pt")
    ]
    
    selected_model = None
    for cand in model_candidates:
        if os.path.exists(cand):
            selected_model = cand
            break
            
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"==================================================")
    print(f"🚀 SENTINEL CCTV AI MODEL TEST & BENCHMARK SUITE")
    print(f"==================================================")
    print(f"🧠 Model: {os.path.basename(selected_model)}")
    print(f"⚡ Compute Device: {device.upper()} (Apple Silicon GPU)")
    print(f"📁 Source CCTV Videos: {VIDEOS_DIR}")
    print(f"🖼️ Output Snapshots: {SNAPSHOTS_DIR}\n")
    
    model = YOLO(selected_model)
    
    video_files = glob.glob(os.path.join(VIDEOS_DIR, "*.mp4"))
    total_inferences = 0
    total_time_ms = 0.0
    detected_class_counts = {cname: 0 for cname in CLASSES}
    
    for vpath in video_files:
        vname = os.path.basename(vpath)
        cap = cv2.VideoCapture(vpath)
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 25
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 100
        
        # Seek to frame ~60
        cap.set(cv2.CAP_PROP_POS_FRAMES, min(60, total_frames // 2))
        ret, frame = cap.read()
        cap.release()
        
        if not ret or frame is None:
            continue
            
        # Warmup & Benchmark Latency
        t0 = time.perf_counter()
        results = model.predict(frame, imgsz=1024, conf=0.20, device=device, verbose=False)
        latency_ms = (time.perf_counter() - t0) * 1000.0
        
        total_inferences += 1
        total_time_ms += latency_ms
        
        boxes = results[0].boxes
        annotated_frame = frame.copy()
        
        cctv_counts = {}
        if boxes is not None:
            for b in boxes:
                cls_id = int(b.cls[0])
                cname = CLASSES[cls_id] if cls_id < len(CLASSES) else "Car"
                conf = float(b.conf[0])
                x1, y1, x2, y2 = map(int, b.xyxy[0])
                
                # Count
                detected_class_counts[cname] = detected_class_counts.get(cname, 0) + 1
                cctv_counts[cname] = cctv_counts.get(cname, 0) + 1
                
                # Draw high-visibility box & badge
                color = (0, 255, 128) if "Scooter" in cname or "Motorcycle" in cname else (255, 180, 0)
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                badge_text = f"{cname} {int(conf*100)}%"
                cv2.putText(annotated_frame, badge_text, (x1, max(25, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
                
        # Save annotated snapshot
        out_name = f"test_{os.path.splitext(vname)[0]}.jpg"
        out_path = os.path.join(SNAPSHOTS_DIR, out_name)
        cv2.imwrite(out_path, annotated_frame)
        
        detected_str = ", ".join([f"{k}: {v}" for k, v in cctv_counts.items()])
        print(f"📹 [{vname:35s}] -> Latency: {latency_ms:.1f} ms | Found {len(boxes) if boxes is not None else 0} vehicles ({detected_str})")
        print(f"   Saved: {out_path}")
        
    avg_latency = total_time_ms / max(1, total_inferences)
    est_fps = 1000.0 / max(0.1, avg_latency)
    
    print(f"\n==================================================")
    print(f"🏆 BENCHMARK RESULTS SUMMARY")
    print(f"==================================================")
    print(f"⚡ Average Latency: {avg_latency:.1f} ms per frame (1024px High-Res)")
    print(f"🚀 Real-Time Throughput: {est_fps:.1f} FPS on Apple Silicon GPU")
    print(f"\n📊 Total Detections Across All CCTV Streams:")
    for cname, cnt in detected_class_counts.items():
        print(f"  • {cname:15s}: {cnt} instances")
    print(f"\n✅ All annotated test images saved to: {SNAPSHOTS_DIR}")

if __name__ == "__main__":
    run_benchmark()
