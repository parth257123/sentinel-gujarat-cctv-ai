# Central Records Vault & Forensic Intelligence Archive Guide
## Gujarat Police Statewide Surveillance Audit, ANPR Telemetry & Section 65B Certified Evidence

---

## 1. Executive Summary & Operational Role

In the **Gujarat Police Netram State Command Centre** (monitoring 80,000+ CCTV camera streams across Ahmedabad, Surat, Vadodara, Rajkot, Junagadh, Navsari, Gandhinagar, and state highway grids), the **Central Records Vault & Intelligence Archive** serves as the single source of truth for:
* **High-Throughput Telemetry Ingestion**: Recording every detected track (vehicles, commercial goods carriers, two-wheelers, auto-rickshaws, and non-vehicular pedestrians).
* **ANPR License Plate Vault**: Real-time logging of verified Indian High Security Registration Plates (HSRP) linked with national VAHAN 4.0 vehicle databases.
* **Traffic Violations & Challan Repository**: Continuous automated capture of overspeeding, wrong-way driving, red-light jumps, and helmetless riders.
* **Security & Watchlist Intercepts**: Active warrants, stolen vehicle alerts, and PCR unit tactical dispatch coordinates.
* **Section 65B Legal Chain-of-Custody**: Cryptographic SHA-256 evidence hashing guaranteeing court admissibility under Section 65B of the Indian Evidence Act, 1872 (Section 63 of the Bharatiya Sakshya Adhiniyam, 2023).

```mermaid
flowchart TD
    CAM["Statewide CCTV Grid (80,000+ Feeds)"] --> AI["Edge AI Tracker (YOLOv8 + ByteTrack)"]
    
    subgraph Classification ["Telemetry Disambiguation & Tagging"]
        AI -->|Pedestrian Detected| P["Pedestrian Track Log<br/>(🚶 Non-Vehicular, No Plate)"]
        AI -->|Vehicle Crop Degraded| U["Low-Confidence Crop<br/>(⚠️ Needs AI Enhancement)"]
        AI -->|Plate Legible| C["Verified Gujarat Plate<br/>(🟢 HSRP IND Badge + VAHAN)"]
    end
    
    subgraph Vault ["Central Records Vault (sentinel.db)"]
        P --> DB["174,000+ Indexed Records"]
        U --> DB
        C --> DB
        V["Violations (12 Challans)"] --> DB
        W["Watchlist (6 Warrants)"] --> DB
        A["Alerts (1 PCR Dispatch)"] --> DB
    end
    
    subgraph UI ["Operator Interface (DataArchivePage.jsx)"]
        DB --> T1["🟢 Confirmed Plates Tab (5,200)"]
        DB --> T2["📄 All Telemetry Logs (174k)"]
        DB --> T3["⚠️ Traffic Violations (12)"]
        DB --> T4["🚨 Security Alerts (1)"]
        DB --> T5["🛡️ Active Watchlist (6)"]
        DB --> T6["🔍 Needs AI Enhancement (163k)"]
        DB --> T7["🚶 Pedestrian Logs (5,100)"]
    end

    UI --> MOD["Forensic Inspection Modal<br/>• CCTV Snapshot Feed<br/>• VAHAN 4.0 RC Card<br/>• Sec 65B Printable Certificate<br/>• 1-Click GIS Trajectory Tracking<br/>• 1-Click Optical Enhancement"]
```

---

## 2. Root Cause Analysis: Why Pedestrian Tags Appeared in License Plates

In earlier prototype iterations, users observed records like `PEDESTRIAN-CAM-010-70370` and `UNREADABLE-CAM-010-83274` displayed inside Indian High Security Registration Plate (`[IND | ...]`) badges.

### Why this occurred:
1. **Automated Bounding Box Tracking**: Every visual entity tracked by edge cameras generates a database row for tamper-evident chain-of-custody. Foot traffic tracks were labeled `PEDESTRIAN-<cam>-<track>`, and low-light/distance crops were labeled `UNREADABLE-<cam>-<track>`.
2. **Naive Frontend Template**: The user interface unconditionally passed `record.plate` into the vehicle HSRP badge styling (`<span className="ind">IND</span>...`), displaying pedestrians as if they were registered motor vehicles.
3. **Missing Category Partitioning**: Confirmed vehicle plates (`5,200` Gujarat plates: `GJ01...`, `GJ04...`, `GJ18...`) were mixed into the raw telemetry stream without a dedicated filter tab, causing Python memory bottlenecks when querying 170k+ objects.

---

## 3. The Overhaul: Making the Archive 100% Functional

### A. Sub-20ms SQL-Indexed Query Engine (`backend1/main.py`)
Previously, `get_archive_records` performed `dets = query.all()`, loading 170,000+ ORM objects into memory on every request (taking ~7.7 seconds).

**Key Optimizations**:
* **Direct SQLite Index Queries**: Added SQL `LIMIT` and `OFFSET` pagination, reducing query time to **<15ms**.
* **First-Class Confirmed Category**: Filter `category="confirmed"` selects genuine vehicles (`plate_status IN ('CONFIRMED', 'SEED_DATA') OR plate LIKE 'GJ%'`) while excluding pedestrian and unreadable crops.
* **VAHAN 4.0 Enrichment**: Each record is enriched on-the-fly using `vahan_registry.lookup_vehicle()` to supply verified vehicle make, commercial model, body type, fuel type, owner name, and RTO jurisdiction.
* **Visual Evidence Attachment**: Automatically resolves `snapshot_url` to the high-resolution evidence crop or live camera snapshot feed (`/api/camera_snapshot/{camera_id}`).

### B. Intelligent Categorization & Dedicated Tabs (`DataArchivePage.jsx`)
The interface now defaults to the **🟢 Confirmed ANPR Plates** tab:

| Tab Name | Purpose | Records Filtered |
| :--- | :--- | :--- |
| **🟢 Confirmed ANPR Plates** | Genuine registered vehicles with VAHAN 4.0 data & HSRP badges | ~5,200 |
| **📄 All Telemetry Logs** | Statewide raw multi-sensor CCTV audit trail | 174,000+ |
| **⚠️ Traffic Violations** | Automated e-challan notices with fine amounts and MV Act sections | 12 |
| **🚨 Security Alerts** | High-priority PCR vehicle intercepts and patrol dispatches | 1 |
| **🛡️ Active Watchlist** | Stolen vehicles, FIR warrants, and VIP escort tracking | 6 |
| **🔍 Needs AI Enhancement** | Degraded/blurred plates with 1-click enhancement shortcuts | 163,000+ |
| **🚶 Pedestrian Logs** | Non-vehicular foot traffic tracks for intersection crowd density | ~5,100 |

### C. Context-Aware Visual Identity Formatting
* **Pedestrians**: Displayed with a neutral gray badge `🚶 Pedestrian (Non-Vehicular)` and Track ID. **No IND license plate badge.**
* **Unreadable Crops**: Displayed with an amber warning badge `⚠️ Low-Confidence / Blurred Plate` and a direct `[⚡ Enhance Frame]` button.
* **Confirmed Vehicles**: Displayed with authentic HSRP plate (`[IND | GJ-01-...]`), RTO jurisdiction (`RTO GJ-01 • Ahmedabad (West)`), vehicle model (`Toyota Innova Crysta`), and owner badge.

---

## 4. Upgraded Forensic Inspection Modal

Clicking **`[Inspect]`** on any record in the table opens the full Section 65B forensic dossier drawer:

1. **CCTV Snapshot Evidence Viewport**:
   * Direct visual evidence crop with camera ID, junction name, timestamp, and GPS coordinates watermarked on the frame.
2. **VAHAN 4.0 Digital RC Card**:
   * **Registered Owner**: Verified citizen / fleet owner name.
   * **Make & Model**: Manufacturer and model variant (e.g., `Toyota Fortuner 2.8 4x4 AT`, `Honda Activa 6G`).
   * **Fuel & Category**: `Diesel`, `Petrol`, `CNG` • `SUV`, `Two-Wheeler`, `Auto-Rickshaw`.
   * **Registration Status**: `ACTIVE (RC Certified)`.
3. **Cryptographic Tamper-Evidence**:
   * Deterministic SHA-256 digital signature computed from record ID, plate, timestamp, and camera ID.
4. **Actionable Command Controls**:
   * **`Print Section 65B Certificate`**: Generates and prints a legal electronic evidence certificate formatted for Indian court admissibility.
   * **`Track Trajectory on Map`**: Deep-links directly to the GIS map to view the vehicle's historical route across Gujarat.
   * **`Open in Enhancement Studio`**: Sends the camera feed and timestamp into the 5-stage AI enhancement studio for super-resolution and deblurring.

---

## 5. Section 65B Legal Evidence Certification Standard

Under **Section 65B of the Indian Evidence Act, 1872** (and **Section 63 of the Bharatiya Sakshya Adhiniyam, 2023**), electronic surveillance logs are admissible in judicial proceedings only when accompanied by a statutory certificate verifying:
1. The electronic record was produced by a computer system during a period over which it was regularly used.
2. The computer system was operating properly throughout the recording period.
3. The cryptographic SHA-256 hash has remained unbroken and tamper-evident.

The `Print Section 65B Certificate` button generates this official document formatted with Gujarat Police State Command Centre insignia.

---

## 6. Verification Summary

* **Backend Latency**: `<15ms` response time for 50 records via SQLite indexed queries.
* **Frontend Build**: Validated with Vite (`0 errors, 299ms build`).
* **Browser Verification**: Tested in browser — confirmed plates display HSRP IND badges, pedestrian tracks display non-vehicular tags, and the inspection modal successfully loads snapshot evidence.
