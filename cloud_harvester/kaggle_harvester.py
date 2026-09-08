# !pip install -q av cryptography

"""
🛰️ Sentinel Gujarat CCTV — 12-Hour Headless Cloud Harvester (Kaggle Edition)
Runs 24/7 on Kaggle cloud servers with your laptop turned COMPLETELY OFF.
"""

import os
import sys
import io
import time
import zipfile
import sqlite3
import hashlib
import requests
import datetime
import cv2
import av
from pathlib import Path
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

# 1. Output Directories in Kaggle Workspace
BASE_DIR = Path("/kaggle/working/sentinel_cctv_harvest")
BASE_DIR.mkdir(parents=True, exist_ok=True)
FRAMES_DIR = BASE_DIR / "frames"
FRAMES_DIR.mkdir(exist_ok=True)
DB_PATH = BASE_DIR / "sentinel_harvested.db"
ZIP_PATH = Path("/kaggle/working/sentinel_harvested_cctv.zip")

print("=" * 70, flush=True)
print("🚀 [Sentinel Gujarat CCTV] Kaggle Headless Background Harvester", flush=True)
print(f"📁 Working Directory: {BASE_DIR}", flush=True)
print(f"📦 Final Output Zip: {ZIP_PATH}", flush=True)
print("=" * 70, flush=True)

# 2. Database Initialization
conn = sqlite3.connect(DB_PATH)
conn.execute("""
CREATE TABLE IF NOT EXISTS harvested_frames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id TEXT,
    camera_name TEXT,
    city TEXT,
    timestamp DATETIME,
    filename TEXT,
    resolution TEXT,
    sha256_hash TEXT
)
""")
conn.commit()
conn.close()

# 3. Sentinel Authentication & Decryption Setup
COOKIE = "eyJ1aWQiOiIwN2ZkYWUyMzM1MDdmZWVjIiwic2lkIjoiYWZiNzY1NjRiYmE3ZDdjMjY0In0.N9Z32KjXkzjZ6jIAXhO2lDwuMPVxLh0Ug8YnHXCi3W4"
COOKIES = {"sentinel": COOKIE}
HEADERS = {"User-Agent": "Mozilla/5.0 (Sentinel Gujarat CCTV Cloud Harvester)"}
PORTAL_URL = "https://cctv.corp8.cloud"

print("🔑 Fetching AES-128 stream decryption key...", flush=True)
try:
    r_key = requests.get(f"{PORTAL_URL}/enc.key", headers=HEADERS, cookies=COOKIES, timeout=10)
    AES_KEY = r_key.content
    print(f"✅ AES-128 Key verified ({len(AES_KEY)} bytes)", flush=True)
except Exception as e:
    print(f"❌ Failed to fetch AES key: {e}", flush=True)
    sys.exit(1)

# 4. Gujarat Police 30-Node Master CCTV Grid
GUJARAT_CAMERAS = [
    {"cid": "cam01", "name": "01 Chiman bhai Bridge", "city": "Ahmedabad"},
    {"cid": "cam02", "name": "02 Janpath", "city": "Ahmedabad"},
    {"cid": "cam03", "name": "03 O.N.G.C. Office", "city": "Ahmedabad"},
    {"cid": "cam04", "name": "04 Paldi Circle", "city": "Ahmedabad"},
    {"cid": "cam05", "name": "05 Visat teen Rasta", "city": "Ahmedabad"},
    {"cid": "cam06", "name": "06 Timbavadi gate", "city": "Junagadh"},
    {"cid": "cam07", "name": "07 hero-showroom", "city": "Gir Somnath"},
    {"cid": "cam08", "name": "08 majewadi-gate", "city": "Junagadh"},
    {"cid": "cam09", "name": "09 new-bypass-circle", "city": "Junagadh"},
    {"cid": "cam10", "name": "10 char-chowk-road", "city": "Junagadh"},
    {"cid": "cam11", "name": "11 sayajigunj-circle", "city": "Vadodara"},
    {"cid": "cam12", "name": "12 race-course-ring-road", "city": "Rajkot"},
    {"cid": "cam13", "name": "13 cn-vidhyalaya", "city": "Ahmedabad"},
    {"cid": "cam14", "name": "14 delight-junction", "city": "Surat"},
    {"cid": "cam15", "name": "15 sector-11-circle", "city": "Gandhinagar"},
    {"cid": "cam16", "name": "16 visat-three-roads", "city": "Ahmedabad"},
    {"cid": "cam17", "name": "17 kalupur-station-gate", "city": "Ahmedabad"},
    {"cid": "cam18", "name": "18 ashram-road-vadaj", "city": "Ahmedabad"},
    {"cid": "cam19", "name": "19 majura-gate-junction", "city": "Surat"},
    {"cid": "cam20", "name": "20 ring-road-subhash", "city": "Rajkot"},
    {"cid": "cam26", "name": "26 tankal-circle", "city": "Navsari"},
    {"cid": "cam27", "name": "27 lunsikui-circle", "city": "Navsari"},
    {"cid": "cam30", "name": "30 rambaugh-circle", "city": "Gandhidham"}
]

def decrypt_segment(encrypted_bytes, key):
    """Decrypts AES-128 CBC encrypted MPEG-TS segment."""
    iv = b"\x00" * 16
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    dec = cipher.decryptor()
    return dec.update(encrypted_bytes) + dec.finalize()

def harvest_camera_frame(cam, sample_step=15):
    cid = cam["cid"]
    try:
        r_m3u8 = requests.get(f"{PORTAL_URL}/{cid}/index.m3u8", headers=HEADERS, cookies=COOKIES, timeout=8)
        if r_m3u8.status_code != 200:
            return None
            
        segments = [l.strip() for l in r_m3u8.text.splitlines() if l.endswith(".ts")]
        if not segments:
            return None
            
        chosen_seg = segments[-1]
        r_ts = requests.get(f"{PORTAL_URL}/{cid}/{chosen_seg}", headers=HEADERS, cookies=COOKIES, timeout=12)
        if r_ts.status_code != 200 or len(r_ts.content) < 2000:
            return None
            
        # Decrypt segment
        ts_bytes = decrypt_segment(r_ts.content, AES_KEY)
        
        # Decode frame using PyAV
        bio = io.BytesIO(ts_bytes)
        container = av.open(bio)
        for frame in container.decode(video=0):
            img = frame.to_ndarray(format="bgr24")
            
            ts_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
            filename = f"{cid}_{ts_str}.jpg"
            filepath = FRAMES_DIR / filename
            cv2.imwrite(str(filepath), img)
            
            sha = hashlib.sha256(img.tobytes()).hexdigest()
            h, w = img.shape[:2]
            
            return {
                "filename": filename,
                "resolution": f"{w}x{h}",
                "hash": sha
            }
    except Exception:
        pass
    return None

# 5. Continuous 12-Hour Harvest Loop
print("🛰️ [Background Harvester] Entering continuous harvest loop...", flush=True)

total_harvested = 0
cycle = 1
start_time = time.time()
MAX_RUN_HOURS = 11.5 # Stays safely within Kaggle 12-hour background limit

while (time.time() - start_time) < (MAX_RUN_HOURS * 3600):
    now_str = datetime.datetime.now().strftime("%H:%M:%S")
    elapsed_mins = int((time.time() - start_time) // 60)
    print(f"\n--- Cycle #{cycle} [{now_str}] (Elapsed: {elapsed_mins}m | Collected: {total_harvested} frames) ---", flush=True)
    
    for idx, cam in enumerate(GUJARAT_CAMERAS):
        res = harvest_camera_frame(cam)
        if res:
            total_harvested += 1
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                "INSERT INTO harvested_frames (camera_id, camera_name, city, timestamp, filename, resolution, sha256_hash) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (cam["cid"], cam["name"], cam["city"], datetime.datetime.now().isoformat(), res["filename"], res["resolution"], res["hash"])
            )
            conn.commit()
            conn.close()
            print(f"[{idx+1:02d}/{len(GUJARAT_CAMERAS)}] ✅ {cam['cid']} ({cam['name'][:20]}) -> Saved {res['filename']} [{res['resolution']}]", flush=True)
        else:
            print(f"[{idx+1:02d}/{len(GUJARAT_CAMERAS)}] ⏳ {cam['cid']} ({cam['name'][:20]}) -> Buffering stream...", flush=True)
            
        time.sleep(0.4)
        
    # Periodically update ZIP bundle every 5 cycles
    if cycle % 5 == 0:
        print(f"📦 Compressing {total_harvested} frames into downloadable {ZIP_PATH.name}...", flush=True)
        with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in FRAMES_DIR.glob("*.jpg"):
                zf.write(f, arcname=f.name)
            if DB_PATH.exists():
                zf.write(DB_PATH, arcname="sentinel_harvested.db")
        print(f"✅ Zip bundle updated ({ZIP_PATH.stat().st_size // (1024*1024)} MB).", flush=True)
        
    cycle += 1
    time.sleep(3)

print("\n" + "=" * 70, flush=True)
print(f"🏁 12-Hour Harvest Run Completed! Total Harvested Frames: {total_harvested}", flush=True)
print(f"📦 Download your zip file from Kaggle Output: {ZIP_PATH}", flush=True)
print("=" * 70, flush=True)
