#!/usr/bin/env python
import argparse
from pathlib import Path
from PIL import Image
from rembg import remove, new_session

p=argparse.ArgumentParser(); p.add_argument('source'); p.add_argument('output'); p.add_argument('--model',default='u2net')
a=p.parse_args()
image=Image.open(a.source).convert('RGBA')
cut=remove(image, session=new_session(a.model))
cut.save(a.output)
print(Path(a.output).resolve())
