# Gujarat Police Innovation Challenge 2026
## Sentinel: Unified CCTV Integration Platform
**High-Level Design (HLD) & Submission Proposal**

**Category:** Category 1 (Students / Startups)
**Team Size:** 2 Members

---

## 1. Executive Summary
The Sentinel platform is a highly resilient, scalable, and intelligent CCTV integration middleware designed explicitly to meet the requirements of the Gujarat Police Innovation Challenge. Moving beyond a simple video management system (VMS), our solution acts as a **Real-Time Intelligence Layer**. It dynamically ingests feeds from disparate department networks, runs optimized Edge-AI pipelines (YOLOv8 + EasyOCR) to perform Automatic Number Plate Recognition (ANPR), and cross-references detections against live watchlists. The platform's killer feature is **Cross-Camera Vehicle Tracking**, allowing law enforcement to trace a suspect vehicle's precise geographical route across the grid in real-time.

---

## 2. Core Features & Capabilities

### 2.1 Dynamic Grid Ingestion & Resilience
Built specifically to pass the Sentinel Live Grid Test:
- **Dynamic Catalogue Integration:** Automatically polls the `/api/ingest` REST endpoint to map the active camera registry without hardcoding URLs.
- **TCP-Enforced RTSP Consumption:** Strictly utilizes `rtsp_transport=tcp` to bypass NAT/firewall UDP blockages and prevent corrupt frames.
- **Exponential Backoff Reconnect:** Gracefully handles abrupt feed cuts, loops, and decoder frame RPS errors by suspending inference and attempting silent reconnects (scaling from 2s to 30s) without dropping the main application thread.
- **Asynchronous PTS Tracking:** Relies on Presentation Timestamps (PTS) rather than unreliable FPS markers to guarantee pinpoint chronological accuracy for vehicle sightings.

### 2.2 Live Edge-AI Pipeline (ANPR)
- **Object Detection:** Employs YOLOv8 (nano) for ultra-fast vehicle localization (cars, trucks, buses, motorcycles).
- **Number Plate Recognition:** Uses EasyOCR optimized for Indian license plate formats (e.g., `GJ-01-XX-0000`).
- **Hardware Acceleration:** Fully compatible with NVIDIA CUDA and Apple Silicon MPS for sub-50ms inference times.

### 2.3 Cross-Camera Vehicle Tracking (The "Killer Feature")
- Law enforcement can search any registration number (e.g., `GJ-01-AB-1234`).
- The system instantly queries the PostgreSQL database for all sightings.
- Results are plotted onto a **GIS Map** (Leaflet) using Polyline route reconstruction, showing the chronological path, timestamps, and thumbnails of the vehicle across multiple cameras.

### 2.4 Watchlist & Real-Time Alerting
- Watchlist database with CRUD operations and priority levels (High/Medium/Low).
- **WebSocket Streaming:** The Python backend streams live alerts to the React frontend. If a watchlisted plate is detected, an instant red-flash notification with a snapshot appears on the dashboard—requiring zero page refreshes.

---

## 3. Technology Stack

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend UI** | React.js, Vite, Tailwind/Custom CSS | Fast, reactive rendering for video walls and GIS maps. |
| **Mapping** | Leaflet.js (CARTO Dark Matter) | High-performance spatial plotting for camera markers. |
| **Backend API** | Python, FastAPI | Asynchronous I/O, perfectly suited for WebSockets and ML serving. |
| **AI/ML Engine** | YOLOv8, EasyOCR, OpenCV, PyTorch | State-of-the-art vision models optimized for real-time Edge deployment. |
| **Database** | PostgreSQL + SQLAlchemy ORM | ACID compliance for logging millions of detections; easily extensible to PostGIS for complex spatial queries. |
| **Streaming** | WebRTC / HLS.js | Low-latency stream relay from RTSP to browser. |

---

## 4. Scalability Architecture (Path to 80,000 Cameras)

While our prototype handles the 50-camera sandbox, the architecture is designed to scale horizontally to the state-wide requirement of 80,000 cameras.

### 4.1 Distributed Edge Processing
We do not stream 80,000 video feeds to a central server—that would require unfeasible bandwidth. Instead, we utilize an **Edge-to-Core Architecture**:
1. **Edge AI Nodes (District Level):** Lightweight Kubernetes pods sit within the local municipal/department network. They ingest the local RTSP streams, run the YOLOv8 ANPR pipeline locally, and discard the heavy video frames.
2. **Metadata Streaming:** Only the *metadata* (Plate String, Timestamp, Camera ID, 50kb Snapshot) is transmitted to the Central Server. This reduces bandwidth requirements by **99.9%**.

### 4.2 Central Core Infrastructure
- **Message Broker:** Edge nodes publish metadata to a distributed **Apache Kafka** cluster, capable of handling 500,000 events per second.
- **Stream Processing:** Kafka consumers ingest the data into a distributed Elasticsearch/PostgreSQL cluster for sub-second text search and spatial indexing.
- **WebSocket Fan-out:** A Redis Pub/Sub layer broadcasts critical watchlist alerts to connected web clients in real-time.

---

## 5. Security & Privacy
- **Stateless AI:** The system retains vehicle metadata but does not record or store raw video archives, inherently protecting citizen privacy.
- **Role-Based Access Control (RBAC):** Different operators see only the cameras and alerts they are authorized for (e.g., Traffic Police cannot access Home Department cameras unless explicitly shared).

---

## 6. Implementation Timeline & Current Status
- **Phase 1 (Completed):** Interactive GIS Dashboard, Video Wall, and Watchlist modules deployed.
- **Phase 2 (Completed):** YOLOv8 + EasyOCR ANPR engine deployed via FastAPI.
- **Phase 3 (Completed):** Integrated fully with the Sentinel Hackathon Live Grid (TCP-RTSP, dynamic catalogue).
- **Phase 4 (Current):** Ready for Live Sandbox Evaluation.
