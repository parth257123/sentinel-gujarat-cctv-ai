"""
Vehicle Re-Identification (ReID) Engine
Extracts visual feature fingerprints & body color for cross-camera tracking.
Optimized with MobileNetV3 on Apple Silicon GPU (MPS).
"""

import torch
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
import numpy as np
import cv2

class VehicleReIDEngine:
    def __init__(self):
        self.device = 'mps' if torch.backends.mps.is_available() else 'cpu'
        print(f"[ReID Engine] Initializing MobileNetV3 feature extractor on {self.device}")
        self.model = models.mobilenet_v3_small(weights='DEFAULT').eval().to(self.device)
        self.transform = transforms.Compose([
            transforms.Resize((128, 128)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def extract_embedding(self, crop):
        """Extracts a 1024-d normalized visual embedding vector."""
        if crop is None or crop.size == 0:
            return None
        try:
            rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb)
            tensor = self.transform(pil_img).unsqueeze(0).to(self.device)
            with torch.no_grad():
                feat = self.model.features(tensor)
                emb = self.model.classifier[:1](feat.mean([2, 3])).cpu().numpy().flatten()
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm
                return emb.tolist()
        except Exception:
            return None

    def detect_color(self, crop):
        """Determines the dominant body color of the vehicle using HSV color analysis."""
        if crop is None or crop.size == 0:
            return "Unknown"
        try:
            from vehicle_color_classifier import extract_vehicle_color
            h, w = crop.shape[:2]
            color = extract_vehicle_color(crop, (0, 0, w, h))
            return color if color != "Unknown" else "White"
        except Exception:
            return "White"

    @staticmethod
    def compute_similarity(emb1, emb2):
        if not emb1 or not emb2:
            return 0.0
        v1 = np.array(emb1)
        v2 = np.array(emb2)
        dot = np.dot(v1, v2)
        norm = (np.linalg.norm(v1) * np.linalg.norm(v2))
        return float(dot / norm) if norm > 0 else 0.0
