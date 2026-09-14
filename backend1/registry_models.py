"""
Sentinel Gujarat — Statewide CCTV Asset Registry Models
=========================================================
SQLAlchemy ORM models for the centralised camera registry and audit trail.
Designed for SQLite (current) with forward-compatibility for PostgreSQL/PostGIS.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Index
from database import Base
import datetime


class CameraRegistryItem(Base):
    """
    Master record for every CCTV camera asset onboarded into the
    statewide registry — spanning Police, Municipal Corporations,
    GSRTC Transport, Ports, Smart Cities, RTO, and institutional deployments.
    """
    __tablename__ = "camera_registry"

    id = Column(Integer, primary_key=True, index=True)

    # ─── Identification ──────────────────────────────────────────────
    camera_id = Column(String, unique=True, index=True, nullable=False)   # e.g. GJ-AMC-WZ-012
    name = Column(String, nullable=False)                                  # Human-readable label
    department = Column(String, index=True, nullable=False)                # AMC, SMC, Gujarat Police, GSRTC, GMB, RTO, Education
    ownership_model = Column(String, default="Government Owned")           # Government Owned, PPP, Smart City SPV, Leased

    # ─── Spatial / GIS ───────────────────────────────────────────────
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    district = Column(String, index=True, default="")
    city = Column(String, index=True, default="")
    taluka = Column(String, default="")
    ward_zone = Column(String, default="")                                 # Ward / Zone / Sector
    landmark = Column(String, default="")
    coverage_radius_meters = Column(Float, default=80.0)                   # Estimated FOV coverage
    mount_type = Column(String, default="Pole")                            # Pole, Mast, Gantry, Building, Underpass

    # ─── Technical Hardware ──────────────────────────────────────────
    camera_type = Column(String, default="Fixed Bullet")                   # PTZ, Fixed Bullet, Dome, ANPR RLVD, 360 Fisheye, Thermal
    make_model = Column(String, default="")                                # Manufacturer + Model
    resolution = Column(String, default="1080p")                           # 4K UHD, 5MP, 1080p, 720p
    ip_address = Column(String, default="")
    mac_address = Column(String, default="")
    rtsp_url = Column(String, default="")                                  # Inventory record, NOT live streaming

    # ─── Infrastructure & Storage ────────────────────────────────────
    connectivity_type = Column(String, default="Optical Fiber")            # Optical Fiber, 4G/5G Cellular, P2P RF, GSWAN
    bandwidth_mbps = Column(Float, default=10.0)
    storage_type = Column(String, default="Edge NVR")                      # Edge NVR, Central SAN, Local DVR, SD Card
    storage_capacity_tb = Column(Float, default=2.0)
    retention_days = Column(Integer, default=30)                           # 15, 30, 60, 90
    power_backup_hrs = Column(Float, default=4.0)

    # ─── Health & Lifecycle ──────────────────────────────────────────
    status = Column(String, index=True, default="ONLINE")                  # ONLINE, OFFLINE, MAINTENANCE, DEGRADED
    installation_date = Column(String, default="")                         # ISO date string
    amc_vendor = Column(String, default="")
    warranty_expiry_date = Column(String, default="")                      # ISO date string
    last_audit_date = Column(String, default="")                           # ISO date string

    # ─── Metadata ────────────────────────────────────────────────────
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Composite indexes for common query patterns
    __table_args__ = (
        Index("ix_registry_dept_status", "department", "status"),
        Index("ix_registry_city_district", "city", "district"),
        Index("ix_registry_camera_type", "camera_type"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "camera_id": self.camera_id,
            "name": self.name,
            "department": self.department,
            "ownership_model": self.ownership_model,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "district": self.district,
            "city": self.city,
            "taluka": self.taluka,
            "ward_zone": self.ward_zone,
            "landmark": self.landmark,
            "coverage_radius_meters": self.coverage_radius_meters,
            "mount_type": self.mount_type,
            "camera_type": self.camera_type,
            "make_model": self.make_model,
            "resolution": self.resolution,
            "ip_address": self.ip_address,
            "mac_address": self.mac_address,
            "rtsp_url": self.rtsp_url,
            "connectivity_type": self.connectivity_type,
            "bandwidth_mbps": self.bandwidth_mbps,
            "storage_type": self.storage_type,
            "storage_capacity_tb": self.storage_capacity_tb,
            "retention_days": self.retention_days,
            "power_backup_hrs": self.power_backup_hrs,
            "status": self.status,
            "installation_date": self.installation_date,
            "amc_vendor": self.amc_vendor,
            "warranty_expiry_date": self.warranty_expiry_date,
            "last_audit_date": self.last_audit_date,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_geojson_feature(self):
        """Export this camera as a GeoJSON Feature for GIS mapping."""
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [self.longitude, self.latitude],
            },
            "properties": self.to_dict(),
        }


class CameraAuditTrail(Base):
    """
    Immutable audit log for every change to a registry asset — onboarding,
    status updates, metadata edits, and maintenance scheduling.
    """
    __tablename__ = "camera_audit_trail"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String, index=True, nullable=False)
    action = Column(String, nullable=False)           # ONBOARDED, STATUS_UPDATE, METADATA_EDIT, MAINTENANCE_SCHEDULED, BULK_IMPORT
    performed_by = Column(String, default="System")
    department = Column(String, default="")
    details = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        Index("ix_audit_camera_action", "camera_id", "action"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "camera_id": self.camera_id,
            "action": self.action,
            "performed_by": self.performed_by,
            "department": self.department,
            "details": self.details,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
