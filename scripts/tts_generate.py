#!/usr/bin/env python3
import os
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

import sys
import json
import numpy as np
import soundfile as sf
from kokoro import KPipeline

SAMPLE_RATE = 24000
VOICE = "af_heart"
SPEED = 1.0

def generate(text: str, output_path: str):
    pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    chunks = []
    for result in pipeline(text, voice=VOICE, speed=SPEED):
        if result.audio is not None:
            audio = result.audio.numpy() if hasattr(result.audio, 'numpy') else np.array(result.audio)
            chunks.append(audio)

    if not chunks:
        print(json.dumps({"error": "No audio generated"}))
        sys.exit(1)

    full_audio = np.concatenate(chunks)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    sf.write(output_path, full_audio, SAMPLE_RATE)
    print(json.dumps({"audio_path": output_path, "duration": round(len(full_audio) / SAMPLE_RATE, 3)}))

if __name__ == "__main__":
    text = sys.argv[1]
    output_path = sys.argv[2]
    generate(text, output_path)
