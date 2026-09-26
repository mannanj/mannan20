#!/usr/bin/env python3
"""Scrub Claude Code session transcripts for publication.

Removes what identifies the machine and the author, and drops embedded base64
images (they are most of the file size and none of the record). Everything else
is left as it was written.

    python3 scrub-transcripts.py OUT_DIR SESSION.jsonl [SESSION.jsonl ...]
"""
import json
import re
import sys
from pathlib import Path

TEXT_SUBS = [
    ("/Users/manblack", "~"),
    ("-Users-manblack-", "-Users-user-"),
    ("manblack", "user"),
    ("mannanjavid@protonmail.com", "[email removed]"),
    ("hello@mannan.is", "[email removed]"),
    ("Hello@mannan.is", "[email removed]"),
]

IMAGE_PLACEHOLDER = "[image removed for publication]"


def strip_blobs(node):
    """Drop base64 payloads in place. Returns (images, signatures) dropped.

    Thinking-block signatures are multi-kilobyte opaque strings that carry
    nothing a reader can use, and they dominate the file size once the images
    are gone.
    """
    images = signatures = 0
    if isinstance(node, dict):
        src = node.get("source")
        if node.get("type") == "image" and isinstance(src, dict) and "data" in src:
            src["data"] = IMAGE_PLACEHOLDER
            images += 1
        if node.get("type") == "thinking" and node.get("signature"):
            node["signature"] = ""
            signatures += 1
        for value in node.values():
            i, s = strip_blobs(value)
            images += i
            signatures += s
    elif isinstance(node, list):
        for value in node:
            i, s = strip_blobs(value)
            images += i
            signatures += s
    return images, signatures


def scrub(src: Path, out: Path) -> dict:
    stats = {"lines": 0, "images": 0, "signatures": 0, "bad": 0}
    with src.open() as fh, out.open("w") as wfh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            stats["lines"] += 1
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                stats["bad"] += 1
                continue
            images, signatures = strip_blobs(record)
            stats["images"] += images
            stats["signatures"] += signatures
            text = json.dumps(record, ensure_ascii=False)
            for needle, repl in TEXT_SUBS:
                text = text.replace(needle, repl)
            json.loads(text)  # the substitutions must not have broken the JSON
            wfh.write(text + "\n")
    return stats


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__.strip())
        return 2
    out_dir = Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    for arg in sys.argv[2:]:
        src = Path(arg).expanduser()
        out = out_dir / src.name
        stats = scrub(src, out)
        size = out.stat().st_size / 1_000_000
        print(
            f"{out.name}: {stats['lines']} lines, {stats['images']} images and "
            f"{stats['signatures']} signatures removed, {size:.1f}MB"
            + (f", {stats['bad']} unparseable lines skipped" if stats["bad"] else "")
        )
    leftovers = []
    for path in sorted(out_dir.glob("*.jsonl")):
        body = path.read_text()
        for needle, _ in TEXT_SUBS:
            if needle in body:
                leftovers.append(f"{path.name}: {needle}")
    if leftovers:
        print("FAILED, residue found:", *leftovers, sep="\n  ")
        return 1
    print("clean")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
