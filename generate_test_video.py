import cv2
import numpy as np
import os

def create_test_video(output_path="test_traffic.mp4"):
    width, height = 800, 600
    fps = 30
    duration = 5  # seconds
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    # Background color (asphalt road)
    bg_color = (60, 60, 60)
    
    for frame_idx in range(fps * duration):
        frame = np.full((height, width, 3), bg_color, dtype=np.uint8)
        
        # Add road markings
        for y in range(0, height, 100):
            cv2.rectangle(frame, (width//2 - 10, y), (width//2 + 10, y+50), (255, 255, 255), -1)
            
        # Vehicle properties
        car_width, car_height = 200, 150
        
        # Move the car from top to bottom
        car_x = width // 2 - car_width // 2
        car_y = int((frame_idx / (fps * duration)) * height) - car_height
        
        if car_y + car_height > 0 and car_y < height:
            # Draw car body
            cv2.rectangle(frame, (car_x, car_y), (car_x + car_width, car_y + car_height), (0, 0, 200), -1) # Red car
            
            # Draw windshield
            cv2.rectangle(frame, (car_x + 20, car_y + 20), (car_x + car_width - 20, car_y + 60), (0, 0, 0), -1)
            
            # Draw license plate (white background, black text)
            plate_w, plate_h = 140, 40
            plate_x = car_x + (car_width - plate_w) // 2
            plate_y = car_y + car_height - plate_h - 10
            
            cv2.rectangle(frame, (plate_x, plate_y), (plate_x + plate_w, plate_y + plate_h), (255, 255, 255), -1)
            cv2.rectangle(frame, (plate_x, plate_y), (plate_x + plate_w, plate_y + plate_h), (0, 0, 0), 2)
            
            # Text on license plate
            text = "GJ01AB1234"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.8
            thickness = 2
            text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
            
            text_x = plate_x + (plate_w - text_size[0]) // 2
            text_y = plate_y + (plate_h + text_size[1]) // 2 - 2
            
            cv2.putText(frame, text, (text_x, text_y), font, font_scale, (0, 0, 0), thickness)
            
        out.write(frame)
        
    out.release()
    print(f"Test video created at: {output_path}")

if __name__ == "__main__":
    create_test_video()
