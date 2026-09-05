import os
import sys
import threading
import time
import urllib.request
import webview
import uvicorn

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

from backend.app.main import app

PORT = 8802

def start_backend():
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="error")

def run_app():
    server_thread = threading.Thread(target=start_backend, daemon=True)
    server_thread.start()
    
    for _ in range(25):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/health", timeout=1) as resp:
                if resp.status == 200:
                    break
        except Exception:
            time.sleep(0.1)

    window = webview.create_window(
        title='CyberSec & OSINT Studio Cockpit (pywebview)',
        url=f'http://127.0.0.1:{PORT}',
        width=1320,
        height=880,
        min_size=(1000, 650),
        background_color='#030712'
    )
    webview.start(debug=False)

if __name__ == '__main__':
    run_app()
