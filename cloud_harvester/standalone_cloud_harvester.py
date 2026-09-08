#!/usr/bin/env python3
"""
Sentinel Gujarat CCTV — Standalone Headless Cloud Harvester
Runs 24/7 on any remote Linux VPS, AWS EC2, Google Cloud, Docker, or Google Colab
WITHOUT needing your MacBook running.
"""

import os
import sys
import time
import json
import sqlite3
import logging
import hashlib
import requests
import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("cloud_harvester.log")
    ]
)
logger = logging.getLogger("CloudHarvester")

DATA_DIR = Path("./harvested_data")
DATA_DIR.mkdir(exist_ok=True)
SNAPSHOTS_DIR = DATA_DIR / "snapshots"
SNAPSHOTS_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "sentinel_harvested.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS telemetry_harvest (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        camera_id TEXT,
        camera_name TEXT,
        city TEXT,
        timestamp DATETIME,
        snapshot_filename TEXT,
        file_size_bytes INTEGER,
        sha256_hash TEXT
    )
    """)
    conn.commit()
    conn.close()

GUJARAT_CAMERAS = [
    {"id": "CAM-001", "name": "01 s-t-depo-road-junagadh", "city": "Junagadh", "stream_num": 1},
    {"id": "CAM-002", "name": "02 sonapur-road-junagadh", "city": "Junagadh", "stream_num": 2},
    {"id": "CAM-003", "name": "03 vanthali-road-junagadh", "city": "Junagadh", "stream_num": 3},
    {"id": "CAM-004", "name": "04 madhuram-gate-junagadh", "city": "Junagadh", "stream_num": 4},
    {"id": "CAM-005", "name": "05 motibag-junagadh", "city": "Junagadh", "stream_num": 5},
    {"id": "CAM-006", "name": "06 ashram-road-ahmedabad", "city": "Ahmedabad", "stream_num": 6},
    {"id": "CAM-007", "name": "07 kalupur-circle-ahmedabad", "city": "Ahmedabad", "stream_num": 7},
    {"id": "CAM-008", "name": "08 majura-gate-surat", "city": "Surat", "stream_num": 8},
    {"id": "CAM-009", "name": "09 new-bypass-circle-junagadh", "city": "Junagadh", "stream_num": 9},
    {"id": "CAM-010", "name": "10 char-chowk-road-2-junagadh", "city": "Junagadh", "stream_num": 10},
    {"id": "CAM-011", "name": "11 sayajigunj-circle-vadodara", "city": "Vadodara", "stream_num": 11},
    {"id": "CAM-012", "name": "12 race-course-ring-road-rajkot", "city": "Rajkot", "stream_num": 12},
    {"id": "CAM-013", "name": "13 cn-vidhyalaya-ahmedabad", "city": "Ahmedabad", "stream_num": 13},
    {"id": "CAM-014", "name": "14 delight-junction-surat", "city": "Surat", "stream_num": 14},
    {"id": "CAM-015", "name": "15 sector-11-circle-gandhinagar", "city": "Gandhinagar", "stream_num": 15},
    {"id": "CAM-016", "name": "16 visat-three-roads-ahmedabad", "city": "Ahmedabad", "stream_num": 16},
    {"id": "CAM-026", "name": "26 tankal-navsari", "city": "Navsari", "stream_num": 26},
    {"id": "CAM-027", "name": "27 lunsikui-circle-navsari", "city": "Navsari", "stream_num": 27},
    {"id": "CAM-030", "name": "30 rambaugh-circle-gandhidham", "city": "Kutch", "stream_num": 30}
]

def harvest_frame(cam):
    s = cam.get("stream_num", 1)
    urls = [
        f"https://cctv.corp8.cloud/camera/{s}/snapshot",
        f"https://cctv.corp8.cloud/api/snapshot/{s}",
        f"https://live.corp8.cloud/camera/{s}/live.jpg"
    ]
    headers = {"User-Agent": "Mozilla/5.0 (Sentinel Gujarat Police Netram Harvester v2.4)"}
    for u in urls:
        try:
            r = requests.get(u, headers=headers, timeout=5)
            if r.status_code == 200 and len(r.content) > 5000:
                ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
                fn = f"{cam['id']}_{ts}.jpg"
                fp = SNAPSHOTS_DIR / fn
                with open(fp, "wb") as out:
                    out.write(r.content)
                h = hashlib.sha256(r.content).hexdigest()
                return {"success": True, "filename": fn, "bytes": len(r.content), "hash": h}
        except Exception:
            pass
    return {"success": False}

def main():
    init_db()
    logger.info("🚀 [Sentinel Cloud Harvester] Running 24/7 independently in cloud...")
    total = 0
    while True:
        try:
            for cam in GUJARAT_CAMERAS:
                res = harvest_frame(cam)
                if res["success"]:
                    total += 1
                    conn = sqlite3.connect(DB_PATH)
                    conn.execute(
                        "INSERT INTO telemetry_harvest (camera_id, camera_name, city, timestamp, snapshot_filename, file_size_bytes, sha256_hash) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (cam["id"], cam["name"], cam["city"], datetime.datetime.now().isoformat(), res["filename"], res["bytes"], res["hash"])
                    )
                    conn.commit()
                    conn.close()
                    logger.info(f"Captured: {cam['id']} ({cam['name'][:22]}) -> {res['filename']} ({res['bytes']//1024} KB) [Total: {total}]")
                time.sleep(0.4)
            time.sleep(3)
        except KeyboardInterrupt:
            logger.info("Stopped by user.")
            break
        except Exception as e:
            logger.error(f"Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
