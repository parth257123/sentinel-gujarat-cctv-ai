from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from database import Base
import datetime

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    plate = Column(String, index=True)
    camera_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    confidence = Column(Float)
    vehicle_type = Column(String)
    color = Column(String, default="White")
    sharpness = Column(Float, default=0.0)
    embedding = Column(Text, nullable=True)  # JSON-encoded 1024-d ReID vector
    snapshot_path = Column(String, nullable=True)
