#!/usr/bin/env python3
import os
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

import argparse
import re
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline


SAMPLE_RATE = 24000
VOICE = "am_adam"
SPEED = 1.0


def markdown_to_speech_text(markdown: str) -> str:
    text = markdown.replace("\r\n", "\n")
    text = re.sub(r"```[\s\S]*?```", "\nCode example omitted in audio.\n", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^\s{0,3}#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*>\s?", "", text, flags=re.MULTILINE)
    text = text.replace("|", ". ")
    text = text.replace("---", " ")
    text = text.replace("=>", " results in ")
    text = text.replace("->", " to ")
    text = text.replace("≥", " greater than or equal to ")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def split_into_chunks(paragraphs: list[str], n: int) -> list[list[str]]:
    total_chars = sum(len(p) for p in paragraphs)
    target = max(1, total_chars / n)
    chunks: list[list[str]] = []
    current: list[str] = []
    current_len = 0

    for paragraph in paragraphs:
        current.append(paragraph)
        current_len += len(paragraph)
        if current_len >= target and len(chunks) < n - 1:
            chunks.append(current)
            current = []
            current_len = 0

    if current:
        chunks.append(current)

    return chunks


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate chunked Kokoro audio for a Markdown reading.")
    parser.add_argument("markdown_path")
    parser.add_argument("slug")
    parser.add_argument("--chunks", type=int, default=3)
    parser.add_argument("--voice", default=VOICE)
    parser.add_argument("--speed", type=float, default=SPEED)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    source = Path(args.markdown_path)
    if not source.is_absolute():
        source = root / source

    out_dir = root / "public" / "data" / "audio" / args.slug
    out_dir.mkdir(parents=True, exist_ok=True)

    speech_text = markdown_to_speech_text(source.read_text())
    paragraphs = [p.strip() for p in speech_text.split("\n\n") if p.strip()]
    chunks = split_into_chunks(paragraphs, args.chunks)

    print(f"Split {source} into {len(chunks)} chunks:", flush=True)
    for i, chunk in enumerate(chunks):
        print(f"  chunk {i + 1}: {len(chunk)} blocks, {sum(len(p) for p in chunk)} chars", flush=True)

    pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")

    for i, chunk_paragraphs in enumerate(chunks):
        chunk_num = i + 1
        text = "\n\n".join(chunk_paragraphs)
        print(f"\nGenerating chunk {chunk_num}/{len(chunks)}...", flush=True)

        audio_chunks = []
        for result in pipeline(text, voice=args.voice, speed=args.speed):
            if result.audio is not None:
                audio = result.audio.numpy() if hasattr(result.audio, "numpy") else np.array(result.audio)
                audio_chunks.append(audio)

        if not audio_chunks:
            raise RuntimeError(f"No audio generated for chunk {chunk_num}")

        full = np.concatenate(audio_chunks)
        duration = len(full) / SAMPLE_RATE
        path = out_dir / f"chunk-{chunk_num}.wav"
        sf.write(path, full, SAMPLE_RATE)
        size_mb = path.stat().st_size / (1024 * 1024)
        print(f"  chunk {chunk_num}: {duration:.1f}s, {size_mb:.1f}MB -> {path}", flush=True)

    print("\nALL TTS DONE", flush=True)


if __name__ == "__main__":
    main()
