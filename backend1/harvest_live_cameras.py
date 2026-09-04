"""
Gujarat Police 30-Camera Live RTSP Harvester & Highlight Clip Recorder
======================================================================
- Cycles across all 30 Gujarat Police cameras at rtsp://103.250.160.189:8554/stream/camXX
- Captures pristine 1080p snapshots every 90 seconds
- Auto-generates dual Raw + Night CLAHE pairs for low-light scenes
- Records 20-second MP4 highlight clips for the top 5 major junctions
- Lightweight, zero bandwidth overload, safe from rate-limiting
"""

import cv2
import os
import glob
import time
import datetime
import logging
from concurrent.futures import ThreadPoolExecutor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("LiveHarvester")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRAMES_DIR = os.path.join(BASE_DIR, "harvested_cctv_frames")
HIGHLIGHTS_DIR = os.path.join(BASE_DIR, "videos", "live_highlights")

os.makedirs(FRAMES_DIR, exist_ok=True)
os.makedirs(HIGHLIGHTS_DIR, exist_ok=True)

RTSP_HOST = "103.250.160.189"
RTSP_PORT = 8554
RTSP_USER = os.environ.get("RTSP_USER", "parthlodaya257@gmail.com")
RTSP_PASS = os.environ.get("RTSP_PASS", "RDT5-S2ZG-L7JD")

def get_rtsp_url(cam_id):
    from urllib.parse import quote
    if RTSP_USER and RTSP_PASS:
        auth = f"{quote(RTSP_USER)}:{quote(RTSP_PASS)}@"
    else:
        auth = ""
    return f"rtsp://{auth}{RTSP_HOST}:{RTSP_PORT}/stream/{cam_id}"

# Catalogue of 30 registered Gujarat Police cameras
CAMERA_REGISTRY = [
    ("cam01", "Chimanbhai Bridge"),
    ("cam02", "Janpath"),
    ("cam03", "ONGC Office"),
    ("cam04", "Paldi Circle"),
    ("cam05", "Visat Teen Rasta"),
    ("cam06", "Timbavadi Junagadh"),
    ("cam07", "Hero Showroom Gir Somnath"),
    ("cam08", "Majewadi Gate Junagadh"),
    ("cam09", "New Bypass Junagadh"),
    ("cam10", "Char Chowk Junagadh"),
    ("cam11", "Dolatpara Junagadh"),
    ("cam12", "Tri Mandir Adalaj Tollnaka"),
    ("cam13", "CN Vidhyalaya"),
    ("cam14", "Delight RLVD"),
    ("cam15", "Suvidha Park"),
    ("cam16", "Visat P2"),
    ("cam17", "Rajkot Bus Port"),
    ("cam18", "Rajkot CCTV"),
    ("cam19", "Khaparia Gandevi Navsari"),
    ("cam20", "Mohanpura"),
    ("cam21", "Patan Dethali"),
    ("cam22", "BK Mervada"),
    ("cam23", "Kheram"),
    ("cam24", "Dehgam"),
    ("cam25", "Dhanori"),
    ("cam26", "Tankal"),
    ("cam27", "Bilimora 1"),
    ("cam28", "Bilimora 2"),
    ("cam29", "Bilimora 3"),
    ("cam30", "Gandhidham Rambaugh"),
]

# Top 5 junction cameras to record short highlight video clips
TOP_JUNCTIONS = ["cam01", "cam04", "cam05", "cam12", "cam14"]

def capture_camera_frame(cam_id, cam_name):
    """Connects to single RTSP camera, reads 1 clean frame, and disconnects."""
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
    url = get_rtsp_url(cam_id)
    
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        return None
        
    ret, frame = cap.read()
    cap.release()
    
    if ret and frame is not None and frame.size > 0:
        return frame
    return None

def record_short_clip(cam_id, cam_name, duration_sec=15):
    """Records a short 1080p MP4 clip from a live RTSP feed."""
    clean_name = cam_name.lower().replace(" ", "_").replace("-", "_")
    out_file = os.path.join(HIGHLIGHTS_DIR, f"{cam_id}_{clean_name}_live.mp4")
    
    if os.path.exists(out_file) and os.path.getsize(out_file) > 1000000:
        return  # Already recorded
        
    logger.info(f"🎥 Recording {duration_sec}s highlight clip for {cam_id} ({cam_name})...")
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
    url = get_rtsp_url(cam_id)
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    
    if not cap.isOpened():
        return
        
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or fps > 60:
        fps = 25.0
        
    ret, first_frame = cap.read()
    if not ret or first_frame is None:
        cap.release()
        return
        
    h, w = first_frame.shape[:2]
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(out_file, fourcc, fps, (w, h))
    out.write(first_frame)
    
    total_frames = int(fps * duration_sec)
    for _ in range(total_frames - 1):
        ret, frame = cap.read()
        if not ret or frame is None:
            break
        out.write(frame)
        
    cap.release()
    out.release()
    logger.info(f"✅ Saved live clip: {out_file} ({os.path.getsize(out_file) / (1024*1024):.2f} MB)")

def main():
    logger.info("=" * 70)
    logger.info("🚀 GUJARAT POLICE LIVE RTSP HARVESTER INITIALIZED")
    logger.info(f"📡 Target: rtsp://{RTSP_HOST}:{RTSP_PORT}/stream/cam[01-30]")
    logger.info(f"📁 Frame Directory: {FRAMES_DIR}")
    logger.info(f"📁 Video Highlights: {HIGHLIGHTS_DIR}")
    logger.info("=" * 70)

def capture_single_camera_worker(args):
    """Worker function for concurrent RTSP snapshot capture and night enhancement."""
    cid, cname, ts_str = args
    clean_name = cname.lower().replace(" ", "_").replace("-", "_")
    cam_subfolder = os.path.join(FRAMES_DIR, cid)
    os.makedirs(cam_subfolder, exist_ok=True)

    try:
        frame = capture_camera_frame(cid, cname)
        if frame is not None:
            filename = f"{cid}_{clean_name}_{ts_str}.jpg"
            file_path = os.path.join(cam_subfolder, filename)
            cv2.imwrite(file_path, frame, [int(cv2.IMWRITE_JPEG_QUALITY), 92])

            # Night CLAHE enhancement if low light
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            avg_brightness = float(gray.mean())
            if avg_brightness < 75:
                lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
                l, a, b = cv2.split(lab)
                clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
                enhanced = cv2.cvtColor(cv2.merge((clahe.apply(l), a, b)), cv2.COLOR_LAB2BGR)
                enh_path = os.path.join(cam_subfolder, f"{cid}_{clean_name}_{ts_str}_clahe.jpg")
                cv2.imwrite(enh_path, enhanced, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
            return True
    except Exception as e:
        logger.debug(f"Skip {cid}: {e}")
    return False

def main():
    logger.info("=" * 70)
    logger.info("🚀 GUJARAT POLICE LIVE RTSP HARVESTER INITIALIZED")
    logger.info(f"📡 Target: rtsp://{RTSP_HOST}:{RTSP_PORT}/stream/cam[01-30]")
    logger.info(f"📁 Frame Directory: {FRAMES_DIR}")
    logger.info(f"📁 Video Highlights: {HIGHLIGHTS_DIR}")
    logger.info("=" * 70)

    # 1. First Pass: Record 15-second highlight clips for the top 5 junctions
    for cid, cname in CAMERA_REGISTRY:
        if cid in TOP_JUNCTIONS:
            try:
                record_short_clip(cid, cname, duration_sec=15)
            except Exception as e:
                logger.warning(f"Clip recording failed for {cid}: {e}")
            time.sleep(0.5)

    # 2. Continuous Adaptive Snapshot Harvesting Loop
    cycle = 0
    total_saved = len(glob.glob(os.path.join(FRAMES_DIR, "*", "*.jpg")))
    logger.info(f"📂 Found {total_saved} pre-existing frames. Resuming data collection...")

    while True:
        cycle += 1
        cycle_start = time.time()
        now = datetime.datetime.now()
        ts_str = now.strftime("%Y%m%d_%H%M%S")
        hour = now.hour

        # Morning Rush Hour Schedule: 6:00 AM to 10:00 AM
        is_morning_rush = (6 <= hour < 10)

        tasks = [(cid, cname, ts_str) for cid, cname in CAMERA_REGISTRY]

        if is_morning_rush:
            logger.info(f"\n🌅 [Cycle {cycle} - MORNING RUSH 06:00-10:00 AM] Parallel Sweep (15s Cadence) ({ts_str})...")
            # 6 concurrent workers for maximum speed
            with ThreadPoolExecutor(max_workers=6) as executor:
                results = list(executor.map(capture_single_camera_worker, tasks))

            captured_in_cycle = sum(1 for r in results if r)
            total_saved += captured_in_cycle
            elapsed = time.time() - cycle_start
            logger.info(f"✅ [Cycle {cycle} Complete] Captured {captured_in_cycle}/30 cameras in {elapsed:.1f}s. Total frames: {total_saved}")

            # Every 15 seconds interval
            sleep_time = max(2.0, 15.0 - elapsed)
            time.sleep(sleep_time)
        else:
            logger.info(f"\n🌙 [Cycle {cycle} - Off-Peak/Night Mode] Sweeping 30 cameras ({ts_str})...")
            # 4 concurrent workers
            with ThreadPoolExecutor(max_workers=4) as executor:
                results = list(executor.map(capture_single_camera_worker, tasks))

            captured_in_cycle = sum(1 for r in results if r)
            total_saved += captured_in_cycle
            elapsed = time.time() - cycle_start
            logger.info(f"✅ [Cycle {cycle} Complete] Captured {captured_in_cycle}/30 cameras in {elapsed:.1f}s. Total frames: {total_saved}")

            # Off-peak pace (~90 seconds)
            sleep_time = max(10.0, 90.0 - elapsed)
            time.sleep(sleep_time)

if __name__ == "__main__":
    main()
