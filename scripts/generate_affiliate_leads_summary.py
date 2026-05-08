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
This is an unofficial summary of the Affiliate System v3 proposal.

The short version. We were about to deploy a multi-affiliate redesign called v2,
which uses three tables — conversions, conversion affiliates, and conversion
affiliate visits — to track who gets credit for what. After looking at it more
carefully, that schema is correct in the abstract but wrong for our actual
operation. Hans reviews every payout by hand on a coaching site. He doesn't
think in submissions. He thinks in Sally's people.

The proposal, called v3, replaces the three v2 tables with two. The spine
becomes a new table called affiliate leads — one row per affiliate, per person.
That row is created the first time someone clicks a ref-tagged link, and it
accumulates identity, page history, and credit-share information over time.
A second table, called lead conversions, is a slim junction that records the
actual subscribe, contact, or application events when they happen.

Why this is better. Three reasons.

First, it matches Hans's mental model. The unit of review is now "Sally's claim
on this person," not "this affiliate's row of this conversion's claim table."

Second, it survives non-conversion. Today, a referrer can drive fifty visits
in a month and have nothing to show for it if no one converts within thirty
days, because the visits get pruned. Under v3, the lead row persists, so an
affiliate building an audience over time has visible activity even before
the first sale.

Third, it's smaller. Two tables instead of three, with no functional loss.
The audit data that lived in conversion affiliate visits moves into a JSON
field on the lead row, and the prune query gets rewritten to anchor against
that JSON.

The model maps to industry conventions. Rewardful and similar platforms organize
around a Visitor, Lead, Conversion trinity. v3 names the lead explicitly
instead of treating it as a pre-conversion afterthought.

A few quieter wins. There's now a place to do a self-referral check — if the
submission email matches an affiliate's own email, flag it and zero out the
credit share. There's also a clear hook for GDPR consent gating: if we ever
get meaningful EU traffic, we can downgrade fingerprint capture without an
explicit opt-in, and let the lead row still exist with reduced confidence.
And the schema is forward-compatible with Stripe — when the four-to-six
thousand dollar checkout goes live, a Stripe webhook becomes another row in
lead conversions with a new kind value.

The trade-offs, honestly. Asking "how many actual sales did we make" now
requires a SELECT DISTINCT across lead conversions, because two affiliates
who both touched the same buyer each get a row pointing at the same
submission. That's documented in a small SQL view. The visit-by-visit audit
trail moves from a dedicated junction table into evidence JSON, which is a
loss in queryability but a win in storage simplicity.

What needs to happen next. Phase A is the schema migration — drop the v1 and
v2 tables, create affiliate leads and lead conversions, rewrite the prune
function. Phase B is the capture path — about fifteen lines added to the
track-visit edge function to upsert the lead row. Phase C is the conversion
path — generate-candidates writes lead rows and conversion rows, with the
self-referral check inline. Phase D is the admin endpoints. Phase E is the
admin UI rename, from the existing AttributionsManager component to a new
AffiliateLeadsManager. Total scope is about one focused session plus a
Lovable handoff for migrations and types.

There are also two small cleanups discovered along the way. There are
duplicate v2 migration files in the repo — one human-authored, one Lovable
hash-named — that need to be reconciled before any further migrations land.
And the register-attribution endpoint currently does a five-minute
email-based lookup to find the matching submission, which is brittle. v3
doesn't fix that directly, but it's flagged as a follow-up.

The bottom line. v3 is more opinionated than v2. It bakes in the assumption
that this system serves one customer with one product line and a manual
review process. That's the right move for our volume profile, and it leaves
us with cleaner ergonomics for the workflow Hans actually runs every week.

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
