import requests

url = "http://localhost:8000/upload_video"
file_path = "/Users/parthlodaya/sentinel/test_traffic.mp4"

with open(file_path, "rb") as f:
    files = {"file": f}
    response = requests.post(url, files=files)

print(response.json())
