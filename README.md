# 🛡️ Sentinel C4i — Gujarat Police Traffic Intelligence & AI Surveillance

[![Gujarat Police C4i](https://img.shields.io/badge/Gujarat_Police-C4i_Tactical_Suite-blue?style=for-the-badge)](https://police.gujarat.gov.in)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.x-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![YOLOv8 / v12](https://img.shields.io/badge/YOLO-v8%20%7C%20v12-00FFFF?style=for-the-badge)](https://ultralytics.com)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary_Law_Enforcement-red?style=for-the-badge)](#)

> **Industrial-grade AI computer vision and command-and-control (C4i) suite purpose-built for low-resolution, grainy, nighttime Gujarat Police CCTV streams across 30+ statewide urban junctions.**

---

## 🌟 Key Capabilities & Features

### 1. 🚦 8-Class Specialized Indian Traffic Model
Standard COCO models fail in Indian traffic conditions, mistaking auto-rickshaws for generic cars and hallucinating vehicles on streetlight poles and traffic cones under nighttime sodium-vapor glare. Sentinel is trained on real Gujarat surveillance footage:
* `0: auto_rickshaw` (Green/Yellow autos, Chhakdas)
* `1: motorcycle` (Splendors, Pulsars)
* `2: scooter` (Activas, electric two-wheelers)
* `3: car` (Sedans, SUVs, hatchbacks)
* `4: bus` (GSRTC, AMTS, BRTS)
* `5: truck` (Multi-axle commercial carriers)
* `6: ambulance` (Emergency response priority)
* `7: van` (Omni, Eeco, tempo traveler)

### 2. 📹 Direct 30-Camera Statewide RTSP Ingestion
* Directly ingests live H.264 streams from 30 registered Gujarat Police junctions across Ahmedabad, Junagadh, and Gir Somnath (`cam01` through `cam30`).
* Features automated retry, sub-frame ring buffers, and rate-limiting bypass.

### 3. 🔍 Forensic ANPR & Section 65B Evidence Dossier
* Automatic Number Plate Recognition fine-tuned for high-security Indian registration plates (HSRP).
* Automatic generation of court-admissible electronic evidence certificates complying with **Section 65B of the Bharatiya Sakshya Adhiniyam (BSA) 2023** with cryptographic SHA-256 integrity hashes.

### 4. 🧠 Operation Netram Copilot & Natural Language Search
* Allows investigating officers to search CCTV archives using plain English / Gujarati commands:
  * *"Show me black Scorpio without front plate passing Paldi Circle between 2 AM and 4 AM"*
  * *"Track red motorcycle speeding above 70 km/h on Chimanbhai Bridge"*

### 5. ⚡ Real-Time Speed Estimation & Aspect Ratio Quality Filters
* Perspective-transformed virtual road traps calculating vehicle velocities in km/h.
* Dynamic aspect-ratio gate (`bw/bh` validation) eliminating false positive detections on vertical light poles, reflective signs, and road dividers.

### 6. 🌙 Low-Light Enhancement & Temporal De-noising
* Integrates CLAHE (Contrast Limited Adaptive Histogram Equalization) and Lite-NAFNet restoration pipelines to pierce through sodium glare, heavy shadow, and headlight bloom on nighttime junction feeds.

---

## 🏗️ System Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │  30 Gujarat Police CCTV Feeds (RTSP 1080p)   │
                               │  rtsp://103.250.160.189:8554/stream/camXX    │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          SENTINEL CORE BACKEND                                          │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐  │
│  │ RTSP Ingestion Stream │  │ YOLOv8/12 Detector   │  │ ANPR & OCR Engine    │  │ Speed Trap Engine  │  │
│  │ (Async OpenCV Threads)│  │ (8-Class Indian SOTA)│  │ (HSRP Plate Cropper) │  │ (Homography Matrix)│  │
│  └───────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘  └─────────┬──────────┘  │
│              │                         │                         │                        │             │
│              └─────────────────────────┼─────────────────────────┼────────────────────────┘             │
│                                        ▼                                                                │
│                       ┌──────────────────────────────────┐                                              │
│                       │ SQLite / Timescale Forensic DB   │                                              │
│                       │ (Detections, Speeds, SHA256 Logs)│                                              │
│                       └────────────────┬─────────────────┘                                              │
└────────────────────────────────────────┼────────────────────────────────────────────────────────────────┘
                                         │ REST APIs & WebSockets (:8000)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     SENTINEL C4i COMMAND DASHBOARD                                      │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐  │
│  │ Live 30-Cam Grid View │  │ 3D Vehicle Trajectory│  │ Netram AI Copilot    │  │ Section 65B Dossier│  │
│  └───────────────────────┘  └──────────────────────┘  └──────────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
├── backend1/                          # Primary Production Backend (FastAPI + PyTorch)
│   ├── main.py                        # REST & WebSocket API Server
│   ├── real_speed_engine.py           # Real-time Speed & Trajectory Tracker
│   ├── anpr_engine.py                 # License Plate Detection & OCR Engine
│   ├── annotation_engine.py           # Annotation Studio API Engine
│   ├── harvest_live_cameras.py        # 30-Camera RTSP Harvest Worker
│   ├── scale_dataset_pseudo_labeler.py# Active Learning Pseudo-Labeler
│   ├── package_master_kaggle_dataset.py # Kaggle Dataset Synthesizer
│   ├── train_apple_silicon_indian_traffic.py # Local M-Series GPU Trainer
│   ├── models/                        # Fine-Tuned Custom Weights
│   │   ├── sentinel_indian_traffic_best.pt # 8-Class Indian Vehicle Model
│   │   └── indian_plate_best.pt       # HSRP License Plate Model
│   └── requirements.txt               # Backend Python Dependencies
├── sentinel/                          # C4i Tactical Frontend (React + Vite + Tailwind)
│   ├── src/
│   │   ├── App.jsx                    # Core Application Shell & Navigation
│   │   ├── pages/
│   │   │   ├── AnnotationStudioPage.jsx # Built-in Labeling & Active Learning
│   │   │   ├── TrajectoryPage.jsx       # 3D Vehicle Intercept & Trajectory
│   │   │   ├── InvestigatorPage.jsx     # Netram AI Natural Language Copilot
│   │   │   ├── ForensicsDossierPage.jsx # Section 65B Evidence Generator
│   │   │   └── DataArchivePage.jsx      # Historical Forensic Vehicle Search
│   │   └── index.css                  # Tactical HUD Dark Mode & Glassmorphism
│   ├── package.json                   # Frontend Dependencies
│   └── vite.config.js                 # Vite Bundler Configuration
├── things_to_know/                    # Technical & Legal Architecture Guides
│   ├── CCTV_VIDEO_QUALITY_AND_DEBLURRING_GUIDE.md
│   └── DATABASE_ARCHITECTURE_AND_STORAGE_GUIDE.md
├── Sentinel_Kaggle_GPU_Training.ipynb # 1-Click Kaggle GPU Training Notebook
├── run_harvester_windows.bat          # Windows Deployment Harvester Launcher
└── .gitignore                         # Secure Exclusion of Datasets & Media
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **macOS (Apple Silicon M1/M2/M3/M4)**, **Linux (CUDA)**, or **Windows 11**
* Python 3.10 or higher
* Node.js 18+ and npm

### 1. Clone the Repository
```bash
git clone https://github.com/parth257123/sentinel-gujarat-cctv-ai.git
cd sentinel-gujarat-cctv-ai
```

### 2. Set Up Backend
```bash
cd backend1
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Start the FastAPI backend:
```bash
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Set Up Frontend
In a new terminal window:
```bash
cd sentinel
npm install
npm run dev -- --host
```

Open your browser at **`http://localhost:5173`** to access the Sentinel C4i Tactical Suite.

---

## ⚡ Model Training

### Option A: Free Kaggle Cloud GPU (Recommended)
1. Open the included notebook: [`Sentinel_Kaggle_GPU_Training.ipynb`](Sentinel_Kaggle_GPU_Training.ipynb).
2. Upload to [Kaggle](https://kaggle.com/code) with a GPU accelerator (Tesla P100 or T4 x2).
3. The notebook automates dataset extraction, synthetic CCTV degradation augmentations, and YOLOv8 training at `imgsz=640`.

### Option B: Local Apple Silicon GPU (Metal / MPS)
Run directly on your Mac:
```bash
python3 backend1/train_apple_silicon_indian_traffic.py
```

---

## ⚖️ Legal & Compliance Notice
This system has been designed for state law enforcement compliance under the **Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023** and **Bharatiya Sakshya Adhiniyam (BSA) 2023**. All biometric, video, and license plate records must be stored with immutable SHA-256 audit trails.
