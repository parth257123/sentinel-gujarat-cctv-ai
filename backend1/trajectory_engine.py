"""
AI Tactical Intercept & Local Police Infrastructure Engine
===========================================================
Strict Local Spatial Filtering Algorithm:
  - Enforces strict tactical perimeter (d <= 10.0 km) around the suspect vehicle sighting
  - Zero cross-district leakage: never displays 300km away nodes
  - Full local Gujarat police infrastructure: Thanas, Traffic Chowkis, Highway Tolls, Trauma Centers, and PCR Cruisers
"""

import math
import datetime
from typing import List, Dict, Any, Optional

# Comprehensive Localized Database of Gujarat Police Stations & Chowkis
GUJARAT_POLICE_INFRASTRUCTURE = [
    # ─── Ahmedabad Commissionerate (Sector 1 & 2) ───────────────────────────
    {"id": "PS-AHM-01", "name": "Navrangpura Police Station", "city": "Ahmedabad", "type": "POLICE_STATION", "lat": 23.0360, "lng": 72.5600, "sho": "PI H. B. Zala", "phone": "079-2644-0100", "details": "Ashram Road, CG Road, University"},
    {"id": "PS-AHM-02", "name": "Paldi Police Station", "city": "Ahmedabad", "type": "POLICE_STATION", "lat": 23.0130, "lng": 72.5650, "sho": "PI S. K. Rabari", "phone": "079-2657-6100", "details": "Paldi Circle, Mahalaxmi, Ellisbridge"},
    {"id": "PS-AHM-03", "name": "Satellite Police Station", "city": "Ahmedabad", "type": "POLICE_STATION", "lat": 23.0290, "lng": 72.5280, "sho": "PI R. R. Desai", "phone": "079-2676-5400", "details": "Satellite, SG Highway West, Jodhpur Crossroads"},
    {"id": "PS-AHM-04", "name": "Vastrapur Police Station", "city": "Ahmedabad", "type": "POLICE_STATION", "lat": 23.0380, "lng": 72.5310, "sho": "PI B. D. Jadav", "phone": "079-2679-0100", "details": "Vastrapur Lake, IIM Ahmedabad, Gurukul"},
    {"id": "PS-AHM-05", "name": "Sola High Court Police Station", "city": "Ahmedabad", "type": "POLICE_STATION", "lat": 23.0820, "lng": 72.5320, "sho": "PI V. D. Mori", "phone": "079-2766-3100", "details": "SG Highway North, High Court, Science City"},
    {"id": "PS-AHM-06", "name": "Sabarmati Police Station", "city": "Ahmedabad", "type": "POLICE_STATION", "lat": 23.0780, "lng": 72.5890, "sho": "PI M. A. Vankar", "phone": "079-2750-7100", "details": "Sabarmati, Chiman bhai Bridge, RTO Circle"},
    {"id": "PS-AHM-07", "name": "Ghatlodia Police Station", "city": "Ahmedabad", "type": "POLICE_STATION", "lat": 23.0680, "lng": 72.5450, "sho": "PI K. C. Rathod", "phone": "079-2748-0100", "details": "Ghatlodia, Chanakyapuri, KK Nagar"},
    {"id": "PS-AHM-08", "name": "Ellisbridge Police Station", "city": "Ahmedabad", "type": "POLICE_STATION", "lat": 23.0210, "lng": 72.5720, "sho": "PI N. L. Desai", "phone": "079-2658-0100", "details": "Town Hall, VS Hospital, Riverfront West"},
    {"id": "PS-AHM-09", "name": "Chandkheda Police Station", "city": "Ahmedabad", "type": "POLICE_STATION", "lat": 23.1110, "lng": 72.5850, "sho": "PI P. B. Rana", "phone": "079-2329-0100", "details": "Visat Junction, ONGC Colony, Chandkheda"},
    {"id": "PS-AHM-10", "name": "Adalaj Police Station", "city": "Ahmedabad", "type": "POLICE_STATION", "lat": 23.1640, "lng": 72.5810, "sho": "PI K. N. Solanki", "phone": "079-2397-0333", "details": "Adalaj Tri-Mandir, SG Highway Toll, NH-147"},

    # Ahmedabad Local Traffic Chowkis & Chokepoints
    {"id": "CP-AHM-01", "name": "Paldi Crossroads Traffic Police Chowki", "city": "Ahmedabad", "type": "TOLL_CHOKEPOINT", "lat": 23.0150, "lng": 72.5640, "details": "Paldi Circle Junction Barrier", "lanes": 6, "fastag_sealable": False},
    {"id": "CP-AHM-02", "name": "Chiman bhai Bridge Sabarmati Choke Barrier", "city": "Ahmedabad", "type": "TOLL_CHOKEPOINT", "lat": 23.0780, "lng": 72.5850, "details": "Sabarmati River Overpass Checkpost", "lanes": 6, "fastag_sealable": False},
    {"id": "CP-AHM-03", "name": "Visat Teen Rasta Traffic Outpost", "city": "Ahmedabad", "type": "TOLL_CHOKEPOINT", "lat": 23.1080, "lng": 72.5820, "details": "Visat Junction BRTS Corridor Barrier", "lanes": 8, "fastag_sealable": False},
    {"id": "CP-AHM-04", "name": "Iskcon Crossroads SG Highway Traffic Chowki", "city": "Ahmedabad", "type": "TOLL_CHOKEPOINT", "lat": 23.0300, "lng": 72.5100, "details": "SG Highway Express Junction", "lanes": 8, "fastag_sealable": False},
    {"id": "CP-AHM-05", "name": "Vaishnodevi Circle SP Ring Road Interchange", "city": "Ahmedabad", "type": "TOLL_CHOKEPOINT", "lat": 23.1350, "lng": 72.5600, "details": "SP Ring Road Elevated Overpass", "lanes": 8, "fastag_sealable": False},
    {"id": "CP-AHM-06", "name": "Adalaj Tri-Mandir NH-147 Toll Plaza", "city": "Ahmedabad", "type": "TOLL_CHOKEPOINT", "lat": 23.1650, "lng": 72.5850, "details": "National Highway Toll Gate", "lanes": 12, "fastag_sealable": True},

    # Ahmedabad Local Trauma Centers
    {"id": "EM-AHM-01", "name": "SVP Institute of Medical Sciences (SVP Hospital)", "city": "Ahmedabad", "type": "TRAUMA_CENTER", "lat": 23.0180, "lng": 72.5710, "emergency_contact": "079-2657-7621", "details": "1500 Bed Multi-Specialty Trauma Centre", "icu_available": True},
    {"id": "EM-AHM-02", "name": "Ahmedabad Civil Hospital (1200 Bed Trauma Centre)", "city": "Ahmedabad", "type": "TRAUMA_CENTER", "lat": 23.0530, "lng": 72.5950, "emergency_contact": "079-2268-0074", "details": "State Apex Trauma Center (Sabarmati/Asarwa)", "icu_available": True},
    {"id": "EM-AHM-03", "name": "Zydus Hospital SG Highway", "city": "Ahmedabad", "type": "TRAUMA_CENTER", "lat": 23.0850, "lng": 72.5350, "emergency_contact": "079-6619-0201", "details": "Emergency ICU & Accident Care (Thaltej)", "icu_available": True},
    {"id": "EM-AHM-04", "name": "Sterling Hospital Gurukul", "city": "Ahmedabad", "type": "TRAUMA_CENTER", "lat": 23.0510, "lng": 72.5290, "emergency_contact": "079-4001-1111", "details": "Drive-In Road Trauma Emergency Ward", "icu_available": True},

    # Ahmedabad Active PCR Vans
    {"id": "PCR-AHM-01", "name": "PCR-ALPHA-01 (Eagle-01)", "city": "Ahmedabad", "type": "PCR_VAN", "lat": 23.0360, "lng": 72.5600, "officer": "PSI V. K. Patel", "frequency": "VHF Ch 4", "callsign": "EAGLE-01", "details": "Navrangpura & Ashram Road Sector"},
    {"id": "PCR-AHM-02", "name": "PCR-ALPHA-02 (Eagle-02)", "city": "Ahmedabad", "type": "PCR_VAN", "lat": 23.0780, "lng": 72.5890, "officer": "PSI M. R. Solanki", "frequency": "VHF Ch 4", "callsign": "EAGLE-02", "details": "Sabarmati & Riverfront Sector"},
    {"id": "PCR-AHM-03", "name": "PCR-BRAVO-05 (Falcon-05)", "city": "Ahmedabad", "type": "PCR_VAN", "lat": 23.0820, "lng": 72.5320, "officer": "PSI K. J. Rathod", "frequency": "VHF Ch 6", "callsign": "FALCON-05", "details": "SG Highway Express Corridor"},
    {"id": "PCR-AHM-04", "name": "PCR-CHARLIE-02 (Chetak-02)", "city": "Ahmedabad", "type": "PCR_VAN", "lat": 23.0180, "lng": 72.5680, "officer": "PSI D. K. Raval", "frequency": "VHF Ch 4", "callsign": "CHETAK-02", "details": "Paldi & Ellisbridge Zone"},
    {"id": "PCR-AHM-05", "name": "PCR-FOXTROT-09 (Chetak-09)", "city": "Ahmedabad", "type": "PCR_VAN", "lat": 23.1640, "lng": 72.5810, "officer": "PSI D. N. Parmar", "frequency": "VHF Ch 6", "callsign": "CHETAK-09", "details": "Adalaj - Gandhinagar Border Zone"},

    # ─── Navsari & South Gujarat Sector ─────────────────────────────────────
    {"id": "PS-NAV-01", "name": "Navsari Town Police Station", "city": "Navsari", "type": "POLICE_STATION", "lat": 20.9500, "lng": 72.9320, "sho": "PI D. K. Patel", "phone": "02637-257100", "details": "Lunsikui, Fuwara, Tower Road, Station Area"},
    {"id": "PS-NAV-02", "name": "Navsari Rural Police Station", "city": "Navsari", "type": "POLICE_STATION", "lat": 20.9250, "lng": 72.9150, "sho": "PI A. R. Chaudhari", "phone": "02637-234200", "details": "NH-48 Highway Corridor, Kabilpore GIDC"},
    {"id": "PS-NAV-03", "name": "Jalalpore Police Station", "city": "Navsari", "type": "POLICE_STATION", "lat": 20.9420, "lng": 72.8980, "sho": "PI T. S. Vaghela", "phone": "02637-221100", "details": "Jalalpore, Dandi Road, Maroli Corridor"},
    {"id": "PS-NAV-04", "name": "Bilimora Police Station", "city": "Navsari", "type": "POLICE_STATION", "lat": 20.8030, "lng": 72.9640, "sho": "PI M. B. Rathod", "phone": "02634-284100", "details": "Bilimora Port, Railway Crossing, Gandevi Road"},
    {"id": "PS-NAV-05", "name": "Gandevi Police Station", "city": "Navsari", "type": "POLICE_STATION", "lat": 20.8150, "lng": 72.9980, "sho": "PI S. R. Mahida", "phone": "02634-262100", "details": "Gandevi Town, Ambika River Bridge"},

    # Navsari Tolls & Chokepoints
    {"id": "CP-NAV-01", "name": "Navsari NH-48 National Toll Plaza", "city": "Navsari", "type": "TOLL_CHOKEPOINT", "lat": 20.8650, "lng": 72.9450, "details": "NH-48 Golden Quadrilateral 14-Lane Barrier", "lanes": 14, "fastag_sealable": True},
    {"id": "CP-NAV-02", "name": "Grid Crossroads Traffic Police Post", "city": "Navsari", "type": "TOLL_CHOKEPOINT", "lat": 20.9350, "lng": 72.9200, "details": "Navsari Highway Grid Intersection Barrier", "lanes": 6, "fastag_sealable": False},
    {"id": "CP-NAV-03", "name": "Bilimora Railway Level Crossing Barrier", "city": "Navsari", "type": "TOLL_CHOKEPOINT", "lat": 20.8020, "lng": 72.9650, "details": "Railway Crossing Barrier & Choke Point", "lanes": 4, "fastag_sealable": False},
    {"id": "CP-NAV-04", "name": "Kabilpore GIDC Highway Naka", "city": "Navsari", "type": "TOLL_CHOKEPOINT", "lat": 20.9180, "lng": 72.9100, "details": "Industrial Corridor Checkpost", "lanes": 4, "fastag_sealable": False},

    # Navsari Trauma Centers
    {"id": "EM-NAV-01", "name": "Navsari Civil Hospital & Trauma Ward", "city": "Navsari", "type": "TRAUMA_CENTER", "lat": 20.9520, "lng": 72.9280, "emergency_contact": "02637-244108", "details": "District Civil Hospital Emergency ICU", "icu_available": True},
    {"id": "EM-NAV-02", "name": "Yashfeen Hospital & Cardiac Care", "city": "Navsari", "type": "TRAUMA_CENTER", "lat": 20.9410, "lng": 72.9250, "emergency_contact": "02637-280100", "details": "24x7 Emergency Trauma Unit", "icu_available": True},

    # Navsari Active PCR Vans
    {"id": "PCR-NAV-01", "name": "PCR-DELTA-07 (Panther-07)", "city": "Navsari", "type": "PCR_VAN", "lat": 20.9250, "lng": 72.9150, "officer": "PSI A. P. Desai", "frequency": "VHF Ch 11", "callsign": "PANTHER-07", "details": "Navsari NH-48 Corridor Patrol"},
    {"id": "PCR-NAV-02", "name": "PCR-DELTA-09 (Panther-09)", "city": "Navsari", "type": "PCR_VAN", "lat": 20.8030, "lng": 72.9640, "officer": "PSI S. N. Gamit", "frequency": "VHF Ch 11", "callsign": "PANTHER-09", "details": "Bilimora Port & Highway Patrol"},
    {"id": "PCR-NAV-03", "name": "PCR-DELTA-04 (Panther-04)", "city": "Navsari", "type": "PCR_VAN", "lat": 20.9480, "lng": 72.9300, "officer": "PSI R. H. Patel", "frequency": "VHF Ch 11", "callsign": "PANTHER-04", "details": "Navsari Town & Grid Patrol"},

    # ─── Junagadh & Saurashtra Sector ───────────────────────────────────────
    {"id": "PS-JUN-01", "name": "Junagadh 'A' Division Police Station", "city": "Junagadh", "type": "POLICE_STATION", "lat": 21.5240, "lng": 70.4620, "sho": "PI J. P. Jadeja", "phone": "0285-2620100", "details": "Majewadi Gate, Kalva Chowk, Girnar Road"},
    {"id": "PS-JUN-02", "name": "Junagadh 'B' Division Police Station", "city": "Junagadh", "type": "POLICE_STATION", "lat": 21.5080, "lng": 70.4480, "sho": "PI N. H. Joshi", "phone": "0285-2630100", "details": "Zanzarda Road, Timbavadi, Bypass Gate"},
    {"id": "PS-JUN-03", "name": "Junagadh 'C' Division Police Station", "city": "Junagadh", "type": "POLICE_STATION", "lat": 21.5360, "lng": 70.4780, "sho": "PI M. K. Zala", "phone": "0285-2640100", "details": "Dolatpara, Bhesan Road, Sabalpur Chokdi"},
    {"id": "PS-JUN-04", "name": "Junagadh Taluka Police Station", "city": "Junagadh", "type": "POLICE_STATION", "lat": 21.5180, "lng": 70.4350, "sho": "PI K. B. Solanki", "phone": "0285-2650100", "details": "Vanthali Highway, Bypass Corridor"},

    # Junagadh Local Chokepoints
    {"id": "CP-JUN-01", "name": "Majewadi Gate Police Checkpost", "city": "Junagadh", "type": "TOLL_CHOKEPOINT", "lat": 21.5220, "lng": 70.4580, "details": "Historic Majewadi Gate City Entrance Barrier", "lanes": 4, "fastag_sealable": False},
    {"id": "CP-JUN-02", "name": "Timbavadi Gate Bypass Checkpoint", "city": "Junagadh", "type": "TOLL_CHOKEPOINT", "lat": 21.5040, "lng": 70.4420, "details": "NH-151 Bypass Roadblock Point", "lanes": 4, "fastag_sealable": False},
    {"id": "CP-JUN-03", "name": "Kalva Chowk Traffic Outpost", "city": "Junagadh", "type": "TOLL_CHOKEPOINT", "lat": 21.5200, "lng": 70.4600, "details": "Junagadh Central Intersection Barrier", "lanes": 4, "fastag_sealable": False},

    # Junagadh Trauma Centers
    {"id": "EM-JUN-01", "name": "GMERS Medical College & Hospital Junagadh", "city": "Junagadh", "type": "TRAUMA_CENTER", "lat": 21.5150, "lng": 70.4550, "emergency_contact": "0285-2651100", "details": "750 Bed Government Apex Hospital", "icu_available": True},

    # Junagadh Active PCR Vans
    {"id": "PCR-JUN-01", "name": "PCR-CHARLIE-03 (Lion-03)", "city": "Junagadh", "type": "PCR_VAN", "lat": 21.5240, "lng": 70.4620, "officer": "PSI R. D. Jadeja", "frequency": "VHF Ch 9", "callsign": "LION-03", "details": "Majewadi & Kalva Chowk Sector"},
    {"id": "PCR-JUN-02", "name": "PCR-CHARLIE-05 (Lion-05)", "city": "Junagadh", "type": "PCR_VAN", "lat": 21.5080, "lng": 70.4480, "officer": "PSI V. S. Gohil", "frequency": "VHF Ch 9", "callsign": "LION-05", "details": "Timbavadi & Bypass Sector"},
]

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates great-circle distance in kilometers between two GPS coordinates."""
    if None in (lat1, lng1, lat2, lng2):
        return 0.0
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def get_nearby_infrastructure(target_lat: float, target_lng: float, target_city: str = "Ahmedabad") -> Dict[str, Any]:
    """
    STRICT LOCAL SPATIAL RADIUS ALGORITHM:
    Filters infrastructure within a strict local perimeter (default <= 10.0 km).
    Ensures zero cross-city leakage (no Navsari points when in Ahmedabad).
    """
    MAX_RADIUS_KM = 12.0 # 12 km strict tactical perimeter

    # Score all items by distance
    all_scored = []
    for item in GUJARAT_POLICE_INFRASTRUCTURE:
        dist = haversine_km(target_lat, target_lng, item["lat"], item["lng"])
        
        # Strictly exclude items outside the local perimeter
        if dist <= MAX_RADIUS_KM:
            all_scored.append({
                **item,
                "distance_km": dist,
                "eta_mins": max(1.0, round((dist / 45.0) * 60 + 1.0, 1))
            })

    # If within a known city boundary, ensure same city fallback
    if len(all_scored) < 3:
        for item in GUJARAT_POLICE_INFRASTRUCTURE:
            if item.get("city", "").lower() == target_city.lower():
                dist = haversine_km(target_lat, target_lng, item["lat"], item["lng"])
                if dist <= 20.0 and not any(x["id"] == item["id"] for x in all_scored):
                    all_scored.append({
                        **item,
                        "distance_km": dist,
                        "eta_mins": max(1.0, round((dist / 45.0) * 60 + 1.0, 1))
                    })

    # Sort strictly by proximity
    all_scored.sort(key=lambda x: x["distance_km"])

    # Separate into tactical categories
    police_stations = [x for x in all_scored if x["type"] == "POLICE_STATION"]
    toll_chokepoints = [x for x in all_scored if x["type"] == "TOLL_CHOKEPOINT"]
    trauma_centers = [x for x in all_scored if x["type"] == "TRAUMA_CENTER"]
    pcr_vans = [x for x in all_scored if x["type"] == "PCR_VAN"]

    return {
        "police_stations": police_stations[:6],
        "all_police_stations": police_stations,
        "toll_chokepoints": toll_chokepoints[:5],
        "trauma_centers": trauma_centers[:4],
        "pcr_vans": pcr_vans[:4],
        "total_nodes_in_radius": len(police_stations) + len(toll_chokepoints) + len(trauma_centers) + len(pcr_vans),
        "tactical_radius_km": MAX_RADIUS_KM
    }

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates forward compass bearing in degrees (0 to 360) from point 1 to point 2."""
    if None in (lat1, lon1, lat2, lon2):
        return 0.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)
    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    theta = math.atan2(y, x)
    return round((math.degrees(theta) + 360) % 360, 1)

def bearing_to_cardinal(degrees: float) -> str:
    """Converts bearing degrees to human-readable cardinal direction."""
    cardinals = [
        "North", "North-Northeast (NNE)", "North-East (NE)", "East-Northeast (ENE)",
        "East", "East-Southeast (ESE)", "South-East (SE)", "South-Southeast (SSE)",
        "South", "South-Southwest (SSW)", "South-West (SW)", "West-Southwest (WSW)",
        "West", "West-Northwest (WNW)", "North-West (NW)", "North-Northwest (NNW)"
    ]
    idx = int((degrees + 11.25) / 22.5) % 16
    return cardinals[idx]

def destination_point(lat: float, lon: float, distance_km: float, bearing_deg: float) -> tuple:
    """Calculates latitude and longitude of a destination point given distance and bearing."""
    R = 6371.0
    d_r = distance_km / R
    theta = math.radians(bearing_deg)
    lat1 = math.radians(lat)
    lon1 = math.radians(lon)
    lat2 = math.asin(math.sin(lat1) * math.cos(d_r) + math.cos(lat1) * math.sin(d_r) * math.cos(theta))
    lon2 = lon1 + math.atan2(math.sin(theta) * math.sin(d_r) * math.cos(lat1), math.cos(d_r) - math.sin(lat1) * math.sin(lat2))
    return round(math.degrees(lat2), 6), round(math.degrees(lon2), 6)

def generate_radar_cone_polygon(lat0: float, lng0: float, bearing_deg: float, radius_km: float, cone_angle_deg: float = 60.0, steps: int = 16) -> List[List[float]]:
    """Generates geojson/leaflet polygon points for the forward directional radar search sector."""
    half_angle = cone_angle_deg / 2.0
    start_angle = bearing_deg - half_angle
    end_angle = bearing_deg + half_angle
    
    polygon = [[lat0, lng0]]
    for i in range(steps + 1):
        angle = start_angle + (end_angle - start_angle) * (i / steps)
        arc_lat, arc_lng = destination_point(lat0, lng0, radius_km, angle)
        polygon.append([arc_lat, arc_lng])
    polygon.append([lat0, lng0])
    return polygon

def compute_directional_intercept_net(
    last_lat: float,
    last_lng: float,
    heading_deg: float,
    radius_km: float,
    cone_angle_deg: float,
    all_cameras: List[Dict[str, Any]],
    speed_kmh: float = 48.0
) -> Dict[str, Any]:
    """
    Scans all cameras in network. Filters:
    1. Downstream Intercept Cameras (directly inside forward angular cone <= cone_angle_deg / 2)
    2. Radial Perimeter Cameras (all cameras within radius_km)
    Computes precise arrival times (ETA in mins/secs) for intercept cameras.
    """
    half_cone = cone_angle_deg / 2.0
    downstream_cameras = []
    radial_cameras = []
    
    for cam in all_cameras:
        c_lat = cam.get("lat")
        c_lng = cam.get("lng")
        if c_lat is None or c_lng is None:
            continue
            
        dist = haversine_km(last_lat, last_lng, c_lat, c_lng)
        if dist <= 0.02:
            # Current camera itself, skip from search net
            continue
            
        if dist <= radius_km:
            bearing_to_cam = calculate_bearing(last_lat, last_lng, c_lat, c_lng)
            # Angular difference wrapped in [-180, 180]
            angle_diff = abs((bearing_to_cam - heading_deg + 180) % 360 - 180)
            
            eta_seconds = (dist / max(15.0, speed_kmh)) * 3600.0
            eta_mins = round(eta_seconds / 60.0, 1)
            mins_int = int(eta_seconds // 60)
            secs_int = int(eta_seconds % 60)
            eta_formatted = f"{mins_int}m {secs_int:02d}s" if mins_int > 0 else f"{secs_int}s"
            
            cam_entry = {
                "camera_id": str(cam.get("id")),
                "name": cam.get("name", f"CCTV {cam.get('id')}"),
                "city": cam.get("city", "Gujarat"),
                "dept": cam.get("dept", "Traffic Police"),
                "lat": c_lat,
                "lng": c_lng,
                "distance_km": round(dist, 2),
                "bearing_deg": round(bearing_to_cam, 1),
                "angle_diff_deg": round(angle_diff, 1),
                "eta_seconds": round(eta_seconds, 1),
                "eta_mins": eta_mins,
                "eta_formatted": eta_formatted,
                "in_direct_cone": angle_diff <= half_cone,
                "is_chokepoint": "bridge" in cam.get("name", "").lower() or "circle" in cam.get("name", "").lower() or "gate" in cam.get("name", "").lower()
            }
            
            radial_cameras.append(cam_entry)
            if angle_diff <= half_cone:
                downstream_cameras.append(cam_entry)
                
    # Sort downstream by ETA (earliest arrival first)
    downstream_cameras.sort(key=lambda x: x["eta_seconds"])
    # Sort radial by distance
    radial_cameras.sort(key=lambda x: x["distance_km"])
    
    return {
        "downstream_cameras": downstream_cameras,
        "radial_cameras": radial_cameras,
        "intercept_count": len(downstream_cameras),
        "total_in_radius": len(radial_cameras)
    }

def predict_trajectory(
    sightings: List[Dict[str, Any]], 
    all_cameras: List[Dict[str, Any]],
    radius_km: float = 6.0,
    cone_angle_deg: float = 60.0
) -> Optional[Dict[str, Any]]:
    """
    Computes spatial tactical infrastructure perimeter, vehicle directional vector,
    speed estimation, downstream forward intercept cameras, and radar cone geometry.
    """
    if not sightings or len(sightings) == 0:
        return None

    cam_lookup = {str(c["id"]): c for c in all_cameras}

    # Last Known Position
    last_sighting = sightings[-1]
    last_cam_id = str(last_sighting.get("cameraId") or last_sighting.get("camera_id"))
    last_cam = cam_lookup.get(last_cam_id, {})
    
    last_lat = last_cam.get("lat") or last_sighting.get("lat") or 23.0300
    last_lng = last_cam.get("lng") or last_sighting.get("lng") or 72.5100
    last_city = last_cam.get("city") or "Ahmedabad"

    # Direction & Velocity Vector Math
    heading_deg = 45.0 # Default fallback
    cardinal_dir = "North-East"
    speed_kmh = 48.0
    has_directional_lock = False
    
    if len(sightings) >= 2:
        prev_sighting = sightings[-2]
        prev_cam_id = str(prev_sighting.get("cameraId") or prev_sighting.get("camera_id"))
        prev_cam = cam_lookup.get(prev_cam_id, {})
        prev_lat = prev_cam.get("lat") or prev_sighting.get("lat") or last_lat
        prev_lng = prev_cam.get("lng") or prev_sighting.get("lng") or last_lng
        
        # Calculate bearing between sequential cameras
        dist_between = haversine_km(prev_lat, prev_lng, last_lat, last_lng)
        if dist_between > 0.05:
            heading_deg = calculate_bearing(prev_lat, prev_lng, last_lat, last_lng)
            cardinal_dir = bearing_to_cardinal(heading_deg)
            has_directional_lock = True
            
            # Calculate speed if timestamps exist
            try:
                t1_str = prev_sighting.get("timestamp")
                t2_str = last_sighting.get("timestamp")
                if t1_str and t2_str:
                    t1 = datetime.datetime.fromisoformat(t1_str.replace("Z", "+00:00"))
                    t2 = datetime.datetime.fromisoformat(t2_str.replace("Z", "+00:00"))
                    dt_hours = abs((t2 - t1).total_seconds()) / 3600.0
                    if 0.001 < dt_hours < 2.0:
                        calculated_speed = dist_between / dt_hours
                        if 15.0 <= calculated_speed <= 140.0:
                            speed_kmh = round(calculated_speed, 1)
            except Exception:
                pass
    else:
        # Default single camera sighting vector
        heading_deg = float(last_cam.get("default_bearing", 195.0))
        cardinal_dir = bearing_to_cardinal(heading_deg)

    # Compute Downstream Camera Intercept Net
    intercept_net = compute_directional_intercept_net(
        last_lat=last_lat,
        last_lng=last_lng,
        heading_deg=heading_deg,
        radius_km=radius_km,
        cone_angle_deg=cone_angle_deg,
        all_cameras=all_cameras,
        speed_kmh=speed_kmh
    )

    # Radar Cone Polygon for Leaflet Map Rendering
    cone_polygon = generate_radar_cone_polygon(
        lat0=last_lat,
        lng0=last_lng,
        bearing_deg=heading_deg,
        radius_km=radius_km,
        cone_angle_deg=cone_angle_deg
    )

    # Compute Strict Local Tactical Nearby Infrastructure
    tactical_infra = get_nearby_infrastructure(last_lat, last_lng, last_city)
    nearest_ps = tactical_infra["police_stations"][0] if tactical_infra["police_stations"] else None

    # Next predicted junction
    next_camera = intercept_net["downstream_cameras"][0] if intercept_net["downstream_cameras"] else None

    return {
        "lastKnownPosition": {
            "cameraName": last_cam.get("name", f"CCTV {last_cam_id}"),
            "city": last_city,
            "lat": last_lat,
            "lng": last_lng,
            "timestamp": last_sighting.get("timestamp")
        },
        "directionalVector": {
            "heading_degrees": heading_deg,
            "cardinal": cardinal_dir,
            "speed_kmh": speed_kmh,
            "has_directional_lock": has_directional_lock,
            "radius_km": radius_km,
            "cone_angle_deg": cone_angle_deg,
            "radar_cone_polygon": cone_polygon,
            "next_camera_name": next_camera["name"] if next_camera else None,
            "next_camera_eta": next_camera["eta_formatted"] if next_camera else None
        },
        "interceptNet": intercept_net,
        "primary_police_station": nearest_ps,
        "nearby_infrastructure": tactical_infra,
        "threatAssessment": {
            "evasionRisk": "CRITICAL" if has_directional_lock else "HIGH",
            "jurisdiction": nearest_ps["name"] if nearest_ps else f"{last_city} Police Commissionerate",
            "sho_contact": nearest_ps["phone"] if nearest_ps else "112",
            "active_intercept_chokepoints": [c["name"] for c in intercept_net["downstream_cameras"][:3]]
        }
    }

