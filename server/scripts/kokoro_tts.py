import argparse
from pathlib import Path
import soundfile as sf
from kokoro import KPipeline

parser = argparse.ArgumentParser()
parser.add_argument('text')
parser.add_argument('voice')
parser.add_argument('output')
args = parser.parse_args()
pipeline = KPipeline(lang_code='a')
chunks = list(pipeline(args.text, voice=args.voice, speed=1))
# KPipeline returns torch tensors; convert through its audio chunks to a numpy array.
import numpy as np
audio = np.concatenate([np.asarray(chunk, dtype='float32').reshape(-1) for _, _, chunk in chunks])
sf.write(args.output, audio, 24000)
