import asyncio
import os
import json
from fastapi import FastAPI, Depends, UploadFile, File, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import cv2

import database
import models
from database import engine, get_db
from anpr_engine import ANPREngine
from sentinel_grid import SentinelGridClient, mjpeg_generator, camera_status

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sentinel ANPR Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

anpr = ANPREngine()
grid_client = SentinelGridClient()

class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for conn in self.active_connections:
            try:
                await conn.send_json(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.active_connections.remove(d)

manager = ConnectionManager()

@app.on_event("startup")
async def startup_event():
    print(f"[Sentinel] Gujarat CCTV Platform active with {len(grid_client.cameras)} cameras across Gujarat.")


# ─── API Endpoints ────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/cameras")
def get_cameras():
    """Returns the full camera registry for the React frontend."""
    return grid_client.cameras

@app.get("/api/cameras/{camera_id}/status")
def get_camera_status(camera_id: str):
    """Returns live status of a specific camera."""
    return {"id": camera_id, "status": camera_status.get(camera_id, "online")}

@app.get("/video_feed/{camera_id}")
async def video_feed(camera_id: str):
    """MJPEG streaming endpoint — consumed by <img> tags in the React UI."""
    return StreamingResponse(
        mjpeg_generator(camera_id, database.SessionLocal, manager, models), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/upload_video")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    temp_dir = "/tmp/sentinel_videos"
    os.makedirs(temp_dir, exist_ok=True)
    temp_file = os.path.join(temp_dir, file.filename)
    
    with open(temp_file, "wb") as buffer:
        buffer.write(await file.read())
        
    background_tasks.add_task(process_video_file, temp_file)
    return {"message": "Video uploaded and processing started."}

async def process_video_file(video_path: str):
    cap = cv2.VideoCapture(video_path)
    camera_id = "UPLOAD-CAM"
    db = database.SessionLocal()
    
    try:
        frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1
            if frame_count % 10 != 0:
                continue
                
            detections = anpr.process_frame(frame, camera_id)
            for det in detections:
                db_det = models.Detection(
                    plate=det["plate"],
                    camera_id=camera_id,
                    confidence=det["confidence"],
                    vehicle_type=det["vehicle_type"]
                )
                db.add(db_det)
                db.commit()
                db.refresh(db_det)
                
                await manager.broadcast({
                    "type": "new_detection",
                    "data": {
                        "id": db_det.id,
                        "plate": db_det.plate,
                        "cameraId": camera_id,
                        "confidence": db_det.confidence,
                        "vehicleType": db_det.vehicle_type,
                        "timestamp": db_det.timestamp.isoformat(),
                    }
                })
            await asyncio.sleep(0.01)
    finally:
        cap.release()
        db.close()

@app.get("/detections")
def get_detections(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Detection).order_by(models.Detection.timestamp.desc()).offset(skip).limit(limit).all()
