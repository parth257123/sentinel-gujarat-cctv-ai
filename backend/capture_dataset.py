import asyncio
import os
import cv2
import time
import random
from sentinel_grid import SentinelGridClient, stream_latest_frames
from anpr_engine import ANPREngine

# Configuration
DATASET_DIR = "/Users/parthlodaya/solar /backend/dataset"
MAX_FRAMES = 10
SAMPLE_INTERVAL = 3.0  # seconds between captures per stream
VAL_SPLIT = 0.15

def setup_directories():
    os.makedirs(os.path.join(DATASET_DIR, "images", "train"), exist_ok=True)
    os.makedirs(os.path.join(DATASET_DIR, "images", "val"), exist_ok=True)
    os.makedirs(os.path.join(DATASET_DIR, "labels", "train"), exist_ok=True)
    os.makedirs(os.path.join(DATASET_DIR, "labels", "val"), exist_ok=True)

def generate_yolo_label(detections, img_width, img_height):
    lines = []
    for det in detections:
        x1, y1, x2, y2 = det.get("bbox", [0, 0, 0, 0])
        # YOLO format: class x_center y_center width height (normalized)
        w = x2 - x1
        h = y2 - y1
        x_c = x1 + w / 2
        y_c = y1 + h / 2
        
        nx_c = max(0, min(1.0, x_c / img_width))
        ny_c = max(0, min(1.0, y_c / img_height))
        nw = max(0, min(1.0, w / img_width))
        nh = max(0, min(1.0, h / img_height))
        
        # class 0 is 'license_plate'
        lines.append(f"0 {nx_c:.6f} {ny_c:.6f} {nw:.6f} {nh:.6f}")
    return "\n".join(lines)

async def capture_dataset():
    print("[Dataset Capture] Initializing grid client and stream harvesters...")
    grid_client = SentinelGridClient()
    grid_client.fetch_catalogue()
    await grid_client.start_stream_harvesters()
    
    print("[Dataset Capture] Initializing ANPR Engine for pseudo-labeling...")
    anpr = ANPREngine()
    
    setup_directories()
    
    frames_collected = 0
    last_capture = {sid: 0 for sid in stream_latest_frames}
    
    # Wait for streams to initialize
    await asyncio.sleep(5)
    
    print(f"[Dataset Capture] Starting capture. Target: {MAX_FRAMES} frames.")
    
    while frames_collected < MAX_FRAMES:
        now = time.time()
        for sid, frame in stream_latest_frames.items():
            if frame is None:
                continue
                
            if (now - last_capture.get(sid, 0)) >= SAMPLE_INTERVAL:
                last_capture[sid] = now
                
                # Detect vehicles and plates to generate pseudo-labels
                detections = anpr.process_frame(frame, camera_id=f"CAM-TMP-{sid}")
                
                # We only save frames that have at least one vehicle detection to ensure useful data
                # Even if no plate is detected, it's a good hard negative or manual labeling target.
                
                img_h, img_w = frame.shape[:2]
                label_txt = generate_yolo_label(detections, img_w, img_h)
                
                # Determine train/val split
                subset = "val" if random.random() < VAL_SPLIT else "train"
                
                timestamp_str = str(int(now * 1000))
                base_name = f"cctv_{sid}_{timestamp_str}"
                img_path = os.path.join(DATASET_DIR, "images", subset, f"{base_name}.jpg")
                lbl_path = os.path.join(DATASET_DIR, "labels", subset, f"{base_name}.txt")
                
                # Save image and label
                cv2.imwrite(img_path, frame)
                with open(lbl_path, "w") as f:
                    f.write(label_txt)
                
                frames_collected += 1
                plates_found = len(detections)
                print(f"[{frames_collected}/{MAX_FRAMES}] Captured {base_name} ({subset}) - Plates found: {plates_found}")
                
                if frames_collected >= MAX_FRAMES:
                    break
                    
        await asyncio.sleep(0.5)
        
    print(f"[Dataset Capture] Completed! {frames_collected} frames saved to {DATASET_DIR}")
    
    # Also exit program
    os._exit(0)

if __name__ == "__main__":
    asyncio.run(capture_dataset())
