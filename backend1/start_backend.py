import subprocess
import time
import sys

def main():
    while True:
        print("[SUPERVISOR] Starting Uvicorn Sentinel Backend on port 8000...")
        try:
            proc = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
            )
            proc.wait()
            print(f"[SUPERVISOR] Backend exited with code {proc.returncode}. Auto-restarting in 2s...")
        except KeyboardInterrupt:
            print("[SUPERVISOR] Received stop signal.")
            break
        except Exception as e:
            print(f"[SUPERVISOR] Exception: {e}. Auto-restarting in 2s...")
        time.sleep(2)

if __name__ == "__main__":
    main()
