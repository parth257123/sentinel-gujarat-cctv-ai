"""
AI Traffic Violation & Behavior Engine
======================================
Automated detection and e-Challan generation for:
- Overspeeding (Radar & Optical Frame Tracking)
- Wrong-Way / Lane Violation
- Helmetless Riding (Motorcycle)
- Triple Riding (Two-Wheeler)
- Red Light / Stop Line Jump
"""
import random
import datetime

# Motor Vehicles Act (Amendment) statutory rules
VIOLATION_RULES = {
    "Overspeeding": {
        "mv_act": "Section 183 MV Act (Dangerous Overspeeding)",
        "base_fine": 1500,
        "severity": "HIGH",
        "speed_limit_kmh": 50.0,
        "description": "Vehicle exceeded designated urban speed limit by >20 km/h"
    },
    "Wrong-Way Driving": {
        "mv_act": "Section 184 MV Act (Dangerous Driving against Traffic Flow)",
        "base_fine": 5000,
        "severity": "CRITICAL",
        "speed_limit_kmh": None,
        "description": "Vehicle moving against designated one-way traffic vector"
    },
    "Helmetless Riding": {
        "mv_act": "Section 194D MV Act (Riding without Safety Helmet)",
        "base_fine": 1000,
        "severity": "MEDIUM",
        "speed_limit_kmh": None,
        "description": "Rider / Pillion passenger detected without standard BIS helmet"
    },
    "Triple Riding": {
        "mv_act": "Section 194C MV Act (Overloading on Two-Wheeler)",
        "base_fine": 1000,
        "severity": "HIGH",
        "speed_limit_kmh": None,
        "description": "Three or more persons traveling on single two-wheeler"
    },
    "Red Light Violation": {
        "mv_act": "Section 184 MV Act (Disobeying Traffic Signals / Stop Line)",
        "base_fine": 1000,
        "severity": "HIGH",
        "speed_limit_kmh": None,
        "description": "Vehicle crossed pedestrian stop line during active red signal phase"
    },
    "Using Mobile Phone": {
        "mv_act": "Section 184(c) MV Act (Distracted Driving)",
        "base_fine": 5000,
        "severity": "HIGH",
        "speed_limit_kmh": None,
        "description": "Handheld electronic device in active use while operating vehicle"
    }
}

SEED_VIOLATIONS = [
    {
        "plate": "GJ-01-AB-7264",
        "camera_id": "CAM-004",
        "camera_name": "04 Paldi Circle",
        "city": "Ahmedabad",
        "violation_type": "Overspeeding",
        "severity": "HIGH",
        "speed_recorded": 76.4,
        "speed_limit": 50.0,
        "fine_amount": 1500,
        "mv_act_section": "Section 183 MV Act",
        "vehicle_type": "Car (Hyundai Verna)",
        "color": "Blue",
        "status": "ISSUED",
        "owner_name": "Karan M. Patel",
    },
    {
        "plate": "GJ-06-CA-9909",
        "camera_id": "CAM-001",
        "camera_name": "01 Chiman bhai Bridge",
        "city": "Ahmedabad",
        "violation_type": "Wrong-Way Driving",
        "severity": "CRITICAL",
        "speed_recorded": 42.1,
        "speed_limit": None,
        "fine_amount": 5000,
        "mv_act_section": "Section 184 MV Act",
        "vehicle_type": "Car (Maruti Swift)",
        "color": "Blue",
        "status": "PENDING",
        "owner_name": "Rahul B. Zala",
    },
    {
        "plate": "GJ-03-DJ-8411",
        "camera_id": "CAM-010",
        "camera_name": "10 char-chowk-road-2-junagadh",
        "city": "Junagadh",
        "violation_type": "Helmetless Riding",
        "severity": "MEDIUM",
        "speed_recorded": 38.0,
        "speed_limit": None,
        "fine_amount": 1000,
        "mv_act_section": "Section 194D MV Act",
        "vehicle_type": "Motorcycle (Hero Splendor)",
        "color": "Blue",
        "status": "ISSUED",
        "owner_name": "Bhavik Solanki",
    },
    {
        "plate": "GJ-18-BR-8178",
        "camera_id": "CAM-013",
        "camera_name": "13 CN Vidhyalaya",
        "city": "Ahmedabad",
        "violation_type": "Triple Riding",
        "severity": "HIGH",
        "speed_recorded": 34.5,
        "speed_limit": None,
        "fine_amount": 1000,
        "mv_act_section": "Section 194C MV Act",
        "vehicle_type": "Motorcycle (Honda Activa)",
        "color": "Blue",
        "status": "PENDING",
        "owner_name": "Mahesh D. Chauhan",
    },
    {
        "plate": "GJ-27-DJ-2528",
        "camera_id": "CAM-016",
        "camera_name": "16 Visat P2",
        "city": "Ahmedabad",
        "violation_type": "Red Light Violation",
        "severity": "HIGH",
        "speed_recorded": 58.2,
        "speed_limit": None,
        "fine_amount": 1000,
        "mv_act_section": "Section 184 MV Act",
        "vehicle_type": "Car (Toyota Innova)",
        "color": "White",
        "status": "PAID",
        "owner_name": "Dipak K. Shah",
    },
    {
        "plate": "GJ-05-FM-3420",
        "camera_id": "CAM-028",
        "camera_name": "37 bilimora",
        "city": "Navsari",
        "violation_type": "Overspeeding",
        "severity": "HIGH",
        "speed_recorded": 89.2,
        "speed_limit": 60.0,
        "fine_amount": 2000,
        "mv_act_section": "Section 183 MV Act",
        "vehicle_type": "Car (Mahindra XUV700)",
        "color": "White",
        "status": "PENDING",
        "owner_name": "Vijay R. Parmar",
    }
]

def generate_challan_id(plate: str):
    clean = plate.replace(" ", "").replace("-", "")
    ts = datetime.datetime.now().strftime("%y%m%d%H%M%S")
    rand_suffix = random.randint(1000, 9999)
    return f"ECH-GJ-{clean[-4:]}-{ts}-{rand_suffix}"
