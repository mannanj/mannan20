#!/usr/bin/env python3
"""
TTS for the Affiliate Leads Redesign article.

Reads src/content/affiliate-leads-redesign.md, strips non-prose
(code fences, tables, ASCII boxes, link URLs), and emits 3 chunked WAVs
to public/data/audio/affiliate-leads/ via Kokoro TTS.

Run via:  uv run --with kokoro --with soundfile --with numpy \
            scripts/generate_affiliate_leads.py
"""
import os
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

import re
import numpy as np
import soundfile as sf
from kokoro import KPipeline

SAMPLE_RATE = 24000
VOICE = "am_adam"
SPEED = 1.0
NUM_CHUNKS = 3

ROOT = os.path.dirname(os.path.dirname(__file__))
SRC = os.path.join(ROOT, "src/content/affiliate-leads-redesign.md")
OUT_DIR = os.path.join(ROOT, "public/data/audio/affiliate-leads")


def strip_markdown_for_tts(md: str) -> list[str]:
    lines = md.splitlines()
    out_paragraphs: list[str] = []
    buf: list[str] = []

    in_fence = False
    in_box = False

    def flush():
        if not buf:
            return
        text = " ".join(s.strip() for s in buf if s.strip())
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            out_paragraphs.append(text)
        buf.clear()

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Skip front-matter-ish blockquoted metadata block at top
        # (Status / Owner / Created lines starting with > )
        # Code fences ```...```
        if stripped.startswith("```") or stripped.startswith("~~~"):
            flush()
            in_fence = not in_fence
            i += 1
            continue
        if in_fence:
            i += 1
            continue

        # ASCII box drawings
        if any(ch in stripped for ch in ["┌", "└", "├", "│", "┘", "┐", "─"]):
            flush()
            in_box = True
            i += 1
            continue
        if in_box:
            # Boxes end at a blank line followed by non-box content
            if stripped == "":
                in_box = False
            i += 1
            continue

        # Markdown tables (rows starting with |)
        if stripped.startswith("|"):
            flush()
            i += 1
            continue

        # Horizontal rules
        if re.match(r"^-{3,}$|^_{3,}$|^\*{3,}$", stripped):
            flush()
            i += 1
            continue

        # Heading
        m = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if m:
            flush()
            heading = clean_inline(m.group(2))
            heading = re.sub(r"^\d+(\.\d+)*\.?\s*", "", heading)
            heading = heading.rstrip(":.")
            if heading:
                out_paragraphs.append(heading + ".")
            i += 1
            continue

        # Blockquote — skip metadata-style blockquotes near top, otherwise treat as prose
        if stripped.startswith(">"):
            content = stripped.lstrip("> ").strip()
            if re.match(r"^\*\*(Status|Owner|Predecessors|Created)\*\*", content):
                i += 1
                continue
            buf.append(clean_inline(content))
            i += 1
            continue

        # List items: keep text but drop bullet glyphs
        bullet = re.match(r"^\s*[-*+]\s+(.*)$", line)
        if bullet:
            text = clean_inline(bullet.group(1))
            if text:
                out_paragraphs.append(text + ".")
            i += 1
            continue
        ordered = re.match(r"^\s*\d+\.\s+(.*)$", line)
        if ordered:
            text = clean_inline(ordered.group(1))
            if text:
                out_paragraphs.append(text + ".")
            i += 1
            continue

        # Blank line — flush current paragraph
        if stripped == "":
            flush()
            i += 1
            continue

        # Default: prose
        buf.append(clean_inline(stripped))
        i += 1

    flush()
    return [p for p in out_paragraphs if p]


def clean_inline(text: str) -> str:
    # [label](url) -> label
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    # Bare URLs
    text = re.sub(r"https?://\S+", "", text)
    # Inline code
    text = re.sub(r"`([^`]+)`", r"\1", text)
    # Bold/italic markers
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"_([^_]+)_", r"\1", text)
    # HTML-escaped chars common in md
    text = text.replace("&ldquo;", '"').replace("&rdquo;", '"')
    text = text.replace("&hellip;", "…")
    text = text.replace("&mdash;", "—").replace("&ndash;", "–")
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def split_into_chunks(paragraphs: list[str], n: int) -> list[list[str]]:
    total = sum(len(p) for p in paragraphs)
    target = total / n
    chunks: list[list[str]] = []
    current: list[str] = []
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


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(SRC, "r", encoding="utf-8") as f:
        md = f.read()

    paragraphs = strip_markdown_for_tts(md)
    print(f"Extracted {len(paragraphs)} prose paragraphs", flush=True)
    total_chars = sum(len(p) for p in paragraphs)
    print(f"Total chars: {total_chars}", flush=True)

    chunks = split_into_chunks(paragraphs, NUM_CHUNKS)
    for i, c in enumerate(chunks):
        chars = sum(len(p) for p in c)
        print(f"  chunk {i + 1}: {len(c)} paragraphs, {chars} chars", flush=True)

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
