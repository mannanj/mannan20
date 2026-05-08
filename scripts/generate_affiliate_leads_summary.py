#!/usr/bin/env python3
"""
Part 4 — Summary chunk for the Affiliate Leads Redesign article.

Generates a single chunk-4.wav from a hand-written summary that distills
the v3 proposal into a readable narration.

Run via:  uv run --with kokoro --with soundfile --with numpy \
            scripts/generate_affiliate_leads_summary.py
"""
import os
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

import numpy as np
import soundfile as sf
from kokoro import KPipeline

SAMPLE_RATE = 24000
VOICE = "am_adam"
SPEED = 1.0

ROOT = os.path.dirname(os.path.dirname(__file__))
OUT_DIR = os.path.join(ROOT, "public/data/audio/affiliate-leads")

SUMMARY = """
This is a summary of the Affiliate Attribution Reset.

The short version. We redesigned the same affiliate attribution system three
times and ended up shipping less code than we started with. v1 was a working
candidates table with a debug-y admin UI. v2 was a multi-affiliate redesign,
correct on paper, that introduced three tables and four review states for a
problem we did not have. v3 was a leads-first proposal that went further still,
with durable pre-conversion identity rows and a cold-lead bucket. v3 was never
built. The reset throws v3 out, collapses v2's three tables back to one, and
ships a clean dashboard over the scoring engine that already worked.

Hans is a relationship coach. He onboards roughly twenty affiliates by hand and
reviews each conversion personally. One conversion, one affiliate. He does not
need split credit, position fields, or pre-conversion lead funnels. He needs to
know who sent this person, and to confirm it in five seconds.

What ships. One table called conversion attributions, with a one-to-one primary
key on conversion id. Affiliate id is nullable for untagged conversions —
referral codes that appear in the URL but do not match any registered affiliate.
The table carries the source — system suggested, manual, or none — a zero to
one hundred confidence score, an evidence JSON blob, and a two-state lifecycle:
needs attention, then confirmed. v2's four states collapse to two. v2's per-row
review notes move to a single admin notes field on the conversion itself.

Bots are marked, not dropped. The visits table gains an is bot column and a bot
reason column. The track visit edge function flags suspected bots at ingest
using a user-agent regex; lookup filters them at read time. A revised regex
never retroactively flips historic rows.

Retention is one rule, not two. The original plan had a daily thirty-day prune
and a monthly verified-backup clear. The daily prune never shipped. The monthly
clear is now the only retention rule. On the first of each month, backup
database snapshots visits to R2 and verifies. On day two, a four-attempt cron
runs DELETE FROM visits WHERE created at is less than or equal to the last
verified backup's completed at timestamp. Exactly the rows the backup captured.
A new prune R2 archives cron keeps the newest twelve monthly archives. Twelve
months rolling. Not ninety days. Not forever.

The dashboard has two views. Time-ordered list, and affiliate-grouped. Same
conversions, two lenses. Each conversion expands to show its visitation log,
notes, and an override picker. Each conversion has a refresh icon that re-runs
the lookup incrementally — only visits newer than the last lookup watermark —
and appends new matches to existing evidence. The dashboard never re-scores in
bulk on load. Untagged ref codes are hidden by default behind an eye-icon
toggle next to the date range; when shown, they group by ref code with a hint
that they might be typos or missing affiliates.

Confidence is shown honestly. The scorer in shared attribution dot ts weighs
five signals: browser id, FingerprintJS, Thumbmark, IP slash twenty-four
subnet, and same-session presence. The weights sum to one hundred and thirty,
hard-capped at one hundred — overlap between signals is real, and capping is
more honest than re-normalizing. Each conversion shows a zero to one hundred
donut broken down by mechanism, with plain-English copy on hover and a
disclaimer footer: this is a confidence detector, not proof.

What got cut. Multi-affiliate per conversion. Position fields and credit share
splits. Leads-first schema with cold-lead buckets and funnel widgets. Auto-
correcting referral-code typos. Auto-mapping unregistered codes. Cloudflare
Worker first-party IP detection. Stripe-driven payouts. The daily prune cron.
None of these are coming back without a new reason.

What I learned. Normalization isn't free. v2's multi-affiliate schema was
textbook-correct for a problem we did not have. Doc-first redesigns drift —
v3 lived in markdown for a week before I noticed I was solving problems v2
had created, not problems Hans had. Retention rules compound — three rules
that interact became one rule that doesn't. And confidence is a UX problem,
not a math problem. The scorer was already good. What was missing was a way
to show why it was confident.

The bottom line. The right answer for a one-operator system is the smallest
one that lets the operator stop thinking about it. Less code, less schema,
less ceremony. The system Hans is running today should still be running a
year from now, untouched.

End of summary.
""".strip()


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"Summary length: {len(SUMMARY)} chars", flush=True)

    pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")

    audio_chunks = []
    for result in pipeline(SUMMARY, voice=VOICE, speed=SPEED):
        if result.audio is not None:
            a = result.audio.numpy() if hasattr(result.audio, "numpy") else np.array(result.audio)
            audio_chunks.append(a)

    if not audio_chunks:
        raise SystemExit("ERROR: no audio generated")

    full = np.concatenate(audio_chunks)
    duration = len(full) / SAMPLE_RATE
    path = os.path.join(OUT_DIR, "chunk-4.wav")
    sf.write(path, full, SAMPLE_RATE)
    size_mb = os.path.getsize(path) / (1024 * 1024)
    print(f"chunk 4: {duration:.1f}s, {size_mb:.1f}MB -> {path}", flush=True)


if __name__ == "__main__":
    main()
