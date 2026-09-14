"""
Sentinel Gujarat — CCTV Asset Registry & Gap-Analysis Engine
==============================================================
Business logic for asset onboarding, bulk import, querying, export, and
the mandatory automated Infrastructure Gap-Analysis Report.
"""

import csv
import io
import json
import datetime
import re
from typing import Dict, List, Optional, Any

from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from registry_models import CameraRegistryItem, CameraAuditTrail


# ─── Constants ─────────────────────────────────────────────────────────────────

VALID_DEPARTMENTS = [
    "Ahmedabad Municipal Corp (AMC)",
    "Surat Municipal Corp (SMC)",
    "Vadodara Municipal Corp (VMC)",
    "Rajkot Municipal Corp (RMC)",
    "Gujarat State Police",
    "GSRTC Transport",
    "Gujarat Maritime Board",
    "RTO & State Highways",
    "Education & Institutional",
    "Smart City SPV",
    "Revenue Department",
    "Forest Department",
]

VALID_CAMERA_TYPES = [
    "PTZ", "Fixed Bullet", "Dome", "ANPR RLVD", "360 Fisheye", "Thermal",
]

VALID_STATUSES = ["ONLINE", "OFFLINE", "MAINTENANCE", "DEGRADED"]

VALID_CONNECTIVITY = ["Optical Fiber", "4G/5G Cellular", "P2P RF", "GSWAN"]

VALID_STORAGE_TYPES = ["Edge NVR", "Central SAN", "Local DVR", "SD Card"]

VALID_RESOLUTIONS = ["4K UHD", "5MP", "1080p", "720p"]

VALID_MOUNT_TYPES = ["Pole", "Mast", "Gantry", "Building", "Underpass"]

VALID_OWNERSHIP = ["Government Owned", "PPP", "Smart City SPV", "Leased"]

# CSV Template columns
CSV_TEMPLATE_COLUMNS = [
    "camera_id", "name", "department", "ownership_model",
    "latitude", "longitude", "district", "city", "taluka", "ward_zone", "landmark",
    "coverage_radius_meters", "mount_type",
    "camera_type", "make_model", "resolution", "ip_address", "mac_address", "rtsp_url",
    "connectivity_type", "bandwidth_mbps", "storage_type", "storage_capacity_tb",
    "retention_days", "power_backup_hrs",
    "status", "installation_date", "amc_vendor", "warranty_expiry_date", "last_audit_date",
    "notes",
]

# ─── High-risk zones in Gujarat for gap analysis ──────────────────────────────
# Zones that MUST have camera coverage for infrastructure assessment.
CRITICAL_ZONES = [
    {"name": "SP Ring Road Corridor", "lat": 23.0225, "lon": 72.5714, "type": "Highway"},
    {"name": "NH-48 Ahmedabad-Vadodara Expressway", "lat": 22.6708, "lon": 72.8821, "type": "Highway"},
    {"name": "BRTS Corridor — Maninagar to Naroda", "lat": 23.0350, "lon": 72.6200, "type": "Urban Transit"},
    {"name": "Sabarmati Riverfront", "lat": 23.0396, "lon": 72.5684, "type": "Urban Critical"},
    {"name": "Diamond Bourse, Surat", "lat": 21.1702, "lon": 72.8311, "type": "Commercial"},
    {"name": "Mundra Port Perimeter", "lat": 22.7390, "lon": 69.7190, "type": "Coastal/Port"},
    {"name": "Kandla Port Perimeter", "lat": 23.0300, "lon": 70.2200, "type": "Coastal/Port"},
    {"name": "Pipavav Port Perimeter", "lat": 20.9100, "lon": 71.5300, "type": "Coastal/Port"},
    {"name": "GIDC Vatva Industrial Zone", "lat": 22.9700, "lon": 72.6300, "type": "Industrial"},
    {"name": "GIDC Naroda Industrial Zone", "lat": 23.0900, "lon": 72.6600, "type": "Industrial"},
    {"name": "Bhilad Checkpost — Maharashtra Border", "lat": 20.1700, "lon": 72.9500, "type": "Interstate Border"},
    {"name": "Shamlaji Checkpost — Rajasthan Border", "lat": 23.9600, "lon": 73.1300, "type": "Interstate Border"},
    {"name": "Samakhiyali Toll — Kutch Entry", "lat": 23.3000, "lon": 70.5000, "type": "Toll/Checkpoint"},
    {"name": "Ahmedabad Railway Station Area", "lat": 23.0286, "lon": 72.6000, "type": "Transport Hub"},
    {"name": "Surat Railway Station Area", "lat": 21.2052, "lon": 72.8371, "type": "Transport Hub"},
]


# ═══════════════════════════════════════════════════════════════════════════════
# ASSET MANAGEMENT ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class RegistryEngine:
    """Stateless service methods for the statewide CCTV registry."""

    # ── Onboard a Single Camera ──────────────────────────────────────────────

    @staticmethod
    def onboard_camera(db: Session, data: Dict[str, Any], performed_by: str = "System") -> Dict:
        """
        Validates and persists a single camera asset.
        Returns the new camera dict or raises ValueError with details.
        """
        # Required fields
        for field in ("camera_id", "name", "department", "latitude", "longitude"):
            if not data.get(field):
                raise ValueError(f"Missing required field: {field}")

        # Validate GPS bounds (Gujarat: ~20–25°N, 68–74°E)
        lat, lon = float(data["latitude"]), float(data["longitude"])
        if not (18.0 <= lat <= 27.0 and 67.0 <= lon <= 76.0):
            raise ValueError(f"GPS coordinates ({lat}, {lon}) are outside Gujarat region bounds")

        # Check for duplicate camera_id
        existing = db.query(CameraRegistryItem).filter_by(camera_id=data["camera_id"]).first()
        if existing:
            raise ValueError(f"Camera ID '{data['camera_id']}' already exists in registry")

        cam = CameraRegistryItem(
            camera_id=data["camera_id"],
            name=data["name"],
            department=data.get("department", "Gujarat State Police"),
            ownership_model=data.get("ownership_model", "Government Owned"),
            latitude=lat,
            longitude=lon,
            district=data.get("district", ""),
            city=data.get("city", ""),
            taluka=data.get("taluka", ""),
            ward_zone=data.get("ward_zone", ""),
            landmark=data.get("landmark", ""),
            coverage_radius_meters=float(data.get("coverage_radius_meters", 80)),
            mount_type=data.get("mount_type", "Pole"),
            camera_type=data.get("camera_type", "Fixed Bullet"),
            make_model=data.get("make_model", ""),
            resolution=data.get("resolution", "1080p"),
            ip_address=data.get("ip_address", ""),
            mac_address=data.get("mac_address", ""),
            rtsp_url=data.get("rtsp_url", ""),
            connectivity_type=data.get("connectivity_type", "Optical Fiber"),
            bandwidth_mbps=float(data.get("bandwidth_mbps", 10)),
            storage_type=data.get("storage_type", "Edge NVR"),
            storage_capacity_tb=float(data.get("storage_capacity_tb", 2)),
            retention_days=int(data.get("retention_days", 30)),
            power_backup_hrs=float(data.get("power_backup_hrs", 4)),
            status=data.get("status", "ONLINE"),
            installation_date=data.get("installation_date", ""),
            amc_vendor=data.get("amc_vendor", ""),
            warranty_expiry_date=data.get("warranty_expiry_date", ""),
            last_audit_date=data.get("last_audit_date", ""),
            notes=data.get("notes", ""),
        )
        db.add(cam)

        audit = CameraAuditTrail(
            camera_id=data["camera_id"],
            action="ONBOARDED",
            performed_by=performed_by,
            department=data.get("department", ""),
            details=f"Camera '{data['name']}' onboarded at ({lat}, {lon})",
        )
        db.add(audit)
        db.commit()
        db.refresh(cam)
        return cam.to_dict()

    # ── Bulk Import ──────────────────────────────────────────────────────────

    @staticmethod
    def bulk_import_csv(db: Session, csv_text: str, performed_by: str = "Bulk Import") -> Dict:
        """
        Parse CSV text, validate each row, and import valid cameras.
        Returns {imported: int, errors: [{row, field, message}], total: int}
        """
        reader = csv.DictReader(io.StringIO(csv_text))
        imported = 0
        errors = []
        total = 0

        for idx, row in enumerate(reader, start=2):  # row 1 = header
            total += 1
            try:
                RegistryEngine.onboard_camera(db, row, performed_by=performed_by)
                imported += 1
            except Exception as e:
                errors.append({"row": idx, "camera_id": row.get("camera_id", ""), "message": str(e)})

        return {"imported": imported, "errors": errors, "total": total}

    @staticmethod
    def bulk_import_json(db: Session, records: List[Dict], performed_by: str = "Bulk Import") -> Dict:
        """Import from a list of JSON objects."""
        imported = 0
        errors = []

        for idx, rec in enumerate(records, start=1):
            try:
                RegistryEngine.onboard_camera(db, rec, performed_by=performed_by)
                imported += 1
            except Exception as e:
                errors.append({"row": idx, "camera_id": rec.get("camera_id", ""), "message": str(e)})

        return {"imported": imported, "errors": errors, "total": len(records)}

    # ── Query / Filter ───────────────────────────────────────────────────────

    @staticmethod
    def query_registry(
        db: Session,
        department: Optional[str] = None,
        camera_type: Optional[str] = None,
        status: Optional[str] = None,
        city: Optional[str] = None,
        district: Optional[str] = None,
        ward_zone: Optional[str] = None,
        search: Optional[str] = None,
        geojson: bool = False,
    ) -> Any:
        """
        Multi-parameter filtered query. Returns list of dicts or GeoJSON FeatureCollection.
        """
        q = db.query(CameraRegistryItem)
        if department:
            q = q.filter(CameraRegistryItem.department == department)
        if camera_type:
            q = q.filter(CameraRegistryItem.camera_type == camera_type)
        if status:
            q = q.filter(CameraRegistryItem.status == status)
        if city:
            q = q.filter(CameraRegistryItem.city.ilike(f"%{city}%"))
        if district:
            q = q.filter(CameraRegistryItem.district.ilike(f"%{district}%"))
        if ward_zone:
            q = q.filter(CameraRegistryItem.ward_zone.ilike(f"%{ward_zone}%"))
        if search:
            pattern = f"%{search}%"
            q = q.filter(or_(
                CameraRegistryItem.camera_id.ilike(pattern),
                CameraRegistryItem.name.ilike(pattern),
                CameraRegistryItem.landmark.ilike(pattern),
            ))

        items = q.order_by(CameraRegistryItem.camera_id).all()

        if geojson:
            return {
                "type": "FeatureCollection",
                "features": [c.to_geojson_feature() for c in items],
            }
        return [c.to_dict() for c in items]

    # ── Statewide Stats / KPIs ───────────────────────────────────────────────

    @staticmethod
    def get_stats(db: Session) -> Dict:
        """High-level inventory metrics for the dashboard."""
        total = db.query(func.count(CameraRegistryItem.id)).scalar() or 0
        online = db.query(func.count(CameraRegistryItem.id)).filter(CameraRegistryItem.status == "ONLINE").scalar() or 0
        offline = db.query(func.count(CameraRegistryItem.id)).filter(CameraRegistryItem.status == "OFFLINE").scalar() or 0
        maintenance = db.query(func.count(CameraRegistryItem.id)).filter(CameraRegistryItem.status == "MAINTENANCE").scalar() or 0
        degraded = db.query(func.count(CameraRegistryItem.id)).filter(CameraRegistryItem.status == "DEGRADED").scalar() or 0

        # By department
        dept_counts = db.query(
            CameraRegistryItem.department, func.count(CameraRegistryItem.id)
        ).group_by(CameraRegistryItem.department).all()

        # By camera type
        type_counts = db.query(
            CameraRegistryItem.camera_type, func.count(CameraRegistryItem.id)
        ).group_by(CameraRegistryItem.camera_type).all()

        # By city
        city_counts = db.query(
            CameraRegistryItem.city, func.count(CameraRegistryItem.id)
        ).group_by(CameraRegistryItem.city).order_by(func.count(CameraRegistryItem.id).desc()).limit(15).all()

        # By connectivity
        conn_counts = db.query(
            CameraRegistryItem.connectivity_type, func.count(CameraRegistryItem.id)
        ).group_by(CameraRegistryItem.connectivity_type).all()

        # By resolution
        res_counts = db.query(
            CameraRegistryItem.resolution, func.count(CameraRegistryItem.id)
        ).group_by(CameraRegistryItem.resolution).all()

        # Avg retention
        avg_retention = db.query(func.avg(CameraRegistryItem.retention_days)).scalar() or 0

        return {
            "total_cameras": total,
            "status": {"online": online, "offline": offline, "maintenance": maintenance, "degraded": degraded},
            "by_department": {d: c for d, c in dept_counts},
            "by_camera_type": {t: c for t, c in type_counts},
            "by_city": {cy: c for cy, c in city_counts},
            "by_connectivity": {co: c for co, c in conn_counts},
            "by_resolution": {r: c for r, c in res_counts},
            "avg_retention_days": round(avg_retention, 1),
        }

    # ── Export ────────────────────────────────────────────────────────────────

    @staticmethod
    def export_csv(db: Session, **filters) -> str:
        """Export filtered registry as CSV text."""
        items = RegistryEngine.query_registry(db, **filters)
        if not items:
            return ""

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=CSV_TEMPLATE_COLUMNS)
        writer.writeheader()
        for item in items:
            row = {k: item.get(k, "") for k in CSV_TEMPLATE_COLUMNS}
            writer.writerow(row)
        return output.getvalue()

    @staticmethod
    def export_geojson(db: Session, **filters) -> Dict:
        """Export as GeoJSON FeatureCollection."""
        return RegistryEngine.query_registry(db, geojson=True, **filters)

    @staticmethod
    def get_csv_template() -> str:
        """Return a blank CSV template with headers and one example row."""
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=CSV_TEMPLATE_COLUMNS)
        writer.writeheader()
        writer.writerow({
            "camera_id": "GJ-DEPT-ZONE-001",
            "name": "Example Camera Name",
            "department": "Gujarat State Police",
            "ownership_model": "Government Owned",
            "latitude": "23.0225",
            "longitude": "72.5714",
            "district": "Ahmedabad",
            "city": "Ahmedabad",
            "taluka": "City",
            "ward_zone": "West Zone",
            "landmark": "Near Main Junction",
            "coverage_radius_meters": "80",
            "mount_type": "Pole",
            "camera_type": "Fixed Bullet",
            "make_model": "Hikvision DS-2CD2T46G2",
            "resolution": "1080p",
            "ip_address": "10.0.1.101",
            "mac_address": "AA:BB:CC:DD:EE:01",
            "rtsp_url": "",
            "connectivity_type": "Optical Fiber",
            "bandwidth_mbps": "10",
            "storage_type": "Edge NVR",
            "storage_capacity_tb": "2",
            "retention_days": "30",
            "power_backup_hrs": "4",
            "status": "ONLINE",
            "installation_date": "2023-01-15",
            "amc_vendor": "ABC Security Solutions",
            "warranty_expiry_date": "2026-01-15",
            "last_audit_date": "2025-06-01",
            "notes": "",
        })
        return output.getvalue()

    # ── Audit Trail ──────────────────────────────────────────────────────────

    @staticmethod
    def get_audit_trail(db: Session, camera_id: Optional[str] = None, limit: int = 200) -> List[Dict]:
        q = db.query(CameraAuditTrail)
        if camera_id:
            q = q.filter(CameraAuditTrail.camera_id == camera_id)
        return [a.to_dict() for a in q.order_by(CameraAuditTrail.timestamp.desc()).limit(limit).all()]

    # ═══════════════════════════════════════════════════════════════════════════
    # AUTOMATED GAP-ANALYSIS ENGINE (MANDATORY)
    # ═══════════════════════════════════════════════════════════════════════════

    @staticmethod
    def generate_gap_analysis_report(db: Session) -> Dict:
        """
        Synthesises risk scoring across four dimensions:
        1. Spatial Coverage & Blind Spots
        2. Ageing Infrastructure Audit
        3. Retention Compliance Deficit
        4. Connectivity & Offline Hotspots

        Returns executive summary with risk-rated findings and priority actions.
        """
        all_cameras = db.query(CameraRegistryItem).all()
        total = len(all_cameras)
        today = datetime.date.today()

        # ─── 1. Spatial Coverage & Blind Spots ──────────────────────────
        uncovered_zones = []
        for zone in CRITICAL_ZONES:
            zone_lat, zone_lon = zone["lat"], zone["lon"]
            # Check if any camera is within ~2km of this critical zone
            nearby = [c for c in all_cameras if _haversine_km(c.latitude, c.longitude, zone_lat, zone_lon) < 2.0]
            if not nearby:
                uncovered_zones.append({
                    "zone_name": zone["name"],
                    "zone_type": zone["type"],
                    "latitude": zone_lat,
                    "longitude": zone_lon,
                    "risk": "CRITICAL" if zone["type"] in ("Highway", "Coastal/Port", "Interstate Border") else "HIGH",
                    "recommendation": f"Deploy minimum 2 cameras with ANPR at {zone['name']}",
                })

        # ─── 2. Ageing Infrastructure Audit ─────────────────────────────
        ageing_cameras = []
        for c in all_cameras:
            if c.installation_date:
                try:
                    install = datetime.date.fromisoformat(c.installation_date)
                    age_years = (today - install).days / 365.25
                    if age_years > 4:
                        ageing_cameras.append({
                            "camera_id": c.camera_id,
                            "name": c.name,
                            "department": c.department,
                            "city": c.city,
                            "installation_date": c.installation_date,
                            "age_years": round(age_years, 1),
                            "resolution": c.resolution,
                            "risk": "CRITICAL" if age_years > 6 or c.resolution == "720p" else "HIGH",
                            "recommendation": "Immediate capital replacement" if age_years > 6 else "Schedule upgrade in next procurement cycle",
                        })
                except (ValueError, TypeError):
                    pass

        # Obsolete 720p cameras (even if not old)
        obsolete_720p = [c for c in all_cameras if c.resolution == "720p" and c.camera_id not in {a["camera_id"] for a in ageing_cameras}]
        for c in obsolete_720p:
            ageing_cameras.append({
                "camera_id": c.camera_id,
                "name": c.name,
                "department": c.department,
                "city": c.city,
                "installation_date": c.installation_date,
                "age_years": None,
                "resolution": "720p",
                "risk": "HIGH",
                "recommendation": "Upgrade to minimum 1080p resolution",
            })

        # Expired warranty
        expired_warranty = []
        for c in all_cameras:
            if c.warranty_expiry_date:
                try:
                    warranty_end = datetime.date.fromisoformat(c.warranty_expiry_date)
                    if warranty_end < today:
                        expired_warranty.append({
                            "camera_id": c.camera_id,
                            "name": c.name,
                            "department": c.department,
                            "warranty_expiry_date": c.warranty_expiry_date,
                            "days_expired": (today - warranty_end).days,
                        })
                except (ValueError, TypeError):
                    pass

        # ─── 3. Retention Compliance Deficit ────────────────────────────
        # <30 days = non-compliant with statutory electronic evidence (BSA 2023 / Section 65B)
        low_retention = []
        for c in all_cameras:
            if c.retention_days and c.retention_days < 30:
                low_retention.append({
                    "camera_id": c.camera_id,
                    "name": c.name,
                    "department": c.department,
                    "city": c.city,
                    "retention_days": c.retention_days,
                    "storage_type": c.storage_type,
                    "storage_capacity_tb": c.storage_capacity_tb,
                    "risk": "CRITICAL" if c.retention_days < 15 else "HIGH",
                    "recommendation": f"Upgrade storage to achieve minimum 30-day retention (currently {c.retention_days} days)",
                })

        # ─── 4. Connectivity & Offline Hotspots ────────────────────────
        offline_cameras = [c for c in all_cameras if c.status in ("OFFLINE", "DEGRADED")]
        connectivity_issues = []
        for c in offline_cameras:
            connectivity_issues.append({
                "camera_id": c.camera_id,
                "name": c.name,
                "department": c.department,
                "city": c.city,
                "status": c.status,
                "connectivity_type": c.connectivity_type,
                "bandwidth_mbps": c.bandwidth_mbps,
                "risk": "CRITICAL" if c.status == "OFFLINE" else "HIGH",
            })

        # Cellular/wireless bottleneck cameras
        wireless_bottleneck = [c for c in all_cameras if c.connectivity_type in ("4G/5G Cellular", "P2P RF") and c.bandwidth_mbps < 5]
        for c in wireless_bottleneck:
            if c.camera_id not in {ci["camera_id"] for ci in connectivity_issues}:
                connectivity_issues.append({
                    "camera_id": c.camera_id,
                    "name": c.name,
                    "department": c.department,
                    "city": c.city,
                    "status": c.status,
                    "connectivity_type": c.connectivity_type,
                    "bandwidth_mbps": c.bandwidth_mbps,
                    "risk": "MEDIUM",
                })

        # ─── Risk Summary ──────────────────────────────────────────────
        all_findings = uncovered_zones + ageing_cameras + low_retention + connectivity_issues
        critical_count = sum(1 for f in all_findings if f.get("risk") == "CRITICAL")
        high_count = sum(1 for f in all_findings if f.get("risk") == "HIGH")
        medium_count = sum(1 for f in all_findings if f.get("risk") == "MEDIUM")

        # Overall health score (0–100)
        if total == 0:
            health_score = 0
        else:
            penalty = (critical_count * 5 + high_count * 3 + medium_count * 1) / total * 10
            health_score = max(0, min(100, round(100 - penalty)))

        return {
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "total_cameras": total,
            "health_score": health_score,
            "risk_summary": {
                "critical": critical_count,
                "high": high_count,
                "medium": medium_count,
                "low": max(0, total - critical_count - high_count - medium_count),
            },
            "uncovered_zones": uncovered_zones,
            "ageing_infrastructure": ageing_cameras,
            "expired_warranty": expired_warranty,
            "retention_violations": low_retention,
            "connectivity_issues": connectivity_issues,
            "priority_actions": _build_priority_actions(uncovered_zones, ageing_cameras, low_retention, connectivity_issues),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Approximate distance in km using Haversine formula."""
    import math
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _build_priority_actions(uncovered, ageing, retention, connectivity) -> List[Dict]:
    """Synthesise top-priority procurement and remediation actions."""
    actions = []

    if uncovered:
        actions.append({
            "priority": 1,
            "category": "Coverage Gap",
            "title": f"Deploy cameras at {len(uncovered)} uncovered high-risk zones",
            "details": f"Critical zones including {', '.join(z['zone_name'] for z in uncovered[:3])} lack camera coverage. Estimated procurement: {len(uncovered) * 2} cameras.",
            "estimated_cameras": len(uncovered) * 2,
            "risk_level": "CRITICAL",
        })

    critical_ageing = [a for a in ageing if a.get("risk") == "CRITICAL"]
    if critical_ageing:
        actions.append({
            "priority": 2,
            "category": "Hardware Replacement",
            "title": f"Replace {len(critical_ageing)} critically aged/obsolete cameras",
            "details": f"Cameras exceeding 6 years or running 720p resolution require immediate capital replacement.",
            "estimated_cameras": len(critical_ageing),
            "risk_level": "CRITICAL",
        })

    critical_retention = [r for r in retention if r.get("risk") == "CRITICAL"]
    if critical_retention:
        actions.append({
            "priority": 3,
            "category": "Storage Compliance",
            "title": f"Upgrade storage for {len(critical_retention)} cameras with <15-day retention",
            "details": "Non-compliant with Bharatiya Sakshya Adhiniyam / Section 65B statutory electronic evidence requirements.",
            "estimated_cameras": len(critical_retention),
            "risk_level": "CRITICAL",
        })

    offline_cams = [c for c in connectivity if c.get("risk") == "CRITICAL"]
    if offline_cams:
        actions.append({
            "priority": 4,
            "category": "Network Remediation",
            "title": f"Restore connectivity for {len(offline_cams)} offline cameras",
            "details": "Cameras in OFFLINE state indicate network or power failure requiring immediate field team dispatch.",
            "estimated_cameras": len(offline_cams),
            "risk_level": "CRITICAL",
        })

    # Lower priority items
    high_ageing = [a for a in ageing if a.get("risk") == "HIGH"]
    if high_ageing:
        actions.append({
            "priority": 5,
            "category": "Scheduled Upgrade",
            "title": f"Schedule upgrade for {len(high_ageing)} cameras in next procurement cycle",
            "details": "Cameras aged 4–6 years or running sub-optimal resolution should be upgraded during next budgetary allocation.",
            "estimated_cameras": len(high_ageing),
            "risk_level": "HIGH",
        })

    high_retention = [r for r in retention if r.get("risk") == "HIGH"]
    if high_retention:
        actions.append({
            "priority": 6,
            "category": "Storage Expansion",
            "title": f"Expand storage capacity for {len(high_retention)} cameras with 15–29 day retention",
            "details": "Increase NVR/SAN capacity or reduce recording bitrate to meet minimum 30-day retention.",
            "estimated_cameras": len(high_retention),
            "risk_level": "HIGH",
        })

    return actions
