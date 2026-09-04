"""
Gujarat Police CCTV Live Dataset Builder
========================================
Pulls diverse live frames across all 30 Gujarat Police CCTV cameras
from cctv.corp8.cloud, decrypts the AES-128 HLS streams, samples
distinct scenes (night, daylight, intersections, bridges), and
generates a structured YOLO dataset ready for training.
"""

import os
import re
import time
import glob
import random
import requests
import numpy as np
import cv2
import av
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

# ─── Configuration ──────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "datasets", "gujarat_cctv_live_dataset")
COOKIE_PATH = os.path.join(os.path.dirname(BASE_DIR), "live_cookies.txt")

PORTAL_URL = "https://cctv.corp8.cloud"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}

# 5 Target Classes for Gujarat Traffic
CLASSES = [
    "car",              # 0
    "auto_rickshaw",    # 1
    "two_wheeler",      # 2 (motorcycle / scooter)
    "bus",              # 3
    "truck"             # 4
]

FRAMES_PER_CAMERA = 8  # 8 distinct frames * 30 cameras = 240 high-value frames

def get_session_cookie():
    """Reads or refreshes active Sentinel session cookie."""
    if os.path.exists(COOKIE_PATH):
        raw = open(COOKIE_PATH).read()
        match = re.search(r"sentinel\t(\S+)", raw)
        if match:
            return match.group(1)
            
    # Fallback to login
    print("🔑 Authenticating with Sentinel portal...")
    r = requests.post(f"{PORTAL_URL}/auth/login", data={"password": "PVCK-PKJ5-4YHC"}, headers=HEADERS, allow_redirects=False)
    if "sentinel" in r.cookies:
        return r.cookies["sentinel"]
    return None


def get_aes_key(session_cookie):
    """Fetches the 16-byte AES-128 encryption key."""
    key_file = os.path.join(BASE_DIR, "enc.key")
    if os.path.exists(key_file) and os.path.getsize(key_file) == 16:
        with open(key_file, "rb") as f:
            return f.read()
            
    cookies = {"sentinel": session_cookie} if session_cookie else {}
    resp = requests.get(f"{PORTAL_URL}/enc.key", headers=HEADERS, cookies=cookies)
    if resp.status_code == 200 and len(resp.content) == 16:
        with open(key_file, "wb") as f:
            f.write(resp.content)
        return resp.content
    raise RuntimeError("Could not retrieve AES encryption key")


def decrypt_segment(encrypted_bytes, key):
    """Decrypts AES-128 CBC encrypted MPEG-TS segment."""
    iv = b"\x00" * 16
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    decryptor = cipher.decryptor()
    return decryptor.update(encrypted_bytes) + decryptor.finalize()


def decode_frames_from_ts(ts_bytes, max_frames=2):
    """Decodes video frames from decrypted MPEG-TS bytes using PyAV."""
    frames = []
    try:
        import io
        bio = io.BytesIO(ts_bytes)
        container = av.open(bio)
        for frame in container.decode(video=0):
            img = frame.to_ndarray(format="bgr24")
            frames.append(img)
            if len(frames) >= max_frames:
                break
    except Exception as e:
        pass
    return frames


def setup_dataset_structure():
    """Initializes images/ and labels/ directories with train/val split."""
    for split in ["train", "val"]:
        os.makedirs(os.path.join(DATASET_DIR, "images", split), exist_ok=True)
        os.makedirs(os.path.join(DATASET_DIR, "labels", split), exist_ok=True)
        
    yaml_content = f"""path: {DATASET_DIR}
train: images/train
val: images/val

nc: {len(CLASSES)}
names:
"""
    for idx, name in enumerate(CLASSES):
        yaml_content += f"  {idx}: {name}\n"
        
    yaml_path = os.path.join(DATASET_DIR, "data.yaml")
    with open(yaml_path, "w") as f:
        f.write(yaml_content)
    print(f"📁 Initialized dataset directories at: {DATASET_DIR}")
    print(f"📝 Created data.yaml")
    return yaml_path


def apply_night_enhancement_if_needed(img):
    """Checks if frame is nighttime/dark and applies CLAHE contrast enhancement."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mean_brightness = np.mean(gray)
    if mean_brightness < 80:  # Night or dark conditions
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        l_boosted = clahe.apply(l)
        enhanced = cv2.merge((l_boosted, a, b))
        return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR), True
    return img, False


def generate_draft_labels(frame, base_detector=None):
    """
    Generates draft YOLO labels for Indian traffic classes.
    Maps COCO/Indian classes to:
      0: car, 1: auto_rickshaw, 2: two_wheeler, 3: bus, 4: truck
    """
    labels = []
    if base_detector is None:
        return labels

    try:
        results = base_detector.predict(frame, conf=0.18, verbose=False)
        h, w = frame.shape[:2]
        
        for r in results:
            for box in r.boxes:
                coco_cls = int(box.cls[0])
                cls_name = base_detector.names[coco_cls].lower()
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                bw = x2 - x1
                bh = y2 - y1
                aspect_ratio = bw / max(1, bh)
                
                # Map to our 5 target classes
                target_cls = None
                if "rickshaw" in cls_name or "auto" in cls_name:
                    target_cls = 1  # auto_rickshaw
                elif "motorcycle" in cls_name or "scooter" in cls_name or "bicycle" in cls_name:
                    target_cls = 2  # two_wheeler
                elif "bus" in cls_name:
                    target_cls = 3  # bus
                elif "truck" in cls_name:
                    target_cls = 4  # truck
                elif "car" in cls_name or "van" in cls_name or "suv" in cls_name:
                    # Check if small box with aspect ratio matching auto-rickshaw in India
                    if 0.7 < aspect_ratio < 1.1 and bw < 140 and bh < 140:
                        target_cls = 1  # probable auto_rickshaw in Indian traffic
                    else:
                        target_cls = 0  # car
                        
                if target_cls is not None:
                    # YOLO normalized coordinates: x_center, y_center, width, height
                    xc = ((x1 + x2) / 2.0) / w
                    yc = ((y1 + y2) / 2.0) / h
                    nw = bw / w
                    nh = bh / h
                    labels.append(f"{target_cls} {xc:.6f} {yc:.6f} {nw:.6f} {nh:.6f}")
    except Exception:
        pass
        
    return labels


def main():
    print("=" * 70)
    print("🚀 GUJARAT POLICE CCTV LIVE DATASET GENERATION")
    print("=" * 70)
    
    session_cookie = get_session_cookie()
    if not session_cookie:
        print("❌ Could not get valid session cookie!")
        return
        
    key = get_aes_key(session_cookie)
    print(f"🔑 Loaded AES-128 stream decryption key ({len(key)} bytes)")
    
    cookies = {"sentinel": session_cookie}
    setup_dataset_structure()
    
    # Load base teacher detector for draft annotations
    base_detector = None
    try:
        from ultralytics import YOLO
        model_candidates = [
            os.path.join(BASE_DIR, "models", "indian_traffic_live_10class_best.pt"),
            os.path.join(BASE_DIR, "yolo12n.pt"),
            os.path.join(BASE_DIR, "yolov8n.pt")
        ]
        for mpath in model_candidates:
            if os.path.exists(mpath):
                base_detector = YOLO(mpath)
                print(f"🤖 Loaded assistant model for draft annotations: {os.path.basename(mpath)}")
                break
    except Exception as e:
        print(f"⚠️ Model assistant skipped: {e}")

    # Fetch all 30 cameras
    resp = requests.get(f"{PORTAL_URL}/cameras.json", headers=HEADERS, cookies=cookies)
    if resp.status_code != 200:
        print(f"❌ Failed to fetch camera list: {resp.status_code}")
        return
        
    cameras = resp.json()
    print(f"📹 Found {len(cameras)} registered Gujarat Police cameras.\n")
    
    total_saved = 0
    total_night_enhanced = 0
    camera_stats = {}
    
    for cam_idx, cam in enumerate(cameras):
        cid = cam["id"]
        cname = cam["name"]
        print(f"[{cam_idx+1}/{len(cameras)}] Processing {cid} ({cname})...")
        
        try:
            m3u8_url = f"{PORTAL_URL}/{cid}/index.m3u8"
            m3u8_resp = requests.get(m3u8_url, headers=HEADERS, cookies=cookies, timeout=10)
            if m3u8_resp.status_code != 200:
                print(f"   ⚠️ Could not load playlist for {cid}: status {m3u8_resp.status_code}")
                continue
                
            segments = [line.strip() for line in m3u8_resp.text.splitlines() if line.endswith(".ts")]
            if not segments:
                print(f"   ⚠️ No video segments found in {cid}")
                continue
                
            # Select diverse segments across the recording timeline
            num_segs = len(segments)
            # Pick evenly spaced segments
            step = max(1, num_segs // (FRAMES_PER_CAMERA + 2))
            chosen_indices = [min(num_segs - 1, int(i * step + random.randint(0, min(step, 5)))) for i in range(FRAMES_PER_CAMERA)]
            chosen_indices = sorted(list(set(chosen_indices)))[:FRAMES_PER_CAMERA]
            
            cam_saved = 0
            for seg_idx in chosen_indices:
                seg_name = segments[seg_idx]
                seg_url = f"{PORTAL_URL}/{cid}/{seg_name}"
                
                # Fetch encrypted segment
                s_resp = requests.get(seg_url, headers=HEADERS, cookies=cookies, timeout=10)
                if s_resp.status_code != 200 or len(s_resp.content) < 1000:
                    continue
                    
                # Decrypt
                decrypted = decrypt_segment(s_resp.content, key)
                
                # Decode frame
                frames = decode_frames_from_ts(decrypted, max_frames=1)
                if not frames:
                    continue
                    
                frame = frames[0]
                
                # Enhance if nighttime / dark
                enhanced_frame, is_enhanced = apply_night_enhancement_if_needed(frame)
                if is_enhanced:
                    total_night_enhanced += 1
                    
                # 80/20 train/val split
                split = "train" if random.random() < 0.8 else "val"
                frame_filename = f"{cid}_seg{seg_idx:05d}.jpg"
                img_path = os.path.join(DATASET_DIR, "images", split, frame_filename)
                
                # Save frame
                cv2.imwrite(img_path, enhanced_frame)
                
                # Generate draft labels
                labels = generate_draft_labels(enhanced_frame, base_detector)
                lbl_filename = f"{cid}_seg{seg_idx:05d}.txt"
                lbl_path = os.path.join(DATASET_DIR, "labels", split, lbl_filename)
                with open(lbl_path, "w") as f:
                    f.write("\n".join(labels))
                    
                cam_saved += 1
                total_saved += 1
                
                # Gentle pacing between segment fetches
                time.sleep(0.15)
                
            camera_stats[cid] = cam_saved
            print(f"   ✅ Saved {cam_saved} diverse frames.")
            
        except Exception as e:
            print(f"   ❌ Error on {cid}: {e}")
            
        # Respect server pacing between cameras
        time.sleep(0.3)
        
    print("\n" + "=" * 70)
    print("🎉 DATASET GENERATION COMPLETE!")
    print("=" * 70)
    print(f"📸 Total High-Resolution Frames Captured: {total_saved}")
    print(f"🌙 Night-Vision Enhanced Frames: {total_night_enhanced}")
    print(f"📁 Dataset Directory: {DATASET_DIR}")
    
    # Count splits
    train_imgs = len(glob.glob(os.path.join(DATASET_DIR, "images", "train", "*.jpg")))
    val_imgs = len(glob.glob(os.path.join(DATASET_DIR, "images", "val", "*.jpg")))
    print(f"📊 Split: {train_imgs} Training Frames | {val_imgs} Validation Frames")
    
    # Create a zip package for instant export / Roboflow / Colab
    zip_output = os.path.join(BASE_DIR, "gujarat_cctv_live_dataset.zip")
    print(f"📦 Packaging into {os.path.basename(zip_output)}...")
    import shutil
    shutil.make_archive(zip_output.replace(".zip", ""), "zip", DATASET_DIR)
    print(f"✅ Ready! Archive created at: {zip_output} ({os.path.getsize(zip_output) / (1024*1024):.2f} MB)")


if __name__ == "__main__":
    main()
