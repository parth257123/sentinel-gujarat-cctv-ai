from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from database import Base
import datetime

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    plate = Column(String, index=True)
    plate_status = Column(String, default="CONFIRMED")  # CONFIRMED | UNREADABLE
    camera_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    confidence = Column(Float)
    vehicle_type = Column(String)
    color = Column(String, default="White")
    sharpness = Column(Float, default=0.0)
    embedding = Column(Text, nullable=True)  # JSON-encoded 1024-d ReID vector
    snapshot_path = Column(String, nullable=True)
    source = Column(String, default="AI_INFERENCE")  # AI_INFERENCE | SEED | MANUAL | UPLOAD

class WatchlistEntry(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    plate = Column(String, unique=True, index=True)
    reason = Column(String)
    category = Column(String, default="Criminal")  # Criminal, Stolen, Hit & Run, VIP Escort, Traffic
    severity = Column(String, default="CRITICAL")  # CRITICAL, HIGH, MEDIUM
    vehicle_model = Column(String, nullable=True)
    owner_name = Column(String, nullable=True)
    fir_number = Column(String, nullable=True)
    added_by = Column(String, default="Crime Branch Control Room")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AlertRecord(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    watchlist_id = Column(Integer, nullable=True)
    plate = Column(String, index=True)
    camera_id = Column(String, index=True)
    camera_name = Column(String)
    city = Column(String)
    reason = Column(String)
    severity = Column(String, default="CRITICAL")
    confidence = Column(Float)
    vehicle_type = Column(String)
    color = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    acknowledged = Column(Integer, default=0)
    status = Column(String, default="ACTIVE")  # ACTIVE, DISPATCHED, INTERCEPTED, RESOLVED
    dispatched_unit = Column(String, nullable=True)
    pcr_distance_km = Column(Float, nullable=True)
    pcr_eta_mins = Column(Integer, nullable=True)
    officer_notes = Column(Text, nullable=True)

class ViolationRecord(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    challan_id = Column(String, unique=True, index=True)
    plate = Column(String, index=True)
    camera_id = Column(String, index=True)
    camera_name = Column(String)
    city = Column(String)
    violation_type = Column(String)  # Overspeeding, Helmetless, Wrong-Way, Triple Riding, Red Light Jump
    severity = Column(String, default="HIGH")  # CRITICAL, HIGH, MEDIUM
    speed_recorded = Column(Float, nullable=True)  # km/h
    speed_limit = Column(Float, nullable=True)     # km/h
    fine_amount = Column(Integer, default=1000)    # INR
    mv_act_section = Column(String, default="Section 184 MV Act")
    vehicle_type = Column(String, default="Car")
    color = Column(String, default="White")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="PENDING")  # PENDING, ISSUED, PAID, DISPUTED
    owner_name = Column(String, nullable=True)
    evidence_frame = Column(String, nullable=True)

