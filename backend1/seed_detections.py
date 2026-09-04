"""
Seed the detection database with realistic Gujarat vehicle detection history.
This creates a believable demo dataset so that Vehicle Search, Analytics, and
Trajectory features work immediately on app startup.

NOTE: This data is ONLY injected in non-production environments.
All seed records are tagged with source='SEED' to distinguish from real AI inference.
"""
import datetime
import random
import json
import os

# Realistic Gujarat plates seen across cameras
GUJARAT_VEHICLES = [
    # plate, vehicle_type, color, owner
    ("GJ01AB1234", "Car", "White", "Rajesh Patel"),
    ("GJ01CD5678", "Car", "Silver/Grey", "Mehul Shah"),
    ("GJ18DJ7419", "Auto Rickshaw", "Yellow", "Ramesh Rathod"),
    ("GJ05XY9012", "Truck", "Blue", "Suresh Transport"),
    ("GJ06GH3456", "Car", "Red", "Kiran Desai"),
    ("GJ03MN7890", "SUV", "Black", "Vijay Singh"),
    ("GJ27PQ2345", "Scooter", "Green", "Fatima Shaikh"),
    ("GJ18RS6789", "Van", "White", "Gujarat Dairy Co-op"),
    ("GJ01TU0123", "Bus", "Maroon/Dark", "GSRTC"),
    ("GJ05VW4567", "Car", "Silver/Grey", "Priya Joshi"),
    ("GJ11AB8901", "Truck", "Blue", "Junagadh Traders"),
    ("GJ04CD2345", "Car", "White", "Amit Bhatt"),
    ("GJ02EF6789", "SUV", "Black", "Dinesh Chaudhary"),
    ("GJ10GH0123", "Auto Rickshaw", "Yellow", "Mohan Solanki"),
    ("GJ21IJ4567", "Car", "Red", "Navsari Fresh Produce"),
    ("GJ12KL8901", "Truck", "White", "Kutch Logistics"),
    ("GJ28MN2345", "Scooter", "Blue", "Ravi Prajapati"),
    ("GJ01OP6789", "Car", "Silver/Grey", "Heena Trivedi"),
    ("GJ06QR0123", "Van", "White", "Vadodara Courier"),
    ("GJ03ST4567", "Car", "Black", "Jayesh Raval"),
    ("GJ18UV8901", "Auto Rickshaw", "Yellow", "Bharat Thakor"),
    ("GJ05WX2345", "Bus", "Maroon/Dark", "City Bus Surat"),
    ("GJ01YZ6789", "Car", "White", "Deepak Sharma"),
    ("GJ27AB0123", "Motorcycle", "Black", "Kishan Jadeja"),
    ("GJ18CD4567", "Car", "Blue", "Neha Parmar"),
    ("MH04EF8901", "Car", "White", "Mumbai Visitor"),
    ("RJ14GH2345", "Truck", "Blue", "Rajasthan Transport"),
    ("MP09IJ6789", "Car", "Silver/Grey", "Indore Traveller"),
    ("GJ01KL0124", "Car", "White", "Anand Mehta"),
    ("GJ05MN4568", "SUV", "Black", "Diamond Exports Surat"),
]

# Camera locations with realistic coords
CAMERAS = [
    ("CAM-001", "Chimanbhai Bridge", "Ahmedabad", 23.0258, 72.5873),
    ("CAM-002", "Janpath Road", "Ahmedabad", 23.0300, 72.5636),
    ("CAM-003", "ONGC Office", "Ahmedabad", 23.0305, 72.5272),
    ("CAM-004", "Paldi Circle", "Ahmedabad", 23.0130, 72.5650),
    ("CAM-005", "Visat T-Junction", "Ahmedabad", 23.0920, 72.6430),
    ("CAM-006", "Ashram Road", "Ahmedabad", 23.0258, 72.5873),
    ("CAM-007", "SG Highway", "Ahmedabad", 23.0300, 72.5100),
    ("CAM-008", "Satellite Road", "Ahmedabad", 23.0150, 72.5190),
    ("CAM-009", "Maninagar", "Ahmedabad", 23.0010, 72.6020),
    ("CAM-010", "Kalupur Station", "Ahmedabad", 23.0245, 72.6093),
    ("CAM-011", "Sector 17 Gandhinagar", "Gandhinagar", 23.2200, 72.6400),
    ("CAM-012", "Infocity Gate", "Gandhinagar", 23.2100, 72.6900),
    ("CAM-013", "CN Vidhyalaya", "Gandhinagar", 23.2260, 72.6650),
    ("CAM-014", "Delight Junction", "Gandhinagar", 23.2150, 72.6370),
    ("CAM-015", "Ring Road Udhna", "Surat", 21.1700, 72.8400),
    ("CAM-016", "Textile Market Surat", "Surat", 21.1850, 72.8300),
    ("CAM-017", "Athwa Gate", "Surat", 21.1780, 72.8200),
    ("CAM-018", "Alkapuri Vadodara", "Vadodara", 22.3100, 73.1700),
    ("CAM-019", "Sayajigunj", "Vadodara", 22.3130, 73.1890),
    ("CAM-020", "Kalawad Road", "Rajkot", 22.3100, 70.7800),
]

def generate_seed_detections():
    """Generate 500+ realistic detections spread across the last 48 hours."""
    detections = []
    now = datetime.datetime.now()
    
    # Create a few "star vehicles" that appear across multiple cameras (for trajectory demo)
    # Vehicle 1: GJ01AB1234 — travels Ahmedabad route
    star_route_1 = [
        ("CAM-001", 0),   # Chimanbhai Bridge at T-0
        ("CAM-004", 12),  # Paldi Circle at T-12 min
        ("CAM-006", 28),  # Ashram Road at T-28 min
        ("CAM-007", 45),  # SG Highway at T-45 min
        ("CAM-005", 68),  # Visat T-Junction at T-68 min
    ]
    for cam_id, mins_ago in star_route_1:
        cam = next(c for c in CAMERAS if c[0] == cam_id)
        detections.append({
            "plate": "GJ01AB1234",
            "camera_id": cam_id,
            "vehicle_type": "Car",
            "color": "White",
            "confidence": round(random.uniform(88, 97), 1),
            "sharpness": round(random.uniform(220, 340), 1),
            "timestamp": now - datetime.timedelta(minutes=mins_ago),
        })
    
    # Vehicle 2: GJ18DJ7419 — travels Gandhinagar route
    star_route_2 = [
        ("CAM-014", 5),   # Delight Junction
        ("CAM-013", 22),  # CN Vidhyalaya
        ("CAM-011", 40),  # Sector 17
        ("CAM-012", 55),  # Infocity Gate
    ]
    for cam_id, mins_ago in star_route_2:
        cam = next(c for c in CAMERAS if c[0] == cam_id)
        detections.append({
            "plate": "GJ18DJ7419",
            "camera_id": cam_id,
            "vehicle_type": "Auto Rickshaw",
            "color": "Yellow",
            "confidence": round(random.uniform(85, 96), 1),
            "sharpness": round(random.uniform(180, 290), 1),
            "timestamp": now - datetime.timedelta(minutes=mins_ago),
        })
    
    # Vehicle 3: GJ05XY9012 — Surat truck route
    star_route_3 = [
        ("CAM-015", 15),
        ("CAM-016", 35),
        ("CAM-017", 52),
    ]
    for cam_id, mins_ago in star_route_3:
        detections.append({
            "plate": "GJ05XY9012",
            "camera_id": cam_id,
            "vehicle_type": "Truck",
            "color": "Blue",
            "confidence": round(random.uniform(82, 94), 1),
            "sharpness": round(random.uniform(200, 300), 1),
            "timestamp": now - datetime.timedelta(minutes=mins_ago),
        })
    
    # Vehicle 4: Interstate MH04 — enters Gujarat
    star_route_4 = [
        ("CAM-015", 90),  # Enters via Surat
        ("CAM-018", 180), # Reaches Vadodara
        ("CAM-007", 300), # Reaches Ahmedabad SG Highway
    ]
    for cam_id, mins_ago in star_route_4:
        detections.append({
            "plate": "MH04EF8901",
            "camera_id": cam_id,
            "vehicle_type": "Car",
            "color": "White",
            "confidence": round(random.uniform(80, 93), 1),
            "sharpness": round(random.uniform(190, 280), 1),
            "timestamp": now - datetime.timedelta(minutes=mins_ago),
        })
    
    # Generate 450+ random detections spread across 48 hours for bulk stats
    for _ in range(450):
        vehicle = random.choice(GUJARAT_VEHICLES)
        camera = random.choice(CAMERAS)
        hours_ago = random.uniform(0, 48)
        
        detections.append({
            "plate": vehicle[0],
            "camera_id": camera[0],
            "vehicle_type": vehicle[1],
            "color": vehicle[2],
            "confidence": round(random.uniform(75, 98), 1),
            "sharpness": round(random.uniform(150, 380), 1),
            "timestamp": now - datetime.timedelta(hours=hours_ago),
        })
    
    return detections


def seed_database(db_session):
    """Insert seed detections into the database if it's empty or has very few records.
    
    PRODUCTION SAFETY: Skipped entirely when SENTINEL_ENV=production.
    All seed records are tagged with source='SEED' and plate_status='SEED_DATA'.
    """
    from models import Detection
    
    env = os.environ.get("SENTINEL_ENV", "development")
    if env == "production":
        print(f"[Seed] SENTINEL_ENV=production — skipping seed data injection.")
        return db_session.query(Detection).count()
    
    existing = db_session.query(Detection).count()
    if existing >= 100:
        print(f"[Seed] Database already has {existing} detections, skipping seed.")
        return existing
    
    seed_data = generate_seed_detections()
    
    for d in seed_data:
        db_session.add(Detection(
            plate=d["plate"],
            plate_status="SEED_DATA",
            camera_id=d["camera_id"],
            vehicle_type=d["vehicle_type"],
            color=d["color"],
            confidence=d["confidence"],
            sharpness=d["sharpness"],
            timestamp=d["timestamp"],
            source="SEED",
        ))
    
    db_session.commit()
    final_count = db_session.query(Detection).count()
    print(f"[Seed] Inserted {len(seed_data)} SEED detections (env={env}). Total now: {final_count}")
    return final_count
