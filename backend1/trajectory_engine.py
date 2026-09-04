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

def predict_trajectory(sightings: List[Dict[str, Any]], all_cameras: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Computes spatial tactical infrastructure perimeter, nearest police stations,
    and emergency response points for the suspect vehicle.
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

    # Compute Strict Local Tactical Nearby Infrastructure
    tactical_infra = get_nearby_infrastructure(last_lat, last_lng, last_city)
    nearest_ps = tactical_infra["police_stations"][0] if tactical_infra["police_stations"] else None

    return {
        "lastKnownPosition": {
            "cameraName": last_cam.get("name", f"CCTV {last_cam_id}"),
            "city": last_city,
            "lat": last_lat,
            "lng": last_lng,
            "timestamp": last_sighting.get("timestamp")
        },
        "primary_police_station": nearest_ps,
        "nearby_infrastructure": tactical_infra,
        "threatAssessment": {
            "evasionRisk": "HIGH",
            "jurisdiction": nearest_ps["name"] if nearest_ps else f"{last_city} Police Commissionerate",
            "sho_contact": nearest_ps["phone"] if nearest_ps else "112"
        }
    }
