# Consuming the Sentinel Camera Grid — Integrator's Guide
**Gujarat Police Innovation Challenge 2026**

## 1. What You Are Connecting To
Every camera is published as a live RTP/RTSP stream. One second of video takes one second to arrive, frames carry monotonic presentation timestamps (PTS), and there is no seeking, no byte-range fetching, and no way to run ahead of real time. Treat each endpoint as you would a physical camera on an operational network.

### Protocol Endpoints:
- **RTSP:** `rtsp://<host>:8554/stream/<id>` — Intended for AI inference (OpenCV, GStreamer, FFmpeg, DeepStream)
- **WebRTC (WHEP):** `http://<host>:8889/stream/<id>/whep` — Intended for low-latency browser preview
- **HLS:** `http://<host>/live/stream/<id>/index.m3u8` — Intended for Dashboards, mobile, restricted networks

### Camera Catalogue API:
Always start from the catalogue rather than hard-coding endpoints:
`curl -s http://<host>/api/ingest`
It returns every camera with its ID, location, codec, live status, stream properties, and all three URLs. Camera IDs and the set of available cameras can change; the catalogue is the contract, the URL pattern is not.

---

## 2. Connecting
### OpenCV (Python) Integration Pattern:
```python
import os
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
import cv2

cap = cv2.VideoCapture("rtsp://<host>:8554/stream/1", cv2.CAP_FFMPEG)
while True:
    ok, frame = cap.read()
    if not ok:
        break # reconnect — see §3
    pts_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
```

---

## 3. Key Rules & Operational Behaviors (Do's and Don'ts)
- **DO — Force RTSP over TCP:** UDP fails across NAT/firewalls. Set `rtsp_transport=tcp` in every client.
- **DON'T — Trust reported frame rate (`CAP_PROP_FPS`):** OpenCV's `CAP_PROP_FPS` often does not match actual delivery rate. Measure real rate or use presentation timestamps (PTS).
- **DO — Drive timing from PTS, never arrival time:** Use `CAP_PROP_POS_MSEC` or RTP timestamps. The gateway replays buffered GOP on connection, causing the first ~1-2s of frames to arrive faster than real-time.
- **DON'T — Assume constant frame rate:** Tolerating inter-frame gaps without treating them as disconnects is mandatory.
- **DO — Reconnect automatically with exponential backoff:** Start at ~2s, cap at ~30s.
- **DON'T — Expect offline video files or downloads:** Evaluation will test live streaming directly over RTSP/WebRTC/HLS protocols. Live streams loop with abrupt cuts at loop points.
- **DON'T — Publish to gateway:** Gateway is read-only / consume-only.
- **DO — Pace your load:** Open only cameras actively being processed.

---

## 4. Evaluation Testing Conditions (VAHAN, ANPR & Face Recognition)
1. **Live Camera Feed Testing:** Evaluators inject test video streams into the RTSP gateway (`rtsp://<host>:8554/stream/<id>`).
2. **Real-Time Detection & Recognition:** The platform must ingest the stream, process incoming frames, and detect:
   - **ANPR (Vehicle Number Plates):** Real-time recognition of standard and non-standard Indian HSRP plates.
   - **VAHAN Verification:** Auto-lookup of detected plates against the VAHAN vehicle registry to match make, model, color, fuel type, owner name, and RTO registration.
   - **Face Recognition:** Real-time facial extraction & matching against criminal/suspect watchlists (AFIS / NAFIS / eGujCop).
3. **No File Downloads:** Everything runs in live streaming mode; the AI pipeline must handle real-time frame rates and PTS timestamps dynamically.
