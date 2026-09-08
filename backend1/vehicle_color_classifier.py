"""
Vehicle Color Extraction Utility — HSV-based dominant color detection for CCTV frames.
Classifies the body color of a detected vehicle from its bounding box crop.
"""
import cv2
import numpy as np

# 10 common Indian vehicle body colors with HSV ranges
COLOR_RANGES = [
    # (name, lower_hsv, upper_hsv)
    ("Red",       np.array([0, 70, 50]),    np.array([10, 255, 255])),
    ("Red",       np.array([170, 70, 50]),  np.array([180, 255, 255])),   # Red wraps around hue
    ("Orange",    np.array([10, 100, 100]), np.array([25, 255, 255])),
    ("Yellow",    np.array([25, 70, 100]),  np.array([35, 255, 255])),
    ("Green",     np.array([35, 50, 50]),   np.array([85, 255, 255])),
    ("Blue",      np.array([100, 50, 50]),  np.array([130, 255, 255])),
    ("Maroon",    np.array([0, 50, 20]),    np.array([10, 200, 100])),
]

# Achromatic detection thresholds
WHITE_THRESH = (0, 30, 200)    # Low saturation, high value
BLACK_THRESH = (0, 255, 50)     # Any hue, low value
SILVER_THRESH = (0, 30, 100)    # Low saturation, medium value


def extract_vehicle_color(frame, bbox_xyxy):
    """
    Extracts the dominant body color of a vehicle from a cropped bounding box.
    
    Args:
        frame: Full frame (BGR numpy array)
        bbox_xyxy: Bounding box as (x1, y1, x2, y2) in pixel coordinates
        
    Returns:
        str: Color name (e.g., "White", "Black", "Red", "Blue", "Silver/Grey", etc.)
    """
    try:
        x1, y1, x2, y2 = map(int, bbox_xyxy)
        h, w = frame.shape[:2]
        
        # Clamp to frame bounds
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0 or crop.shape[0] < 10 or crop.shape[1] < 10:
            return "Unknown"
        
        ch, cw = crop.shape[:2]
        
        # Mask: keep only the middle 60% vertically (skip windshield top 25% and road/shadow bottom 15%)
        top_cut = int(ch * 0.25)
        bot_cut = int(ch * 0.85)
        # Also skip 10% from each side to avoid road edges
        left_cut = int(cw * 0.1)
        right_cut = int(cw * 0.9)
        
        body_region = crop[top_cut:bot_cut, left_cut:right_cut]
        if body_region.size == 0 or body_region.shape[0] < 5 or body_region.shape[1] < 5:
            body_region = crop
        
        # Convert to HSV
        hsv = cv2.cvtColor(body_region, cv2.COLOR_BGR2HSV)
        
        total_pixels = hsv.shape[0] * hsv.shape[1]
        if total_pixels == 0:
            return "Unknown"
        
        # 1. Check achromatic colors first (White, Black, Silver/Grey)
        # White: low saturation, high value
        white_mask = cv2.inRange(hsv, np.array([0, 0, 200]), np.array([180, 30, 255]))
        white_ratio = cv2.countNonZero(white_mask) / total_pixels
        
        # Black: any hue, very low value
        black_mask = cv2.inRange(hsv, np.array([0, 0, 0]), np.array([180, 255, 50]))
        black_ratio = cv2.countNonZero(black_mask) / total_pixels
        
        # Silver/Grey: low saturation, medium value
        silver_mask = cv2.inRange(hsv, np.array([0, 0, 50]), np.array([180, 30, 200]))
        silver_ratio = cv2.countNonZero(silver_mask) / total_pixels
        
        # 2. Check chromatic colors
        color_scores = {}
        for name, lower, upper in COLOR_RANGES:
            mask = cv2.inRange(hsv, lower, upper)
            ratio = cv2.countNonZero(mask) / total_pixels
            color_scores[name] = color_scores.get(name, 0) + ratio
        
        # Find best chromatic color
        best_chromatic = max(color_scores, key=color_scores.get) if color_scores else "Unknown"
        best_chromatic_ratio = color_scores.get(best_chromatic, 0)
        
        # Decision logic: achromatic wins if dominant, else pick best chromatic
        candidates = [
            ("White", white_ratio),
            ("Black", black_ratio),
            ("Silver/Grey", silver_ratio),
            (best_chromatic, best_chromatic_ratio),
        ]
        
        winner = max(candidates, key=lambda x: x[1])
        
        # Minimum threshold — if nothing is dominant, classify based on average brightness
        if winner[1] < 0.15:
            avg_val = np.mean(hsv[:, :, 2])
            avg_sat = np.mean(hsv[:, :, 1])
            if avg_val > 180 and avg_sat < 40:
                return "White"
            elif avg_val < 60:
                return "Black"
            elif avg_sat < 40:
                return "Silver/Grey"
            else:
                return best_chromatic if best_chromatic_ratio > 0.05 else "White"
        
        return winner[0]
        
    except Exception:
        return "Unknown"


def get_color_hex(color_name):
    """Returns a display hex color for the vehicle color name."""
    HEX_MAP = {
        "White": "#f1f5f9",
        "Black": "#1e293b",
        "Silver/Grey": "#94a3b8",
        "Red": "#ef4444",
        "Blue": "#3b82f6",
        "Green": "#22c55e",
        "Yellow": "#eab308",
        "Orange": "#f97316",
        "Maroon": "#991b1b",
        "Brown": "#92400e",
        "Unknown": "#64748b",
    }
    return HEX_MAP.get(color_name, "#64748b")
