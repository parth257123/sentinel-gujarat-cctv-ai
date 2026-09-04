# Implementation Plan: YOLO + Google GenAI Multimodal Vision Pipeline for Gujarat CCTV

Integrate the **YOLOv8 + Google Gemini Multimodal GenAI Vision Pipeline** inspired by the state-of-the-art traffic tech architecture into the Sentinel Gujarat Police CCTV platform.

## System Architecture

```
[ Gujarat CCTV Video Stream ]
           │
           ▼
[ YOLOv8 Object Detection (on Apple M4 Pro Metal GPU) ]
           │
           ├──▶ Vehicle Bounding Box & Coordinates
           └──▶ Speed Estimation (px/sec ➔ km/h calibration)
           │
      (Vehicle Crop)
           │
           ▼
[ Google Gemini Vision GenAI / Local Vision Engine ]
           │
           ├──▶ Exact License Plate (e.g. GJ-01-KY-7973)
           ├──▶ Manufacturer / Brand (Hyundai, Maruti, Mahindra, Tata)
           ├──▶ Exact Model (Creta SUV, Swift, Scorpio, Auto-Rickshaw)
           └──▶ Primary & Secondary Colors (Polar White, Phantom Black)
           │
           ▼
[ SQLite / PostgreSQL Database + WebSocket Real-Time Broadcast ]
           │
           ▼
[ Sentinel React Frontend: Video Wall, Vehicle Search & Investigator ]
```

---

## User Review Required

> [!NOTE]
> **API Key Setup**: The Google Gemini GenAI pipeline can use a `GOOGLE_API_KEY` (Free Tier from [Google AI Studio](https://aistudio.google.com)). If no API key is provided, the system seamlessly falls back to the **Local Apple M4 Pro Neural Vision Engine** (Zero Cost, 100% Offline).

---

## Proposed Changes

### Backend Components

#### [NEW] [backend1/genai_vision.py](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/backend1/genai_vision.py)
* Creates the `GeminiVehicleAnalyzer` class using `google-generativeai` / `langchain_google_genai`.
* Given a cropped vehicle image (numpy array or base64):
  * Prompts Gemini 1.5 Flash: *"Analyze this vehicle image from Gujarat CCTV. Return JSON with: `plate_number`, `make`, `model`, `vehicle_type`, `color`, `confidence`, `notes`."*
  * Formats response into structured forensic detection records.
  * Includes local M4 Pro fallback heuristic extractor if offline or API key absent.

#### [MODIFY] [backend1/m4_pro_vision.py](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/backend1/m4_pro_vision.py)
* Integrates `genai_vision.py` into the M4 Pro YOLOv8 live video processing loop.
* Implements traffic line cross-detection for real-time vehicle speed estimation.
* On detecting confident vehicles, triggers async GenAI inspection and broadcasts enriched metadata (`make`, `model`, `color`, `plate`, `speed`).

#### [MODIFY] [backend1/main.py](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/backend1/main.py)
* Adds `/api/genai/analyze_crop` endpoint for on-demand forensic inspection of any vehicle snapshot.
* Adds `/api/genai/status` endpoint showing GenAI API status and M4 Pro GPU metrics.

---

### Frontend Components

#### [MODIFY] [sentinel/src/pages/VideoWallPage.jsx](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/sentinel/src/pages/VideoWallPage.jsx)
* Displays GenAI enriched vehicle tags on the tactical AI overlay (`[HYUNDAI CRETA] WHITE • 94% • 54 km/h`).
* Shows real-time GenAI extraction badge in the HUD.

#### [MODIFY] [sentinel/src/pages/VehicleSearchPage.jsx](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/sentinel/src/pages/VehicleSearchPage.jsx)
* Adds a **"GenAI Deep Vehicle Analysis"** inspection panel.
* Clicking any live crop displays the full GenAI breakdown:
  * Manufacturer & Model (*e.g., Maruti Suzuki Swift, Mahindra Bolero*)
  * Extracted Plate (*e.g., GJ-01-M4-4821*)
  * Visual Attributes (*Color, Body Style, Speed*)
  * Section 65B Export Button

---

## Verification Plan

### Automated Tests
* Run `python3 -c "import google.generativeai; print('GenAI SDK OK')"`
* Run `npm run build` in `sentinel/` to ensure zero frontend build errors.

### Manual Verification
1. Launch the backend with `python3 -m uvicorn main:app --host 0.0.0.0 --port 8000`.
2. Open `http://localhost:5173/` in browser.
3. Open **Surveillance Video Wall** and verify live bounding boxes with Make/Model tags.
4. Open **Vehicle Search & Re-ID** and inspect a live vehicle crop to verify the GenAI analysis panel.
