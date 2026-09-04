"""
CCTV Diverse Frame Exporter for External Annotation (Roboflow / CVAT / Label Studio)
=====================================================================================
Selects a balanced, diverse batch of frames across all 30 cameras
(covering morning, afternoon, dusk, and night) and creates an archive ready to upload.
"""

import os
import glob
import zipfile
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRAMES_DIR = os.path.join(BASE_DIR, "harvested_cctv_frames")
OUT_ZIP = os.path.join(os.path.dirname(BASE_DIR), "gujarat_cctv_sample_for_roboflow.zip")

def package_diverse_sample(frames_per_camera=8):
    cams = sorted(glob.glob(os.path.join(FRAMES_DIR, "cam*")))
    if not cams:
        print("No harvested frames found.")
        return

    selected = []
    for cdir in cams:
        f_list = sorted(glob.glob(os.path.join(cdir, "*.jpg")))
        if not f_list:
            continue
        # Sample evenly across the time window
        step = max(1, len(f_list) // frames_per_camera)
        sampled = f_list[::step][:frames_per_camera]
        selected.extend(sampled)

    print(f"📦 Packaging {len(selected)} diverse CCTV frames from {len(cams)} cameras...")
    
    with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for fp in selected:
            arcname = os.path.join("images", os.path.basename(os.path.dirname(fp)), os.path.basename(fp))
            zf.write(fp, arcname=arcname)

    size_mb = os.path.getsize(OUT_ZIP) / (1024 * 1024)
    print(f"✅ Archive created: {OUT_ZIP} ({size_mb:.1f} MB)")
    print("👉 You can directly drag-and-drop this ZIP file into https://roboflow.com or CVAT to label with a team!")

if __name__ == "__main__":
    package_diverse_sample(frames_per_camera=8)
