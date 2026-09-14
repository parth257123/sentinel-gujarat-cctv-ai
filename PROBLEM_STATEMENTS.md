# Gujarat Police Innovation Challenge 2026 — Official Problem Statements & Architectural Models
**Initiative:** Home Department, Government of Gujarat | State Crime Record Bureau (SCRB)  
**Hackathon Portal:** `https://sentinel.gujarat.gov.in/problems`  
**Scale:** ~80,000 CCTV Cameras across 26 Government Departments | Statewide Deployment (~1,000 km span)

---

## 📌 Executive Summary & The Core Challenge

### The Existing State of CCTV in Gujarat
At present, **26 different Government Departments** (Police, Municipal Corporations, RTO, Food & Civil Supplies, Ports & Transport, Urban Development, etc.) operate independent, siloed CCTV ecosystems across Gujarat:
1. **Heterogeneous Infrastructure:** Multiple disparate hardware vendors (Hikvision, Dahua, CP Plus, Bosch, Honeywell, etc.), proprietary VMS platforms, diverse codecs (H.264, H.265), and mixed analog/IP setups.
2. **Geographical Dispersion:** Camera networks distributed across 1,000+ km—from border outposts to Valsad, Dahod, Somnath, Jamnagar, Surat, Rajkot, and Dwarka.
3. **Fragmented Storage & Retention:** Disjointed retention policies (some 7 days, others 15–30 days) with no unified retrieval.
4. **Disconnected Government Databases:** Critical law enforcement registries—**eGujCop** (Gujarat CCTNS), **VAHAN** & **SARTHI** (vehicle registrations & licenses), **AFIS / NAFIS** (biometric/fingerprint), and missing/stolen vehicle databases—cannot cross-reference live surveillance feeds automatically.
5. **Private Public-Facing Feeds:** Requirement to securely ingest permitted public-facing feeds (malls, commercial complexes, housing societies) during emergencies.

---

## 🏛️ The 5 Official Solution Models

### Model 1: Registry & GIS Foundation *(Mandatory Foundation)*
> *A unified inventory, health monitoring, and geospatial mapping layer for every surveillance asset in Gujarat.*

- **Scope:** Centralized catalog of all camera assets across departments without central streaming or recording.
- **Key Capabilities:**
  - **Asset Onboarding:** Bulk CSV/Excel import, manual form entry, and automated REST API registration.
  - **GIS Map View:** Interactive multi-layer geospatial interface (Leaflet/Mapbox/OpenLayers) filtering by department, camera model, IP range, status, and lens FOV angle.
  - **Health Monitoring:** Real-time ping/heartbeat monitoring, latency tracking, offline camera alerting, and maintenance logs.
  - **Coverage & Gap Analysis:** Automated polygon coverage analysis to identify surveillance blind spots and aging equipment.
  - **Governance:** Role-Based Access Control (RBAC), departmental multi-tenancy, and immutable audit trails.

---

### Model 2: Unified Viewing & Edge-Aware Analytics
> *A single-pane-of-glass operations interface aggregating feeds directly from department VMS/NVRs without disrupting local operations.*

- **Scope:** Direct feed aggregation via RTSP, ONVIF, WebRTC, and vendor SDKs into a configurable control room video wall.
- **Key Capabilities:**
  - **Direct Stream Ingestion:** Low-latency HLS/WebRTC streaming without intermediate proxy lag.
  - **Selective AI/ANPR Metadata Extraction:** Real-time metadata generation (number plate OCR, vehicle class, speed, color) without storing heavy raw video centrally.
  - **Camera Indexing & Search:** Instant search of past vehicle sightings across cameras by license plate, vehicle type, and time window.
  - **Dynamic Video Wall:** Flexible grid layouts (1x1, 2x2, 3x3, 4x4) with alarm popup triggers on detected violations.

---

### Model 3: VMS Federation & Middleware Layer
> *An enterprise event bus and adapter layer connecting disparate third-party VMS platforms into a federated intelligence grid.*

- **Scope:** Decoupled middleware architecture allowing each department to keep its existing VMS while publishing alerts and telemetry centrally.
- **Key Capabilities:**
  - **Vendor Adapter Framework:** Pluggable connector microservices for Milestone, Genetec, Hikvision iVMS, Dahua DSS, CP Plus, etc.
  - **Unified Event Bus:** High-throughput message queuing (Kafka / RabbitMQ / Redis Streams) for event and telemetry routing.
  - **Cross-System Event Correlation:** Correlating events across multiple disparate feeds (e.g., matching a vehicle entering an RTO track and later spotted on a Municipal junction).
  - **Unified Alert Dashboard:** Centralized triage queue for law enforcement operators with standardized alert taxonomy.

---

### Model 4: Central VMS & High-Capacity AI Platform
> *An end-to-end centralized command, recording, AI analytics, and multi-agency coordination cloud.*

- **Scope:** Comprehensive enterprise VMS supporting centralized feed ingestion, distributed storage, route reconstruction, and deep learning analytics.
- **Key Capabilities:**
  - **Full-Scale Stream Management:** Centralized ingestion supporting RTSP, RTMP, WebRTC, and low-bandwidth degradation modes.
  - **Tiered Storage Architecture:**
    - *Hot Storage (0–7 Days):* Fast SSD cache for instant playback, forensic review, and active investigation.
    - *Warm Storage (8–30 Days):* High-density HDD/Ceph object storage for standard retention compliance.
    - *Cold Storage (30+ Days):* Compressed/archived cloud storage for flagged evidence clips.
  - **Deep AI Pipeline:**
    - **Indian Vehicle Detection & Classification:** 10 standardized classes (pedestrian, car, two-wheeler, auto-rickshaw, bus, truck/tempo, emergency vehicle, van, heavy machinery, others).
    - **High-Accuracy ANPR:** Multi-line, high-angle, reflective, dirty/distorted plate recognition tuned for Indian HSRP standards.
    - **Facial Recognition System (FRS):** Suspect matching against criminal mugshot databases.
    - **Statewide Route Reconstruction:** Reconstructing full spatial-temporal journeys of suspect vehicles across multiple junctions.
  - **Government Database Connectors:** Live synchronization with **VAHAN**, **SARTHI**, and **eGujCop** with sub-second alert triggers on hit matches.
  - **Enterprise Scalability:** Kubernetes microservice orchestration, GPU pooling, load balancing, and high-availability failover designed for ~80,000 camera streams.

---

### Model 5: Hybrid / Innovative Architecture *(The Sentinel Approach)*
> *Combines the Model 1 GIS Registry Foundation, Model 2/3 Federated Edge-AI Ingestion, and Model 4 Centralized Database Correlation.*

- **Edge-Cloud Synergy:** Performs lightweight detection, ANPR, and deblurring at edge/regional gateways to preserve statewide WAN bandwidth; streams only metadata and alert clips to the state command center.
- **Unified Command Portal:** Integrates GIS mapping, real-time video wall, live AI telemetry, watchlist alarms, and forensic investigation into one single unified dashboard.

---

## 🎯 Specific Technical & Operational Problem Statements

### Problem Statement 1: Heterogeneous Video Stream Ingestion & Low-Bandwidth Delivery
- **Challenge:** Ingest feeds from 30+ disparate camera models across 26 departments with erratic network bandwidth (from high-speed fiber in Ahmedabad to 4G/remote links in Kutch/Dwarka).
- **Deliverables:** Adaptive bitrate streaming (WebRTC / HLS), ONVIF/RTSP auto-discovery, frame-dropping resilience, and bandwidth-thrifty metadata streaming.

### Problem Statement 2: Dense & Non-Standard Indian Traffic AI Detection
- **Challenge:** Standard western computer vision models fail on Indian roads due to chaotic lane discipline, high density of two-wheelers, 3-wheel auto-rickshaws, customized tempos, and occluded objects.
- **Deliverables:** Custom-trained YOLO model (YOLO11s/YOLO12) covering the 10 distinct classes with high mAP under adverse lighting (noon glare, dusk, nighttime sodium lighting).

### Problem Statement 3: Indian HSRP & Non-Standard License Plate Recognition (ANPR)
- **Challenge:** High failure rate of standard OCR on bent, dirty, regional script, multi-line, or low-resolution number plates captured at steep camera angles.
- **Deliverables:** Specialized 2-stage ANPR pipeline (Plate Detection via YOLO + High-Precision Character Extraction & Lexicon Correction) yielding sub-second VAHAN matching.

### Problem Statement 4: Real-Time Watchlist Database Cross-Referencing & Alert Generation
- **Challenge:** Real-time correlation of thousands of detections per second against government watchlists (Stolen Vehicles, Suspicious Persons, eGujCop Wanted Lists) without degrading streaming FPS.
- **Deliverables:** High-speed in-memory indexing (Redis/SQLite/Postgres), instant alert dispatch (visual flash, audio alarm, audit log, SMS/dispatch dispatching), and hit verification logs.

### Problem Statement 5: Video Quality Enhancement & Motion Deblurring
- **Challenge:** CCTV cameras running at 15–25 FPS produce severe motion blur on speeding vehicles, especially during evening/night hours under streetlighting.
- **Deliverables:** Automated motion deblurring filters (Wiener deconvolution, CLAHE contrast enhancement, sharpening) applied prior to AI inference.

### Problem Statement 6: Statewide Asset GIS Registry, Health Auditing & Gap Analysis
- **Challenge:** Police and administrative authorities lack a single map showing all functional cameras, coverage blind spots, and offline devices across Gujarat.
- **Deliverables:** Full GIS platform with live ping health telemetry, uptime stats, department filters, and blind-spot heatmaps for strategic camera placement.

---

## 📋 Evaluation Criteria Defined by Gujarat Police

| Evaluation Area | Weight / Focus |
| :--- | :--- |
| **1. Successful Test Case** | Live ingestion and execution of analytics on official Gujarat Police test feeds. |
| **2. Solution Presentation** | Clarity of system architecture, modularity, and justification of technology choices. |
| **3. Solution Architecture (HLD)** | Vendor neutrality, security, open standards, and avoidance of vendor lock-in. |
| **4. Working Demonstration** | Real-time platform operation, video walls, alert triggers, and responsive UI. |
| **5. Analytics Quality** | Precision & recall of vehicle detection, ANPR read accuracy, and false-positive suppression. |
| **6. Scalability & PoC Readiness** | Concrete capacity plan to scale from pilot feeds up to 80,000 cameras statewide. |
| **7. Bonus Capabilities** | Edge deblurring, route reconstruction, offline sync, and automated audit logging. |
