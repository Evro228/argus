#!/usr/bin/env python3
import os
import subprocess
from PIL import Image

MASTER_ICON_PATH = "/Users/slava/Antigravity/argus/build/icon_master.png"
ICONSET_DIR = "/Users/slava/Antigravity/argus/build/icon.iconset"
ICNS_PATH = "/Users/slava/Antigravity/argus/build/icon.icns"
PNG_PATH = "/Users/slava/Antigravity/argus/build/icon.png"
FRONTEND_PNG_PATH = "/Users/slava/Antigravity/argus/frontend/icon.png"

os.makedirs(ICONSET_DIR, exist_ok=True)

master = Image.open(MASTER_ICON_PATH).convert("RGBA")
master.save(PNG_PATH, "PNG")
master.save(FRONTEND_PNG_PATH, "PNG")

# List of required Apple iconset sizes: (filename, pixel_dimension)
ICON_SIZES = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512),
    ("icon_512x512@2x.png", 1024)
]

for filename, size in ICON_SIZES:
    target_path = os.path.join(ICONSET_DIR, filename)
    resized = master.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(target_path, "PNG")
    print(f"Generated {filename} ({size}x{size})")

# Run iconutil to create .icns
cmd = ["iconutil", "-c", "icns", ICONSET_DIR, "-o", ICNS_PATH]
print(f"Running: {' '.join(cmd)}")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode == 0:
    print(f"Successfully generated Apple ICNS icon: {ICNS_PATH}")
else:
    print(f"iconutil failed: {res.stderr}")
    exit(1)
