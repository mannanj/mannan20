#!/usr/bin/env python3
import os
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

import sys
import json
import numpy as np
import soundfile as sf
from kokoro import KPipeline

SAMPLE_RATE = 24000
VOICE = "am_adam"
SPEED = 1.0
NUM_CHUNKS = 1
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public/data/audio/new-rich")

PARAGRAPHS = [
    "Prevent work for work\u2019s sake, and to do the minimum necessary for maximum effect. Minimum effective load.",

    "Distribute recovery periods and adventures, mini-retirements, throughout life on a regular basis and recognize that inactivity is not the goal. Doing that which excites you is.",

    "Do all the things you want to do, and be all the things you want to be. If this includes some tools and gadgets, so be it, but they are either means to an end or bonuses, not the focus.",

    "Be neither the boss nor the employee, but the owner. To own the trains and have someone else ensure they run on time.",

    "Make a ton of money with specific reasons and defined dreams to chase, timelines and steps included. What are you working for?",

    "Have more quality and less clutter. To have huge financial reserves but recognize that most material wants are justifications for spending time on the things that don\u2019t really matter, including buying things and preparing to buy things. You spent two weeks negotiating your new Infiniti with the dealership and got $10,000 off? That\u2019s great. Does your life have a purpose? Are you contributing anything useful to this world, or just shuffling papers, banging on a keyboard, and coming home to a drunken existence on the weekends?",

    "Have freedom from doing that which you dislike, but also the freedom and resolve to pursue your dreams without reverting to work for work\u2019s sake. After years of repetitive work, you will often need to dig hard to find your passions, redefine your dreams, and revive hobbies that you let atrophy to near extinction. The goal is not to simply eliminate the bad, which does nothing more than leave you with a vacuum, but to pursue and experience the best in the world.",
]


def split_into_chunks(paragraphs, n):
    total_chars = sum(len(p) for p in paragraphs)
    target = total_chars / n
    chunks = []
    current = []
    current_len = 0
    for p in paragraphs:
        current.append(p)
        current_len += len(p)
        if current_len >= target and len(chunks) < n - 1:
            chunks.append(current)
            current = []
            current_len = 0
    if current:
        chunks.append(current)
    return chunks


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    chunks = split_into_chunks(PARAGRAPHS, NUM_CHUNKS)

    print(f"Split into {len(chunks)} chunks:", flush=True)
    for i, c in enumerate(chunks):
        chars = sum(len(p) for p in c)
        print(f"  chunk {i+1}: {len(c)} paragraphs, {chars} chars", flush=True)

    pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")

    for i, chunk_paragraphs in enumerate(chunks):
        chunk_num = i + 1
        text = "\n\n".join(chunk_paragraphs)
        print(f"\nGenerating chunk {chunk_num}/{len(chunks)}...", flush=True)

        audio_chunks = []
        for result in pipeline(text, voice=VOICE, speed=SPEED):
            if result.audio is not None:
                a = result.audio.numpy() if hasattr(result.audio, "numpy") else np.array(result.audio)
                audio_chunks.append(a)

        if not audio_chunks:
            print(f"  ERROR: no audio for chunk {chunk_num}", flush=True)
            continue

        full = np.concatenate(audio_chunks)
        duration = len(full) / SAMPLE_RATE
        path = os.path.join(OUT_DIR, f"chunk-{chunk_num}.wav")
        sf.write(path, full, SAMPLE_RATE)
        size_mb = os.path.getsize(path) / (1024 * 1024)
        print(f"  chunk {chunk_num}: {duration:.1f}s, {size_mb:.1f}MB -> {path}", flush=True)

    print("\nALL TTS DONE", flush=True)


if __name__ == "__main__":
    main()
