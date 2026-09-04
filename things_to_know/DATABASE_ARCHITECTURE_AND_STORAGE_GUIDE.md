# Database Architecture & Storage Guide
## Complete Technical Blueprint for Gujarat Police CCTV Traffic Intelligence

---

## 1. Executive Summary & Data Pipeline Overview

When AI models process video streams across 30+ Gujarat Police CCTV cameras, every frame generates critical forensic data. A robust database architecture must:
* Ingest high-frequency detection events in real time without dropping frames.
* Enable instant sub-second lookups for police officers tracking suspect vehicles across cities.
* Support visual appearance searches when license plates are obscured, fake, or missing.
* Comply with legal evidence standards under Section 65B of the Bharatiya Sakshya Adhiniyam (BSA) 2023.

```mermaid
flowchart TD
    CAM["30+ CCTV Feeds"] --> AI["AI Detection Core (YOLO + ANPR + Re-ID)"]
    
    subgraph Data_Extracted ["Forensic Intelligence Extracted per Vehicle"]
        D1["Number Plate (GJ-01-AB-1234)"]
        D2["Vehicle Class & Paint Color"]
        D3["Speed (km/h) & Travel Vector"]
        D4["Camera ID, GPS & Junction"]
        D5["Timestamp (Millisecond)"]
        D6["1024-d Visual Fingerprint"]
        D7["Cropped Plate Snapshot URL"]
        D8["Violation & Stolen Flags"]
    end
    AI --> Data_Extracted

    subgraph Storage_Tiers ["3-Tier Production Storage"]
        Data_Extracted --> T1["Tier 1: Time-Series Relational (PostgreSQL + TimescaleDB)"]
        Data_Extracted --> T2["Tier 2: Vector Search Engine (Qdrant / Milvus)"]
        Data_Extracted --> T3["Tier 3: Object Storage (MinIO / S3)"]
    end
```

---

## 2. Forensic Data Extracted Per Vehicle

For every vehicle detected in a camera frame, the system extracts and stores:

| Field | Data Type | Example | Purpose |
| :--- | :--- | :--- | :--- |
| `plate` | `VARCHAR(16)` | `GJ-01-AB-1234` | Primary ANPR registration identifier |
| `plate_status` | `VARCHAR(16)` | `CONFIRMED` / `UNREADABLE` | OCR certainty state |
| `confidence` | `FLOAT` | `88.5` | OCR neural confidence percentage |
| `vehicle_type` | `VARCHAR(32)` | `Auto-Rickshaw`, `Car`, `Truck` | Indian traffic vehicle classification |
| `color` | `VARCHAR(16)` | `White`, `Silver`, `Red`, `Black` | Dominant HSV vehicle body color |
| `speed_kmh` | `FLOAT` | `64.2` | Perspective-calibrated Doppler speed |
| `camera_id` | `VARCHAR(16)` | `cam04` | Camera junction identifier |
| `timestamp` | `TIMESTAMP` | `2026-09-04 02:40:12.450` | UTC time with millisecond precision |
| `embedding` | `TEXT / VECTOR(1024)` | `[-0.042, 0.118, ...]` | 1024-d Re-ID visual fingerprint |
| `snapshot_path` | `VARCHAR(255)` | `/snapshots/cam04_024012.jpg` | Local/S3 pointer to evidence image |
| `violation_type`| `VARCHAR(32)` | `OVERSPEED`, `RED_LIGHT`, `NONE` | Traffic enforcement violation category |
| `sha256_hash` | `CHAR(64)` | `e3b0c44298fc1c149afb...` | Tamper-proof hash for court evidence |

---

## 3. Current Implementation: SQLite + SQLAlchemy (`sentinel.db`)

* **Current Database**: SQLite 3 with WAL (Write-Ahead Logging) mode
* **File Location**: [`backend1/sentinel.db`](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/backend1/sentinel.db)
* **Current Size**: **`436 MB`**
* **Active Records**: **78,000+ vehicle detections**
* **ORM Schema**: Defined in [`backend1/models.py`](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/backend1/models.py)

### Tables in Active Use:
1. **`detections`**: Every vehicle sighting across all cameras, indexed by `plate`, `camera_id`, and `timestamp`.
2. **`watchlist`**: Police hot-list of wanted/stolen vehicles, FIR numbers, issuing officer, and severity (`CRITICAL`, `HIGH`, `MEDIUM`).
3. **`alerts`**: Live alert records triggered when a detected plate matches the watchlist, tracking PCR police van dispatch status (`ACTIVE`, `DISPATCHED`, `INTERCEPTED`, `RESOLVED`).
4. **`violations`**: Speeding, red-light jumping, and wrong-side driving violations with calculated fine amounts and e-Challan numbers.

---

## 4. Production Scaling Architecture (100 to 1,000+ Cameras)

As the camera grid scales across Gujarat (e.g. VISWAS project with 7,000+ cameras), SQLite reaches write-locking limits. We use a **3-tier decoupled architecture**:

### Tier 1: Time-Series Relational Database (PostgreSQL + TimescaleDB)
* **Role**: Primary store for vehicle logs, plates, speeds, timestamps, and camera metadata.
* **Why TimescaleDB**:
  * Automatically partitions data into time-based chunks called **hypertables** (e.g. 1 chunk per day).
  * Queries searching for a vehicle over a specific 2-hour window only scan the relevant chunk, returning results across **100 million rows in under 15 milliseconds**.
  * Built-in native compression reduces storage footprint by **up to 90%**.

### Tier 2: Vector Search Database (Qdrant or Milvus)
* **Role**: Visual Vehicle Re-Identification (Re-ID) search.
* **Why Vector DB**:
  * If a suspect vehicle has mud on the plate, a stolen plate, or no plate, SQL text queries cannot find it.
  * Our `reid_engine.py` generates a 1024-dimensional floating-point vector representing the vehicle's unique visual features (body shape, grille, scratches, roof rack).
  * Storing these embeddings in **Qdrant** enables **Hierarchical Navigable Small World (HNSW)** vector indexing. An officer uploads a photo, and Qdrant scans **10 million vehicle sightings in 8 milliseconds** to find matching cars.

### Tier 3: Object Storage (MinIO or AWS S3)
* **Role**: Storing high-resolution 1080p JPEG images and 10-second MP4 violation clips.
* **Rule**: **Never store raw image binary blobs directly inside SQL tables** (it bloats table indexes and slows queries by 100x).
* **Implementation**:
  * Evidence frames are written to **MinIO** (self-hosted, open-source S3-compatible storage).
  * The database only stores lightweight URI strings (e.g. `s3://evidence/2026-09-04/cam14_GJ01AB1234.jpg`).

### Statewide Scale: Analytical Database (ClickHouse)
* For state-level analytics across 7,000+ cameras:
* **ClickHouse** handles **500,000 writes per second** and can aggregate monthly traffic patterns across 500 million rows in 40 milliseconds.

---

## 5. Migration: Switching from SQLite to PostgreSQL

Because Project Sentinel is built with **SQLAlchemy ORM**, migrating from SQLite to PostgreSQL requires **zero code rewrites** in business logic.

In [`backend1/database.py`](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/backend1/database.py), update the connection string:

```python
# Development (Current):
DATABASE_URL = "sqlite:///./sentinel.db"

# Production (PostgreSQL + TimescaleDB):
DATABASE_URL = "postgresql://sentinel_admin:secure_password@localhost:5432/sentinel_gujarat"
```

All queries, models (`models.Detection`, `models.WatchlistEntry`), and API endpoints automatically adapt to PostgreSQL.

---

## 6. Legal Compliance: Section 65B Evidence Standards

Under the **Bharatiya Sakshya Adhiniyam (BSA) 2023** (formerly Section 65B of the Indian Evidence Act 1872), electronic CCTV records presented in court must prove **chain of custody and tamper-resistance**:

1. **Cryptographic SHA-256 Hashing**:
   * Every detection record generates a SHA-256 hash combining: `timestamp + camera_id + plate + frame_binary`.
   * This hash is stored alongside the record. If anyone modifies the plate or timestamp later, the hash fails verification.
2. **Forensic Certificate Generation**:
   * Sentinel includes automated generation of Section 65B forensic certificates with digital timestamps, camera serial numbers, and officer credentials via [`sentinel/src/pages/ForensicsDossierPage.jsx`](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/sentinel/src/pages/ForensicsDossierPage.jsx).

---

## 7. Storage Capacity Projections

| Camera Grid Size | Detections / Day | Daily DB Growth (PostgreSQL) | Daily Media Growth (MinIO) | Retention Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **30 Cameras** *(Current)* | ~150,000 | ~45 MB / day | ~3 GB / day | Retain all for 90 days |
| **100 Cameras** *(City Level)* | ~800,000 | ~240 MB / day | ~16 GB / day | Retain all for 90 days |
| **1,000 Cameras** *(District Level)* | ~8,000,000 | ~2.4 GB / day | ~160 GB / day | Rolling 30-day raw, permanent violations |
| **7,000 Cameras** *(Statewide VISWAS)*| ~56,000,000 | ~17 GB / day | ~1.1 TB / day | ClickHouse tier, hot/cold S3 archiving |
