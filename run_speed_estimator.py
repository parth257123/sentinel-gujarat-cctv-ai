import cv2
import torch
import os
from ultralytics import YOLO
from ultralytics.solutions import speed_estimation

def main():
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    print(f"🚀 [Speed Estimator] Initializing YOLOv8 on Apple Silicon ({device.upper()})...")

    # Load video
    video_path = os.path.join(os.path.dirname(__file__), "backend1", "videos", "highway_cars.mp4")
    if not os.path.exists(video_path):
        video_path = os.path.join(os.path.dirname(__file__), "backend1", "videos", "traffic1.mp4")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"❌ Error opening video: {video_path}")
        return

    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480
    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30

    # Calibrate tripwire line across the road
    line_points = [(0, int(h * 0.55)), (w, int(h * 0.55))]

    print(f"📏 Calibrated Tripwire Gate: {line_points}")
    print(f"⚡ Processing video stream at {w}x{h} ({fps} FPS)...")

    # Initialize Ultralytics Speed Estimator
    speed_obj = speed_estimation.SpeedEstimator(
        region=line_points,
        model="yolov8n.pt",
        classes=[0, 1, 2, 3, 5, 7], # Person, Bicycle, Car, Motorcycle, Bus, Truck
        show=False,
        device=device
    )

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            # Loop video
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        frame_idx += 1
        res = speed_obj.process(frame)
        annotated = res.plot_im if res.plot_im is not None else frame

        # Show real OpenCV window on user's Mac desktop
        cv2.imshow("Genuine Ultralytics YOLOv8 Speed Estimation", annotated)

        # Press 'q' to exit
        if cv2.waitKey(int(1000 / fps)) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("✅ Finished genuine speed estimation session.")

if __name__ == "__main__":
    main()
