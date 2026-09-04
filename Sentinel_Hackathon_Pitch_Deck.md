# Sentinel Hackathon Pitch Deck Outline
**Title:** Sentinel: Real-Time Intelligence & Cross-Camera Tracking
**Format:** 10 Slides (Target presentation time: 7 minutes)

---

## Slide 1: Title Slide
- **Project Name:** Sentinel Platform
- **Tagline:** Unifying Gujarat's 80,000 Cameras into a Real-Time Intelligence Grid
- **Team Name:** [Your Team Name]
- **Category:** Category 1 (Students / Startups)
- **Visual:** High-resolution screenshot of your Dark Mode GIS Dashboard.

## Slide 2: The Problem
- **Current State:** 6 different departments, 6 different VMS silos.
- **The Issue:** If a stolen vehicle crosses from Ahmedabad Municipal limits into Gandhinagar RTO limits, tracking it requires manual coordination across multiple control rooms. By the time footage is found, the suspect is gone.
- **Visual:** A fragmented puzzle showing different camera brands (Hikvision, Bosch, CP Plus) disconnected from each other.

## Slide 3: Our Solution (The Intelligence Layer)
- We didn't just build a video player. We built an **Active Intelligence Middleware**.
- It sits above the fragmented hardware, ingests the streams dynamically, and runs Edge-AI on every frame.
- It turns dumb pixels into structured, searchable data.
- **Visual:** Clean diagram showing heterogeneous cameras connecting to the Sentinel Middleware, outputting clean structured data.

## Slide 4: Key Feature 1 - Cross-Camera Route Tracking
- **The "Wow" Factor:** Search for any vehicle registration (e.g., `GJ-01-AB-1234`).
- The system instantly queries the entire state-wide grid.
- It plots chronological sightings on an interactive GIS map, drawing a physical path of the vehicle's movement across jurisdictions.
- **Visual:** Screenshot of the `VehicleSearchPage.jsx` showing the polyline route reconstruction across the map.

## Slide 5: Key Feature 2 - Real-Time Watchlist Alerts
- Instant alerting across the entire grid.
- Add a wanted suspect or stolen vehicle to the watchlist.
- Within 200ms of that vehicle appearing on *any* integrated camera, the system triggers a WebSocket push notification with a red flashing alert and snapshot to the operator's dashboard.
- **Visual:** Screenshot of the red Alert Card popup on the dashboard.

## Slide 6: Passing the Sentinel Grid Test
- We built this explicitly for the Hackathon's Live Grid parameters:
  - **Dynamic Catalogue:** We don't hardcode; we poll `/api/ingest`.
  - **TCP-Enforced:** Strict RTSP-over-TCP to bypass UDP firewall drops.
  - **Resilient Backoff:** Built-in exponential reconnects for feed cuts and loop resets.
- **Visual:** Code snippet showing `OPENCV_FFMPEG_CAPTURE_OPTIONS = "rtsp_transport;tcp"`.

## Slide 7: The AI Pipeline (Under the Hood)
- **Vehicle Detection:** YOLOv8 (nano) running on accelerated hardware (CUDA/MPS).
- **OCR:** EasyOCR specialized for Indian plate formats.
- **Speed:** Processing multiple frames per second per stream with sub-50ms inference.
- **Visual:** Flowchart: `Frame Capture ➔ YOLOv8 Crop ➔ EasyOCR Read ➔ PostgreSQL Save ➔ WebSocket Broadcast`.

## Slide 8: Scaling to 80,000 Cameras
- We don't stream 80,000 videos to Gandhinagar. That requires impossible bandwidth.
- **Edge Architecture:** Lightweight Kubernetes pods run at the district level. They ingest local video, run the AI locally, and *only send the text metadata* (Plate + Timestamp + 50kb Image) to the central server.
- **Data Reduction:** Bandwidth reduced by 99.9%.
- **Event Bus:** Apache Kafka handles the massive influx of metadata, funneling it to an Elasticsearch cluster.
- **Visual:** Edge-to-Core Architecture Diagram.

## Slide 9: Tech Stack
- **Frontend:** React, Vite, Leaflet, Recharts (Modern, fast, dark-mode UI).
- **Backend:** Python FastAPI, SQLAlchemy, WebSockets (Asynchronous, high concurrency).
- **AI/ML:** PyTorch, YOLOv8, EasyOCR, OpenCV.
- **Database:** PostgreSQL.
- **Visual:** Logos of React, Python, PostgreSQL, PyTorch, YOLO.

## Slide 10: Conclusion & Live Demo Transition
- **Summary:** A scalable, intelligent, and highly resilient platform ready for statewide deployment.
- **Next:** "We will now transition to the live sandbox demonstration to track a vehicle across the grid."
- **Visual:** Large "LIVE DEMO" text with contact info at the bottom.
