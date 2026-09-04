# Sentinel — Gujarat Police Unified CCTV Intelligence Platform
## Comprehensive Technical Architecture, Model Deliverables & Operations Manual

---

## 1. Executive Summary & Vision

In the State of Gujarat, **26 distinct Government Departments** operate independent CCTV ecosystems with heterogeneous hardware (analog and IP), diverse Video Management Systems (Milestone, Hikvision, CP Plus, Dahua, Honeywell), disparate storage architectures (cloud, on-premise NVRs), and varying retention policies (7 to 30+ days).

**Sentinel** is an enterprise-grade surveillance integration and AI intelligence platform built to federate this fragmented infrastructure without disturbing existing departmental operations.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SENTINEL COMMAND CENTER                                │
│          [GIS Map] • [Video Wall] • [Violations] • [Watchlist] • [Analytics]          │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ WebSocket / REST API
┌──────────────────────────────────────────┴─────────────────────────────────────────────┐
│                          VMS FEDERATION & MIDDLEWARE LAYER                             │
│       ┌──────────────┬──────────────┬──────────────┬──────────────┬─────────────┐      │
│       │  Milestone   │  Hikvision   │   CP Plus    │    Dahua     │  Honeywell  │      │
│       │   Adapter    │   Adapter    │   Adapter    │   Adapter    │   Adapter   │      │
│       └──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴─────┬───────┘      │
└──────────────┼──────────────┼──────────────┼──────────────┼─────────────┼──────────────┘
               │              │              │              │             │
┌──────────────▼──────────────▼──────────────▼──────────────▼─────────────▼──────────────┐
│                    26 STATE GOVERNMENT DEPARTMENT SURVEILLANCE GRIDS                   │
│   Home Dept (Police) • Transport / RTO • Urban Dev • Mines & Minerals • Forest • Ports │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Implementation of State Integration Models

Sentinel addresses all four architectural integration models stipulated by the State Government:

### Model 1: Central CCTV Registry & GIS Foundation
* **Statewide Asset Inventory**: Tracks all cameras with standardized metadata: Camera ID, Department, City, GPS Coordinates, Camera Type (PTZ, Fixed, Bullet), Vendor, Resolution, Storage Type, Retention Period, and IP.
* **Geographical Precision**: Coordinates calibrated across all Gujarat ranges—from border checkpoints (Dahod MP Border, Bhilad Maharashtra Border, Kutch-Kandla Port) to coastal pilgrimage corridors (Dwarka, Somnath).
* **Interactive District Navigation**: Leaflet-based GIS UI with quick-focus district selectors and smooth `flyTo` navigation.

### Model 2: Unified Viewing Platform
* **Zero Disruption Direct Feeds**: Aggregates live video streams across departmental VMS nodes via RTSP, HLS, and MJPEG without replacing departmental hardware.
* **Low-Latency Multiplexer**: Streams video to multi-grid video walls with low bandwidth footprint.

### Model 3: VMS Federation & Event Correlation Middleware
* **Multi-Vendor Adapter Engine (`backend1/vms_federation_middleware.py`)**:
  * Normalized cross-platform REST & ONVIF adapters for Milestone, Hikvision HikCentral, CP Plus UniSight, Dahua DSS Pro, and Honeywell MAXPRO.
* **Cross-Department Event Correlation**: Correlates events across jurisdictions (e.g., matching a suspect vehicle seen at a Mining checkpost with a Police city camera within a rolling time window).

### Model 4: Central AI Analytics & Traffic Enforcement Engine
* **High-Accuracy Vehicle Intelligence**: Fine-tuned YOLOv12 neural network accelerated by GPU hardware (Apple Silicon MPS / NVIDIA CUDA).
* **Robust Attribute Classification**: Classifies vehicle categories (Cars, SUVs, Auto-Rickshaws, Motorcycles, Scooters, Trucks, Buses, Ambulances) with multi-frame majority voting to eliminate label flicker.
* **Optical Speed Radar & Automated e-Challan**: Calculates line-crossing speeds, flags violations against statutory limits under the Motor Vehicles Act, and generates digital evidence.

---

## 3. Statewide Camera Registry & Verified Geolocation

Sentinel integrates **30 verified CCTV nodes** distributed across Gujarat:

| Camera ID | District / Range | Camera Node & Specific Junction | Latitude | Longitude | Primary Department |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `CAM-001` | **Ahmedabad** | Visat T-Junction RLVD | `23.0984` | `72.5986` | Traffic Police |
| `CAM-002` | **Ahmedabad** | SG Highway (Pakwan Cross Roads) | `23.0373` | `72.5120` | Traffic Police |
| `CAM-003` | **Ahmedabad** | Ashram Road (Income Tax Circle) | `23.0416` | `72.5714` | State Police HQ |
| `CAM-004` | **Ahmedabad** | Paldi Circle Corridor | `23.0135` | `72.5647` | Municipal Corp |
| `CAM-005` | **Ahmedabad** | Kalupur Station Ingress | `23.0270` | `72.6015` | Railway Police |
| `CAM-006` | **Gandhinagar** | Sector 17 State Police Bhawan | `23.2230` | `72.6492` | State Police HQ |
| `CAM-007` | **Gandhinagar** | Infocity Highway Corridor | `23.1895` | `72.6288` | Traffic Police |
| `CAM-008` | **Gandhinagar** | CH-0 Highway Circle | `23.2156` | `72.6369` | RTO & Transport |
| `CAM-009` | **Surat** | Ring Road (Udhna Darwaja) | `21.1852` | `72.8360` | Traffic Police |
| `CAM-010` | **Surat** | Athwa Gate Multi-Lane Junction | `21.1820` | `72.8124` | State Police HQ |
| `CAM-011` | **Surat** | Dumas Road VR Mall Junction | `21.1448` | `72.7667` | Municipal Corp |
| `CAM-012` | **Vadodara** | Alkapuri Central Circle | `22.3106` | `73.1706` | Traffic Police |
| `CAM-013` | **Vadodara** | Sayajigunj Station Terminus | `22.3129` | `73.1889` | State Police HQ |
| `CAM-014` | **Vadodara** | Golden Chowkdi NH-48 Arterial | `22.3488` | `73.2384` | RTO & Transport |
| `CAM-015` | **Rajkot** | Trikon Baug City Center | `22.3021` | `70.8022` | Traffic Police |
| `CAM-016` | **Rajkot** | Kalawad Road KKV Chowk | `22.2890` | `70.7681` | State Police HQ |
| `CAM-017` | **Bhavnagar** | Crescent Circle City Center | `21.7684` | `72.1465` | Traffic Police |
| `CAM-018` | **Bhavnagar** | Ghogha Coastal Port Checkpoint | `21.7588` | `72.1642` | Coastal Marine Police |
| `CAM-019` | **Jamnagar** | Teen Batti Chowk Commercial | `22.4707` | `70.0655` | Traffic Police |
| `CAM-020` | **Jamnagar** | Khambhalia Highway Bypass | `22.4496` | `70.0380` | State Police HQ |
| `CAM-021` | **Devbhumi Dwarka** | Dwarkadhish Temple Corridor | `22.2442` | `68.9685` | State Police HQ |
| `CAM-022` | **Devbhumi Dwarka** | Okha Port Coastal Terminal | `22.4703` | `69.0712` | Coastal Marine Police |
| `CAM-023` | **Gir Somnath** | Somnath Temple Coastal Bypass | `20.8880` | `70.4010` | Traffic Police |
| `CAM-024` | **Gir Somnath** | Veraval Harbor Fishing Gate | `20.9067` | `70.3685` | Coastal Marine Police |
| `CAM-025` | **Junagadh** | Majevdi Gate Historical Ingress | `21.5236` | `70.4579` | State Police HQ |
| `CAM-026` | **Junagadh** | Bhavnath Taleti (Girnar Base) | `21.5312` | `70.4980` | Forest & Wildlife |
| `CAM-027` | **Dahod** | MP-Gujarat Interstate RTO Checkpost | `22.8385` | `74.2550` | RTO & Transport |
| `CAM-028` | **Valsad** | Tithal Road Crossing | `20.6092` | `72.9288` | Traffic Police |
| `CAM-029` | **Valsad** | Bhilad NH-48 Maharashtra Border | `20.2520` | `72.8870` | State Police HQ |
| `CAM-030` | **Kutch** | Gandhidham / Kandla Port Gate | `23.0753` | `70.1337` | Port & Coastal Police |

---

## 4. Key Functional Modules & UI Workflows

```
                           SENTINEL APPLICATION CORE
   ┌───────────────────────┬───────────────────────┬───────────────────────┐
   │ 1. GIS Registry Map   │ 2. Unified Video Wall │ 3. Vehicle Tracking   │
   │    • District Focus   │    • Multi-Grid Live  │    • Multi-Hop Path   │
   │    • GPS Metadata     │    • Speed Stream     │    • Visual ReID      │
   ├───────────────────────┼───────────────────────┼───────────────────────┤
   │ 4. Violations Engine  │ 5. Watchlist Matrix   │ 6. Real Analytics     │
   │    • Speed Radar      │    • Intercept Alert  │    • DB Aggregates    │
   │    • e-Challan Issue  │    • PCR Dispatch ETA │    • RTO Distribution │
   └───────────────────────┴───────────────────────┴───────────────────────┘
```

### Module 1: Camera Registry & GIS Map (`MapComponents.jsx`)
* **Interactive District Zoom**: Jump directly to any district (Dwarka, Somnath, Dahod, Surat, Ahmedabad, Kutch) with smooth camera tracking.
* **Tactical Glowing Pins**: Minimalist, non-overlapping circular status indicators with hover tooltips displaying camera ID and junction name.
* **Live Telemetry Inspection**: Clicking any marker opens detailed hardware, retention, and live video stream.

### Module 2: Unified Video Wall (`VideoWallPage.jsx`)
* **Multi-View Modes**: Switch between 2x2, 3x3, and focused single-camera tactical view.
* **Federation Indicators**: Shows source VMS platform (Milestone, Hikvision, CP Plus, etc.) and departmental ownership tag.

### Module 3: Vehicle Search & Cross-Camera Trajectory (`VehicleSearchPage.jsx`)
* **Multi-Hop Trajectory Reconstruction**: Reconstructs time-stamped transit routes across sequential camera junctions.
* **Visual ReID Matching**: Reconstructs journeys using vehicle class, color, and optical feature embeddings.

### Module 4: Traffic Violations & e-Challan Enforcement (`ViolationsPage.jsx`)
* **Optical Speed Radar**: Live YOLOv12 tracking computing line-crossing velocity.
* **Clean Overlays**: Displays vehicle category and speed (e.g. `Car | 26 km/h`, `Truck | 32 km/h`) without noisy OCR percentages.
* **e-Challan Generation**: Issues official challans with Motor Vehicles Act sections and Parivahan portal integration.

### Module 5: Watchlist & Intercept Matrix (`WatchlistPage.jsx` & `AlertsPage.jsx`)
* **Target Lookout Management**: Register suspect vehicles with categorization (Criminal, Stolen, Hit & Run).
* **Tactical Intercept Dispatch**: Automatic computation of the nearest PCR patrol unit and estimated intercept ETA.

### Module 6: Surveillance Analytics & Insights (`AnalyticsPage.jsx`)
* **Computed Live Analytics**: All metrics computed directly from SQLite database records (no hardcoded metrics).
* **24-Hour Traffic Distribution**: Visualizes peak traffic flows.
* **Gujarat Regional RTO Breakdown**: Categorizes vehicles by RTO syntax (GJ-01, GJ-05, GJ-06, etc.).

---

## 5. Backend REST & WebSocket API Reference

The backend is built on **FastAPI** with SQLite persistence and WebSocket broadcasting.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/cameras` | Returns full 30-camera GIS registry with GPS coordinates |
| `GET` | `/api/cameras/{id}/status` | Returns online/offline heartbeat of a camera node |
| `GET` | `/api/analytics` | Aggregates real telemetry, classification breakdown, and hourly stats |
| `GET` | `/api/violations` | Lists detected violations with filter by status, type, and camera |
| `GET` | `/api/violations/stats` | Summary KPI metrics (total fines, collection rates, violations) |
| `POST` | `/api/violations/issue_challan/{id}` | Formally issues an e-Challan with legal Section 65B metadata |
| `GET` | `/api/watchlist` | Lists active security lookouts and cross-reference database |
| `POST` | `/api/watchlist` | Adds a new vehicle to the state security watchlist |
| `GET` | `/api/alerts` | Returns real-time intercept alert records and dispatch status |
| `POST` | `/api/alerts/{id}/dispatch` | Dispatches nearest PCR patrol unit with assigned officer notes |
| `GET` | `/api/federation/adapters` | Returns Model 3 connected VMS adapters (Milestone, Hikvision, CP Plus) |
| `GET` | `/api/federation/events` | Lists federated cross-department security events |
| `GET` | `/api/reid/track/{plate}` | Traces cross-camera chronological transit path for a vehicle |
| `GET` | `/api/real_speed_stream` | MJPEG video stream with YOLOv12 vehicle tracking & optical speed |
| `WS` | `/ws` | Real-time WebSocket channel broadcasting live detections and alerts |

---

## 6. Database Schema (SQLite / PostgreSQL)

### `detections` Table
```sql
CREATE TABLE detections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plate VARCHAR INDEX,
    camera_id VARCHAR INDEX,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    confidence FLOAT,
    vehicle_type VARCHAR,
    color VARCHAR DEFAULT 'White',
    sharpness FLOAT DEFAULT 0.0,
    embedding TEXT,            -- 1024-d visual feature vector
    snapshot_path VARCHAR
);
```

### `watchlist` Table
```sql
CREATE TABLE watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plate VARCHAR UNIQUE INDEX,
    reason VARCHAR,
    category VARCHAR DEFAULT 'Criminal',
    severity VARCHAR DEFAULT 'CRITICAL',
    vehicle_model VARCHAR,
    owner_name VARCHAR,
    fir_number VARCHAR,
    added_by VARCHAR,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `alerts` Table
```sql
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchlist_id INTEGER,
    plate VARCHAR INDEX,
    camera_id VARCHAR INDEX,
    camera_name VARCHAR,
    city VARCHAR,
    reason VARCHAR,
    severity VARCHAR DEFAULT 'CRITICAL',
    confidence FLOAT,
    vehicle_type VARCHAR,
    color VARCHAR,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    acknowledged INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'ACTIVE',  -- ACTIVE, DISPATCHED, RESOLVED
    dispatched_unit VARCHAR,
    pcr_distance_km FLOAT,
    pcr_eta_mins INTEGER,
    officer_notes TEXT
);
```

### `violations` Table
```sql
CREATE TABLE violations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challan_id VARCHAR UNIQUE INDEX,
    plate VARCHAR INDEX,
    camera_id VARCHAR INDEX,
    camera_name VARCHAR,
    city VARCHAR,
    violation_type VARCHAR,
    severity VARCHAR DEFAULT 'HIGH',
    speed_recorded FLOAT,
    speed_limit FLOAT,
    fine_amount INTEGER DEFAULT 1000,
    mv_act_section VARCHAR DEFAULT 'Section 184 MV Act',
    vehicle_type VARCHAR DEFAULT 'Car',
    color VARCHAR DEFAULT 'White',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR DEFAULT 'PENDING',  -- PENDING, ISSUED, PAID
    owner_name VARCHAR,
    evidence_frame VARCHAR
);
```

---

## 7. How to Run & Verify the System

### Prerequisites
* Python 3.10+ with PyTorch & Ultralytics
* Node.js 18+ & npm

### Starting the Backend
```bash
cd "backend1"
uvicorn main:app --port 8000 --host 0.0.0.0
```
* Backend will be accessible at: `http://localhost:8000`
* Interactive API Documentation (Swagger): `http://localhost:8000/docs`

### Starting the Frontend
```bash
cd "sentinel"
npm install
npm run dev
```
* Sentinel UI will be accessible at: `http://localhost:5173`

---

## 8. Summary of Completed Improvements

1. **Statewide Geolocation**: Verified all 30 camera GPS pins across Gujarat (Ahmedabad, Surat, Vadodara, Rajkot, Bhavnagar, Jamnagar, Dwarka, Somnath, Junagadh, Dahod, Valsad, Kutch).
2. **Removed Clutter & False Overlays**: Eliminated large overlapping text banners in favor of minimal glowing pins with hover tooltips.
3. **Cleaned Detection Overlays**: Removed noisy confidence percentages and track ID numbers; video feeds now display clean vehicle categories and speed readings.
4. **Eliminated Fake/Unused Views**: Streamlined the application to 7 active, fully functional enterprise pages connected to the database.
5. **Real Analytics Engine**: All statistics, hourly distributions, and regional breakdowns are calculated live from real SQLite records.
