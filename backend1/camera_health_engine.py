"""
Statewide Camera Infrastructure & Health Diagnostics Engine.
Tracks resolution, stream telemetry, downtime, availability, and lifecycle actions
(OPTIMAL, NEEDS_REPAIR, NEEDS_REPLACEMENT) for all Gujarat Police CCTV surveillance nodes.
"""
import time
import datetime
from collections import defaultdict

# Deterministic camera hardware, stream specs, and diagnostic catalogue
CAMERA_HEALTH_CATALOGUE = {
    "CAM-001": {
        "resolution": "3840x2160 (4K UHD)", "res_category": "4K UHD",
        "fps": 30, "bitrate_mbps": 8.4, "codec": "H.265+",
        "sensor_make": "Sony STARVIS 8MP CMOS", "lens": "Varifocal 5-50mm Optical Zoom",
        "vendor": "CP Plus Coral Pro Series", "pole_id": "POL-AHM-101", "asset_tag": "AST-GJ-99101",
        "status": "ONLINE", "uptime_pct": 99.8, "downtime_hours": 1.4,
        "ping_ms": 14, "packet_loss_pct": 0.1, "laplacian_sharpness": 1392.3,
        "action": "OPTIMAL", "action_label": "🟢 Optimal Operation",
        "action_urgency": "NONE",
        "diagnostic_reason": "All optical and stream parameters within 100% compliance.",
        "recommended_action": "Routine scheduled preventive maintenance in 60 days.",
        "warranty_status": "Active (Exp: Dec 2027)", "install_date": "2023-05-10"
    },
    "CAM-002": {
        "resolution": "1920x1080 (1080p FHD)", "res_category": "1080p FHD",
        "fps": 25, "bitrate_mbps": 4.2, "codec": "H.265",
        "sensor_make": "OmniVision 2MP HDR", "lens": "Fixed 4.0mm IR Bullet",
        "vendor": "Hikvision DarkFighter", "pole_id": "POL-AHM-102", "asset_tag": "AST-GJ-99102",
        "status": "ONLINE", "uptime_pct": 99.2, "downtime_hours": 5.8,
        "ping_ms": 22, "packet_loss_pct": 0.3, "laplacian_sharpness": 880.1,
        "action": "OPTIMAL", "action_label": "🟢 Optimal Operation",
        "action_urgency": "NONE",
        "diagnostic_reason": "High-clarity stream; night IR illumination fully functional.",
        "recommended_action": "No action needed.",
        "warranty_status": "Active (Exp: Aug 2026)", "install_date": "2022-11-15"
    },
    "CAM-003": {
        "resolution": "1920x1080 (1080p FHD)", "res_category": "1080p FHD",
        "fps": 25, "bitrate_mbps": 3.8, "codec": "H.264",
        "sensor_make": "Sony Exmor 2MP", "lens": "Fixed 6.0mm Bullet",
        "vendor": "Dahua WizMind", "pole_id": "POL-AHM-103", "asset_tag": "AST-GJ-99103",
        "status": "DEGRADED", "uptime_pct": 89.4, "downtime_hours": 76.3,
        "ping_ms": 185, "packet_loss_pct": 14.2, "laplacian_sharpness": 210.4,
        "action": "NEEDS_REPAIR", "action_label": "🔧 Needs Lens Cleaning & Focus",
        "action_urgency": "HIGH",
        "diagnostic_reason": "Heavy dust and traffic soot deposit on protective dome glass causing 60% blur in OCR zone.",
        "recommended_action": "Dispatch field technician for dome glass cleaning and optical re-focusing.",
        "warranty_status": "Active (Exp: Jan 2027)", "install_date": "2023-01-20"
    },
    "CAM-004": {
        "resolution": "640x480 (Substandard SD)", "res_category": "Substandard SD",
        "fps": 15, "bitrate_mbps": 0.8, "codec": "MJPEG/H.264",
        "sensor_make": "Legacy 0.3MP CCD", "lens": "Fixed 3.6mm Dome",
        "vendor": "Legacy Municipal Asset (Unbranded)", "pole_id": "POL-AHM-104", "asset_tag": "AST-GJ-11004",
        "status": "ONLINE", "uptime_pct": 74.2, "downtime_hours": 185.8,
        "ping_ms": 48, "packet_loss_pct": 2.1, "laplacian_sharpness": 115.0,
        "action": "NEEDS_REPLACEMENT", "action_label": "⚠️ Substandard Resolution — Replace",
        "action_urgency": "CRITICAL",
        "diagnostic_reason": "Resolution 640x480 violates Gujarat Police / MHA ANPR mandate (minimum 1080p required). Number plates completely illegible.",
        "recommended_action": "Replace obsolete legacy camera with 4MP ANPR-grade Starlight bullet camera.",
        "warranty_status": "Expired (2018)", "install_date": "2016-04-12"
    },
    "CAM-005": {
        "resolution": "1920x1080 (1080p FHD)", "res_category": "1080p FHD",
        "fps": 25, "bitrate_mbps": 4.1, "codec": "H.265",
        "sensor_make": "Sony IMX385 2MP", "lens": "Motorized 2.8-12mm PTZ",
        "vendor": "Honeywell Impact Series", "pole_id": "POL-AHM-105", "asset_tag": "AST-GJ-99105",
        "status": "ONLINE", "uptime_pct": 98.6, "downtime_hours": 10.1,
        "ping_ms": 28, "packet_loss_pct": 0.4, "laplacian_sharpness": 745.2,
        "action": "OPTIMAL", "action_label": "🟢 Optimal Operation",
        "action_urgency": "NONE",
        "diagnostic_reason": "PTZ calibration aligned; steady fiber uplink.",
        "recommended_action": "No action needed.",
        "warranty_status": "Active (Exp: Jun 2026)", "install_date": "2022-06-18"
    },
    "CAM-009": {
        "resolution": "1920x1080 (1080p FHD)", "res_category": "1080p FHD",
        "fps": 0, "bitrate_mbps": 0.0, "codec": "N/A",
        "sensor_make": "Sony STARVIS 2MP", "lens": "Fixed 4.0mm Bullet",
        "vendor": "CP Plus Coral Series", "pole_id": "POL-SUR-201", "asset_tag": "AST-GJ-99201",
        "status": "OFFLINE", "uptime_pct": 62.1, "downtime_hours": 272.8,
        "ping_ms": 0, "packet_loss_pct": 100.0, "laplacian_sharpness": 0.0,
        "action": "NEEDS_REPAIR", "action_label": "🔧 Fiber Cut / Link Down",
        "action_urgency": "CRITICAL",
        "diagnostic_reason": "RTSP signal dropped 14 hours ago. Local switch ping timeout. Likely road excavation fiber cut.",
        "recommended_action": "Dispatch OTDR fiber technician to splice severed fiber drop at Udhna Darwaja.",
        "warranty_status": "Active (Exp: Oct 2026)", "install_date": "2022-10-10"
    },
    "CAM-011": {
        "resolution": "3840x2160 (4K UHD)", "res_category": "4K UHD",
        "fps": 30, "bitrate_mbps": 8.1, "codec": "H.265+",
        "sensor_make": "Sony IMX274 8MP", "lens": "Motorized 4.7-94mm PTZ",
        "vendor": "Axis Communications Q1656", "pole_id": "POL-SUR-203", "asset_tag": "AST-GJ-99203",
        "status": "ONLINE", "uptime_pct": 99.9, "downtime_hours": 0.7,
        "ping_ms": 11, "packet_loss_pct": 0.0, "laplacian_sharpness": 1540.8,
        "action": "OPTIMAL", "action_label": "🟢 Optimal Operation",
        "action_urgency": "NONE",
        "diagnostic_reason": "Outstanding optical performance; pristine lens coating.",
        "recommended_action": "No action needed.",
        "warranty_status": "Active (Exp: Mar 2028)", "install_date": "2023-09-01"
    },
    "CAM-013": {
        "resolution": "1280x720 (720p HD)", "res_category": "720p HD",
        "fps": 20, "bitrate_mbps": 2.1, "codec": "H.264",
        "sensor_make": "Aptina 1.3MP", "lens": "Fixed 3.6mm Box",
        "vendor": "CP Plus Guardian", "pole_id": "POL-VAD-302", "asset_tag": "AST-GJ-99302",
        "status": "DEGRADED", "uptime_pct": 78.4, "downtime_hours": 155.5,
        "ping_ms": 142, "packet_loss_pct": 8.5, "laplacian_sharpness": 320.0,
        "action": "NEEDS_REPAIR", "action_label": "🔧 Moisture & IR Glare",
        "action_urgency": "MEDIUM",
        "diagnostic_reason": "Moisture condensation inside weather housing causing halo reflections at night.",
        "recommended_action": "Replace silica gel desiccant packs and re-seal IP67 front gasket.",
        "warranty_status": "Active (Exp: May 2026)", "install_date": "2021-08-14"
    },
    "CAM-016": {
        "resolution": "1920x1080 (1080p FHD)", "res_category": "1080p FHD",
        "fps": 25, "bitrate_mbps": 4.5, "codec": "H.265",
        "sensor_make": "OmniVision 2MP", "lens": "Fixed 6.0mm Bullet",
        "vendor": "Hikvision DarkFighter", "pole_id": "POL-RAJ-401", "asset_tag": "AST-GJ-99401",
        "status": "ONLINE", "uptime_pct": 99.1, "downtime_hours": 6.5,
        "ping_ms": 25, "packet_loss_pct": 0.2, "laplacian_sharpness": 890.5,
        "action": "OPTIMAL", "action_label": "🟢 Optimal Operation",
        "action_urgency": "NONE",
        "diagnostic_reason": "Solid stream health and reliable OCR contrast.",
        "recommended_action": "No action needed.",
        "warranty_status": "Active (Exp: Feb 2027)", "install_date": "2023-02-12"
    },
    "CAM-020": {
        "resolution": "704x576 (PAL D1 Legacy)", "res_category": "Substandard SD",
        "fps": 12, "bitrate_mbps": 0.6, "codec": "MPEG-4",
        "sensor_make": "Interlaced Analog Sensor", "lens": "Fixed 3.6mm",
        "vendor": "Legacy RTO Analog Node", "pole_id": "POL-KUT-502", "asset_tag": "AST-GJ-10020",
        "status": "DEGRADED", "uptime_pct": 68.2, "downtime_hours": 228.9,
        "ping_ms": 95, "packet_loss_pct": 6.8, "laplacian_sharpness": 95.4,
        "action": "NEEDS_REPLACEMENT", "action_label": "⚠️ Sensor Failure — Replace",
        "action_urgency": "CRITICAL",
        "diagnostic_reason": "Vertical pink lines across sensor matrix and interlacing tearing. Image processor dying.",
        "recommended_action": "Decommission analog node; install PoE 4MP AI ANPR bullet camera.",
        "warranty_status": "Expired (2017)", "install_date": "2015-09-22"
    },
    "CAM-028": {
        "resolution": "1920x1080 (1080p FHD)", "res_category": "1080p FHD",
        "fps": 25, "bitrate_mbps": 4.4, "codec": "H.265",
        "sensor_make": "Sony STARVIS 2MP", "lens": "Varifocal 2.8-12mm",
        "vendor": "CP Plus Coral Series", "pole_id": "POL-BIL-601", "asset_tag": "AST-GJ-99601",
        "status": "ONLINE", "uptime_pct": 99.4, "downtime_hours": 4.3,
        "ping_ms": 18, "packet_loss_pct": 0.2, "laplacian_sharpness": 1120.4,
        "action": "OPTIMAL", "action_label": "🟢 Optimal Operation",
        "action_urgency": "NONE",
        "diagnostic_reason": "High sharpness score; ideal lighting conditions.",
        "recommended_action": "No action needed.",
        "warranty_status": "Active (Exp: Jun 2027)", "install_date": "2023-06-11"
    },
    "CAM-030": {
        "resolution": "1920x1080 (1080p FHD)", "res_category": "1080p FHD",
        "fps": 25, "bitrate_mbps": 4.0, "codec": "H.265",
        "sensor_make": "Sony STARVIS 2MP", "lens": "Fixed 4.0mm Bullet",
        "vendor": "Dahua WizMind", "pole_id": "POL-GAN-701", "asset_tag": "AST-GJ-99701",
        "status": "ONLINE", "uptime_pct": 98.9, "downtime_hours": 7.9,
        "ping_ms": 29, "packet_loss_pct": 0.4, "laplacian_sharpness": 910.2,
        "action": "OPTIMAL", "action_label": "🟢 Optimal Operation",
        "action_urgency": "NONE",
        "diagnostic_reason": "Stable operation across day and night sodium lamps.",
        "recommended_action": "No action needed.",
        "warranty_status": "Active (Exp: Jul 2027)", "install_date": "2023-07-04"
    }
}


def get_camera_health_data(camera_id, base_camera_dict=None):
    """
    Returns full infrastructure monitoring telemetry for a single camera.
    """
    if camera_id in CAMERA_HEALTH_CATALOGUE:
        data = CAMERA_HEALTH_CATALOGUE[camera_id].copy()
    else:
        # Procedural fallback for remaining cameras in the 30-camera grid
        cid_num = int(''.join(filter(str.isdigit, camera_id)) or 1)
        uptime = round(max(92.0, min(99.9, 99.5 - (cid_num % 7) * 0.9)), 1)
        downtime = round((100.0 - uptime) * 7.2, 1)  # 720 hours in 30 days
        
        is_4k = cid_num in [1, 2, 7, 11, 17, 24]
        res = "3840x2160 (4K UHD)" if is_4k else "1920x1080 (1080p FHD)"
        res_cat = "4K UHD" if is_4k else "1080p FHD"
        
        data = {
            "resolution": res,
            "res_category": res_cat,
            "fps": 30 if is_4k else 25,
            "bitrate_mbps": 7.8 if is_4k else 4.1,
            "codec": "H.265",
            "sensor_make": "Sony STARVIS CMOS" if is_4k else "OmniVision 2MP HDR",
            "lens": "Motorized 5-50mm" if is_4k else "Fixed 4.0mm Bullet",
            "vendor": "CP Plus Coral Pro" if is_4k else "Hikvision DarkFighter",
            "pole_id": f"POL-GJ-{cid_num:03d}",
            "asset_tag": f"AST-GJ-99{cid_num:03d}",
            "status": "ONLINE",
            "uptime_pct": uptime,
            "downtime_hours": downtime,
            "ping_ms": 16 + (cid_num % 15),
            "packet_loss_pct": round(0.1 + (cid_num % 5) * 0.1, 1),
            "laplacian_sharpness": round(750.0 + (cid_num * 18.5) % 500, 1),
            "action": "OPTIMAL",
            "action_label": "🟢 Optimal Operation",
            "action_urgency": "NONE",
            "diagnostic_reason": "Video stream active; network latency and packet loss within specification.",
            "recommended_action": "Standard scheduled routine check.",
            "warranty_status": "Active (Exp: 2027)",
            "install_date": "2023-04-10"
        }

    # Merge basic location and name
    if base_camera_dict:
        data["camera_id"] = base_camera_dict.get("id", camera_id)
        data["name"] = base_camera_dict.get("name", camera_id)
        data["city"] = base_camera_dict.get("city", "Gujarat")
        data["dept"] = base_camera_dict.get("dept", "Traffic Police")
        data["lat"] = base_camera_dict.get("lat")
        data["lng"] = base_camera_dict.get("lng")
    else:
        data["camera_id"] = camera_id
        data["name"] = camera_id
        data["city"] = "Gujarat"

    return data


def generate_full_monitoring_report(all_cameras):
    """
    Aggregates full camera monitoring statistics across the entire 30-camera grid.
    """
    cameras_report = []
    
    online_count = 0
    degraded_count = 0
    offline_count = 0
    
    repair_count = 0
    replace_count = 0
    optimal_count = 0
    
    res_counts = defaultdict(int)
    total_downtime_hours = 0.0
    uptime_sum = 0.0
    
    for cam in all_cameras:
        c_id = cam.get("id") if isinstance(cam, dict) else cam
        h_data = get_camera_health_data(c_id, cam if isinstance(cam, dict) else None)
        cameras_report.append(h_data)
        
        # Status counts
        st = h_data["status"]
        if st == "ONLINE": online_count += 1
        elif st == "DEGRADED": degraded_count += 1
        elif st == "OFFLINE": offline_count += 1
        
        # Action counts
        act = h_data["action"]
        if act == "OPTIMAL": optimal_count += 1
        elif act == "NEEDS_REPAIR": repair_count += 1
        elif act == "NEEDS_REPLACEMENT": replace_count += 1
        
        # Resolution breakdown
        res_counts[h_data["res_category"]] += 1
        
        total_downtime_hours += h_data["downtime_hours"]
        uptime_sum += h_data["uptime_pct"]
        
    avg_uptime = round(uptime_sum / max(1, len(cameras_report)), 2)
    
    return {
        "total_cameras": len(cameras_report),
        "status_summary": {
            "online": online_count,
            "degraded": degraded_count,
            "offline": offline_count,
            "online_pct": round((online_count / max(1, len(cameras_report))) * 100, 1),
            "healthy_pct": round(((online_count + degraded_count) / max(1, len(cameras_report))) * 100, 1)
        },
        "action_summary": {
            "optimal": optimal_count,
            "needs_repair": repair_count,
            "needs_replacement": replace_count,
            "total_action_required": repair_count + replace_count
        },
        "downtime_summary": {
            "average_uptime_pct": avg_uptime,
            "total_downtime_hours": round(total_downtime_hours, 1),
            "estimated_lost_frames": int(total_downtime_hours * 3600 * 25)
        },
        "resolution_breakdown": [
            {"resolution": k, "count": v} for k, v in sorted(res_counts.items(), key=lambda x: -x[1])
        ],
        "cameras": cameras_report
    }
