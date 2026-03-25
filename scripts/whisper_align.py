#!/usr/bin/env python3
import sys
import json
import mlx_whisper

MODEL = "mlx-community/whisper-small-mlx"

def align(audio_path: str):
    result = mlx_whisper.transcribe(
        audio_path,
        path_or_hf_repo=MODEL,
        language="en",
        word_timestamps=True,
    )

    words = []
    for segment in result.get("segments", []):
        for w in segment.get("words", []):
            words.append({
                "word": w.get("word", "").strip(),
                "start": round(w.get("start", 0.0), 3),
                "end": round(w.get("end", 0.0), 3),
            })

    duration = words[-1]["end"] if words else 0.0
    print(json.dumps({
        "words": words,
        "duration": round(duration, 3),
        "text": result.get("text", "").strip(),
    }))

if __name__ == "__main__":
    align(sys.argv[1])
