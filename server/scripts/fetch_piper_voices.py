"""Download Piper ONNX voice models into the image at build time.

Each voice is a directory on Hugging Face under rhasspy/piper-voices with the
voice .onnx model plus its .onnx.json config. Voices are listed in PIPER_VOICES
as a comma-separated list of names (e.g. en_US-amy-medium).
"""
import os
import sys
import urllib.request
from pathlib import Path

REPO = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US"
names = [v.strip() for v in os.environ.get("PIPER_VOICES", "").split(",") if v.strip()]
dest = Path(os.environ.get("PIPER_VOICES_DIR", "/app/piper-voices"))
dest.mkdir(parents=True, exist_ok=True)

if not names:
    print("PIPER_VOICES not set; skipping voice download.")
    sys.exit(0)

for name in names:
    target = dest / name
    target.mkdir(parents=True, exist_ok=True)
    for suffix in (".onnx", ".onnx.json"):
        url = f"{REPO}/{name}/{name}{suffix}"
        out = target / f"{name}{suffix}"
        if out.exists() and out.stat().st_size > 0:
            print(f"cached {out}")
            continue
        try:
            urllib.request.urlretrieve(url, out)
            print(f"downloaded {out}")
        except Exception as exc:  # noqa: BLE001
            print(f"WARN could not fetch {url}: {exc}", file=sys.stderr)
