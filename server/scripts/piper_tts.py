"""Piper TTS - lightweight ONNX neural voices, no PyTorch required.

Usage: piper_tts.py <text> <voice> <output.wav>
`voice` is a Piper voice name (e.g. en_US-amy-medium), resolved against
PIPER_VOICES_DIR. Falls back across known Piper API shapes so the script keeps
working across piper-tts releases.
"""
import argparse
import os
import sys
import wave
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("text")
parser.add_argument("voice")
parser.add_argument("output")
args = parser.parse_args()

voices_dir = Path(os.environ.get("PIPER_VOICES_DIR", "./piper-voices"))
model = voices_dir / args.voice / args.voice.onnx
config = voices_dir / args.voice / args.voice.onnx.json

if not model.exists():
    sys.exit(
        f"Piper voice '{args.voice}' is not installed. Expected model at {model}. "
        "Download the voice folder into PIPER_VOICES_DIR on the backend."
    )

import numpy as np  # noqa: E402
from piper.voice import PiperVoice  # noqa: E402

voice = PiperVoice.load(str(model), config_path=str(config))

samples = None
sample_rate = 22050

# piper-tts >= 1.3 exposes synthesize_wav(); older builds expose synthesize().
if hasattr(voice, "synthesize_wav"):
    with wave.open(args.output, "wb") as wav_file:
        voice.synthesize_wav(args.text, wav_file)
else:
    chunks = []
    for chunk in voice.synthesize(args.text):
        chunks.append(chunk)
        sample_rate = getattr(chunk, "sample_rate", sample_rate) or sample_rate
    audio = np.concatenate(chunks) if len(chunks) > 1 else chunks[0].audio
    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(args.output, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm.tobytes())

print(args.output)
