"""
Gujarat Police CCTV Stream Generator
Renders authentic, high-realism Gujarat CCTV feeds with:
- True-to-life Indian road scenarios (multi-lane highways, city junctions, roundabouts)
- Real Gujarat vehicle registration plates (GJ-01, GJ-05, GJ-03, GJ-06, GJ-18, etc.)
- Authentic CCTV HUD/OSD (Location, Camera ID, Live IST Timestamp, Grid coordinates, RLVD Lines)
- Realistic vehicle movement, shadows, headlights, and ANPR target boxes
"""

import cv2
import numpy as np
import time
import math
import random
from datetime import datetime

# Gujarat Vehicle Palette and Definitions
VEHICLE_PRESETS = [
    {"type": "Car (Swift)", "plate": "GJ 01 AB 1234", "color": (235, 235, 240), "size": (100, 175), "speed": 3.8},
    {"type": "SUV (Creta)", "plate": "GJ 05 CD 5678", "color": (30, 30, 35), "size": (118, 195), "speed": 4.2},
    {"type": "Sedan (City)", "plate": "GJ 03 EF 9012", "color": (195, 200, 205), "size": (108, 185), "speed": 3.6},
    {"type": "Auto Rickshaw", "plate": "GJ 01 TU 3344", "color": (0, 180, 220), "roof_color": (30, 140, 40), "size": (82, 130), "speed": 2.8},
    {"type": "SUV (Nexon)", "plate": "GJ 18 GH 3456", "color": (160, 60, 20), "size": (115, 190), "speed": 4.0},
    {"type": "Bolero Police", "plate": "GJ 18 G 0100", "color": (240, 240, 245), "size": (120, 205), "speed": 3.5, "police": True},
    {"type": "SUV (Fortuner)", "plate": "MH 04 LM 2345", "color": (95, 95, 100), "size": (125, 210), "speed": 4.5},
    {"type": "Car (Seltos)", "plate": "GJ 01 XX 9999", "color": (30, 30, 175), "size": (112, 188), "speed": 3.9},
    {"type": "Truck (Tata)", "plate": "GJ 06 PQ 7788", "color": (35, 110, 175), "size": (135, 260), "speed": 2.5},
    {"type": "Car (Baleno)", "plate": "GJ 01 MN 4455", "color": (175, 115, 35), "size": (102, 175), "speed": 3.7},
    {"type": "SUV (Scorpio)", "plate": "GJ 06 JK 7890", "color": (240, 240, 245), "size": (120, 200), "speed": 4.1},
    {"type": "Car (i20)", "plate": "GJ 01 AB 6677", "color": (210, 40, 40), "size": (100, 172), "speed": 3.8},
    {"type": "Sedan (Verna)", "plate": "GJ 03 CD 8899", "color": (40, 40, 45), "size": (110, 186), "speed": 4.2},
]

WATCHLIST_PLATES = {"GJ 01 AB 1234", "GJ 05 CD 5678", "GJ 03 EF 9012", "GJ 18 GH 3456", "GJ 06 JK 7890", "MH 04 LM 2345"}

class GujaratCCTVRenderer:
    def __init__(self, camera_id="CAM-001", location_name="SG Highway Junction", city="Ahmedabad"):
        self.camera_id = camera_id
        self.location_name = location_name
        self.city = city
        self.width = 1280
        self.height = 720
        
        # Lanes configuration (x centers of 4 lanes)
        self.lanes = [
            {"x": 260, "dir": 1, "label": "L1 (SB)"},
            {"x": 470, "dir": 1, "label": "L2 (SB)"},
            {"x": 810, "dir": -1, "label": "L3 (NB)"},
            {"x": 1020, "dir": -1, "label": "L4 (NB)"},
        ]
        
        # Active vehicles in this camera feed
        self.active_vehicles = []
        self._init_vehicles()
        
    def _init_vehicles(self):
        # Deterministic seed per camera for consistent yet varied traffic
        seed_val = int("".join([str(ord(c)) for c in self.camera_id])) % 100000
        rng = random.Random(seed_val)
        
        for lane_idx, lane in enumerate(self.lanes):
            count = rng.randint(2, 3)
            for j in range(count):
                preset = rng.choice(VEHICLE_PRESETS)
                v = dict(preset)
                v["lane"] = lane_idx
                v["x"] = lane["x"] + rng.randint(-12, 12)
                v["y"] = rng.randint(60, self.height + 180)
                v["speed"] = preset["speed"] * (0.9 + rng.random() * 0.25)
                v["dir"] = lane["dir"]
                self.active_vehicles.append(v)

    def render_frame(self, frame_idx=0):
        # 1. Background Road Surface (textured dark asphalt)
        frame = np.full((self.height, self.width, 3), (46, 50, 54), dtype=np.uint8)
        
        # Left shoulder / footpath (paved yellow/black curb)
        cv2.rectangle(frame, (0, 0), (130, self.height), (65, 70, 75), -1)
        for y in range(0, self.height, 40):
            curb_color = (30, 180, 240) if (y // 40) % 2 == 0 else (20, 20, 25)
            cv2.rectangle(frame, (120, y), (130, y + 40), curb_color, -1)
        cv2.rectangle(frame, (130, 0), (138, self.height), (230, 230, 235), -1) # Solid white edge line
        
        # Right shoulder / footpath
        cv2.rectangle(frame, (1150, 0), (self.width, self.height), (65, 70, 75), -1)
        for y in range(0, self.height, 40):
            curb_color = (30, 180, 240) if (y // 40) % 2 == 0 else (20, 20, 25)
            cv2.rectangle(frame, (1150, y), (1160, y + 40), curb_color, -1)
        cv2.rectangle(frame, (1142, 0), (1150, self.height), (230, 230, 235), -1) # Solid white edge line
        
        # Center Median Divider (Concrete divider with yellow hazard markings)
        cv2.rectangle(frame, (620, 0), (660, self.height), (30, 35, 40), -1)
        cv2.rectangle(frame, (614, 0), (620, self.height), (40, 160, 235), -1) # Yellow double line L
        cv2.rectangle(frame, (660, 0), (666, self.height), (40, 160, 235), -1) # Yellow double line R
        
        # Dashed Lane Markings
        dash_offset = int(frame_idx * 5) % 60
        for y in range(-dash_offset, self.height + 60, 60):
            # Lane 1-2 divider
            cv2.rectangle(frame, (360, y), (368, y + 32), (230, 230, 235), -1)
            # Lane 3-4 divider
            cv2.rectangle(frame, (910, y), (918, y + 32), (230, 230, 235), -1)
            
        # RLVD (Red Light Violation Detection) / ANPR virtual trigger line
        rlvd_y = 480
        cv2.line(frame, (138, rlvd_y), (1142, rlvd_y), (0, 210, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, "ANPR / RLVD DETECTION ZONE", (148, rlvd_y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 210, 255), 1, cv2.LINE_AA)

        # 2. Update and Render Vehicles
        self.active_vehicles.sort(key=lambda v: v["y"])
        
        anpr_detected_boxes = []
        
        for v in self.active_vehicles:
            # Move vehicle
            v["y"] += v["speed"] * v["dir"]
            
            # Wrap around when out of screen
            if v["dir"] == 1 and v["y"] > self.height + 250:
                v["y"] = -250
                v["x"] = self.lanes[v["lane"]]["x"] + random.randint(-12, 12)
                preset = random.choice(VEHICLE_PRESETS)
                v.update(preset)
            elif v["dir"] == -1 and v["y"] < -250:
                v["y"] = self.height + 250
                v["x"] = self.lanes[v["lane"]]["x"] + random.randint(-12, 12)
                preset = random.choice(VEHICLE_PRESETS)
                v.update(preset)
                
            vx = int(v["x"])
            vy = int(v["y"])
            vw, vh = v["size"]
            
            if vy + vh < 0 or vy > self.height + 50:
                continue
                
            x1 = vx - vw // 2
            y1 = vy - vh // 2
            x2 = vx + vw // 2
            y2 = vy + vh // 2
            
            # Shadow under vehicle
            cv2.ellipse(frame, (vx + 6, vy + 8), (vw // 2 + 8, vh // 2 + 10), 0, 0, 360, (22, 24, 26), -1)
            
            # Vehicle Body
            color = v["color"]
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, -1)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (20, 22, 25), 2)
            
            if "roof_color" in v: # Auto rickshaw
                cv2.rectangle(frame, (x1 + 5, y1 + 20), (x2 - 5, y2 - 20), v["roof_color"], -1)
                cv2.circle(frame, (vx, y1 + 4 if v["dir"] == -1 else y2 - 4), 6, (120, 240, 255), -1)
            else: # Standard Car / SUV / Truck
                glass_color = (40, 45, 52)
                cv2.rectangle(frame, (x1 + 8, y1 + 30), (x2 - 8, y1 + 65), glass_color, -1)
                cv2.rectangle(frame, (x1 + 8, y2 - 65), (x2 - 8, y2 - 30), glass_color, -1)
                roof_c = (max(0, color[0]-25), max(0, color[1]-25), max(0, color[2]-25))
                cv2.rectangle(frame, (x1 + 10, y1 + 65), (x2 - 10, y2 - 65), roof_c, -1)
                
                # Headlights
                if v["dir"] == -1: # Moving UP
                    cv2.rectangle(frame, (x1 + 4, y1 + 2), (x1 + 18, y1 + 12), (200, 245, 255), -1)
                    cv2.rectangle(frame, (x2 - 18, y1 + 2), (x2 - 4, y1 + 12), (200, 245, 255), -1)
                else: # Moving DOWN
                    cv2.rectangle(frame, (x1 + 4, y2 - 12), (x1 + 18, y2 - 2), (200, 245, 255), -1)
                    cv2.rectangle(frame, (x2 - 18, y2 - 12), (x2 - 4, y2 - 2), (200, 245, 255), -1)
                    
                # Tail lights
                if v["dir"] == 1:
                    cv2.rectangle(frame, (x1 + 4, y1 + 2), (x1 + 16, y1 + 8), (0, 0, 220), -1)
                    cv2.rectangle(frame, (x2 - 16, y1 + 2), (x2 - 4, y1 + 8), (0, 0, 220), -1)
                else:
                    cv2.rectangle(frame, (x1 + 4, y2 - 8), (x1 + 16, y2 - 2), (0, 0, 220), -1)
                    cv2.rectangle(frame, (x2 - 16, y2 - 8), (x2 - 4, y2 - 2), (0, 0, 220), -1)

            # High-Visibility Gujarat License Plate (White HSRP plate)
            pw, ph = 74, 18
            px = vx - pw // 2
            py = (y2 - ph - 5) if v["dir"] == 1 else (y1 + 5)
            
            cv2.rectangle(frame, (px, py), (px + pw, py + ph), (250, 250, 255), -1)
            cv2.rectangle(frame, (px, py), (px + pw, py + ph), (0, 0, 0), 1)
            cv2.rectangle(frame, (px, py), (px + 8, py + ph), (200, 80, 20), -1) # IND Blue stripe
            
            plate_str = v["plate"]
            cv2.putText(frame, plate_str, (px + 10, py + ph - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (0, 0, 0), 1, cv2.LINE_AA)
            
            if 180 < vy < 620:
                is_wl = plate_str in WATCHLIST_PLATES
                anpr_detected_boxes.append({
                    "box": (x1 - 4, y1 - 4, x2 + 4, y2 + 4),
                    "plate": plate_str,
                    "type": v["type"],
                    "speed_kmh": int(v["speed"] * 13.2),
                    "is_watchlist": is_wl
                })

        # 3. Draw AI ANPR Bounding Boxes & HUD Detection Tags
        for det in anpr_detected_boxes:
            bx1, by1, bx2, by2 = det["box"]
            is_wl = det["is_watchlist"]
            box_color = (0, 0, 240) if is_wl else (0, 225, 90)
            
            # Corner markers on vehicle
            corner_len = 14
            cv2.line(frame, (bx1, by1), (bx1 + corner_len, by1), box_color, 2)
            cv2.line(frame, (bx1, by1), (bx1, by1 + corner_len), box_color, 2)
            cv2.line(frame, (bx2, by1), (bx2 - corner_len, by1), box_color, 2)
            cv2.line(frame, (bx2, by1), (bx2, by1 + corner_len), box_color, 2)
            cv2.line(frame, (bx1, by2), (bx1 + corner_len, by2), box_color, 2)
            cv2.line(frame, (bx1, by2), (bx1, by2 - corner_len), box_color, 2)
            cv2.line(frame, (bx2, by2), (bx2 - corner_len, by2), box_color, 2)
            cv2.line(frame, (bx2, by2), (bx2 - corner_len, by2), box_color, 2)
            
            # Tag banner above vehicle
            tag_text = f"{'[ALERT: WATCHLIST] ' if is_wl else ''}{det['plate']}  {det['speed_kmh']} km/h"
            (tw, th), _ = cv2.getTextSize(tag_text, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
            cv2.rectangle(frame, (bx1, by1 - 20), (bx1 + tw + 10, by1), box_color, -1)
            cv2.putText(frame, tag_text, (bx1 + 5, by1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 0, 0) if not is_wl else (255, 255, 255), 1, cv2.LINE_AA)

        # 4. Clean CCTV Control Room OSD Header (No overlapping text)
        cv2.rectangle(frame, (0, 0), (self.width, 38), (14, 16, 20), -1)
        cv2.line(frame, (0, 38), (self.width, 38), (45, 50, 60), 1)
        
        # Left: Department Tag
        cv2.putText(frame, "GUJARAT POLICE • VISWAS CCTV GRID", (16, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (255, 255, 255), 1, cv2.LINE_AA)
        
        # Center: Camera ID & Location
        loc_str = f"{self.camera_id}  |  {self.location_name.upper()} ({self.city.upper()})"
        cv2.putText(frame, loc_str, (400, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 220, 255), 1, cv2.LINE_AA)
        
        # Right: Live Timestamp & REC Indicator
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S") + " IST"
        cv2.putText(frame, now_str, (self.width - 240, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (190, 240, 190), 1, cv2.LINE_AA)
        
        cv2.circle(frame, (self.width - 26, 20), 5, (0, 0, 255), -1)
        
        # Bottom Telemetry Bar
        cv2.rectangle(frame, (0, self.height - 26), (self.width, self.height), (14, 16, 20), -1)
        cv2.line(frame, (0, self.height - 26), (self.width, self.height - 26), (45, 50, 60), 1)
        
        telemetry = f"AI ANPR: ACTIVE | RESOLUTION: 1080p | FPS: 25.0 | ENCODING: H.264 | RETENTION: 30 DAYS"
        cv2.putText(frame, telemetry, (16, self.height - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (150, 165, 180), 1, cv2.LINE_AA)
        
        grid_pos = f"STATUS: ONLINE  [●]"
        cv2.putText(frame, grid_pos, (self.width - 160, self.height - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (0, 225, 100), 1, cv2.LINE_AA)
        
        return frame
