# Affiliate Attribution, Reset

> A three-iteration redesign that ended in less code, not more. The shipped system is one table, two views, one retention rule, and a confidence score Hans actually trusts.

## The job

Hans is a relationship coach. He onboards about twenty affiliates by hand — podcasters who interview him, friends with audiences, fellow coaches. They send people to his site. When someone applies, subscribes, or fills the contact form, that's a **conversion**, and Hans wants to know who sent them. One conversion, one affiliate. He reviews each one personally; the system's job is to put the right answer in front of him fast enough that confirming it takes five seconds.

## Three rounds before getting it right

**v1** shipped: an `attribution_candidates` table and the original admin UI. Functional, but the admin surface was a debug view in disguise.

**v2** went live underneath: a multi-affiliate redesign with three tables — `conversions`, `conversion_affiliates`, `conversion_affiliate_visits` — supporting `position` (`only`/`first`/`mid`/`last`) and `credit_share` per affiliate. Correct normalization for an abstract many-to-many. Wrong shape for our actual workflow.

**v3** went further: a leads-first model with `affiliate_leads`, `lead_conversions`, a cold-lead bucket, a per-affiliate funnel widget. The proposal still lives in the repo. It was never built.

Each step was reasonable in isolation. Stacked, they described a system far richer than the operator. The reset collapses everything back to one row per conversion, drops v3 entirely, and ships a clean dashboard over the scoring engine that already worked.

## What's actually shipping

```
[Visitor] ──► [track-visit] ──► [visits, accumulating in Supabase]
                                          │
                                          ▼ monthly cron (1st @ 03:30 UTC)
                                [backup-database → R2 + HEAD-verify]
                                          │
                                          ▼ day-2, four-attempt gate
                            [prune_visits_if_backed_up()
                             DELETE WHERE created_at <= last_backup.completed_at]

[Form submit] ──► [capture-conversion] ──► [conversions row]
                                │
                                ▼
                  [lookup-attribution-candidates]
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
       [Supabase since clear]           [R2 last 90d, deduped]
                └───────────────┬───────────────┘
                                ▼
                     [_shared/attribution.ts scorer]
                                ▼
                   [conversion_attributions — 1:1]
                                ▼
                  [/admin/affiliates dashboard]
```

### One table replaces two

The new spine is `conversion_attributions`. One row per conversion. Primary key is `conversion_id`; `affiliate_id` is nullable for **untagged** conversions (a `?ref=` code that doesn't match any registered affiliate).

| Column | Purpose |
|---|---|
| `conversion_id` PK | One-to-one with `conversions`. |
| `affiliate_id` | NULL when untagged. |
| `ref_code` | Snapshot of the URL ref code, regardless of registration. |
| `source` | `system_suggested` / `manual` / `none`. |
| `confidence_score` | 0–100, from the existing scorer. |
| `evidence` JSONB | Per-signal breakdown plus snapshotted matched-visit rows so the visitation log survives the monthly clear. |
| `state` | `needs_attention` (default) → `confirmed`. Two states. v2 had four. |
| `last_lookup_at` | Watermark for the per-row refresh icon. |
| `touched_at`, `touched_by_email` | Audit trail. |

`conversion_affiliates` and `conversion_affiliate_visits` are dropped. The backfill takes the highest-confidence row per conversion and re-shapes its evidence to include the matched visits as embedded snapshots, joined from `conversion_affiliate_visits` on the way out.

### Bots: marked, not dropped

`visits` gains `is_bot` and `bot_reason`. `track-visit` flags at ingest using a UA regex; lookup filters at read time. A revised regex never retroactively flips historic rows — the marking is a permanent claim about what we believed at ingest time.

### Retention is one rule, not two

The original plan had a daily 30-day prune *and* a monthly clear gated on a verified backup. The daily one never shipped. The monthly clear is now the only retention rule.

On the 1st of each month at 03:30 UTC, `backup-database` snapshots `visits` to R2 (`db/monthly/YYYY-MM-01.json.gz`) and HEAD-verifies. On day 2, a four-attempt cron calls `prune_visits_if_backed_up()`, which runs:

```sql
DELETE FROM visits
WHERE created_at <= last_successful_monthly_backup.completed_at;
```

Exactly the rows the backup captured. Anything inserted after the backup rolls into the next cycle. R2 is the long-term record; Supabase is the working cache. A new `prune-r2-archives` cron keeps the newest twelve monthly archives and deletes the rest — twelve months rolling, not ninety days, not forever.

### Two views, one dashboard

The admin UI is `AffiliateAttributionsDashboard.tsx`. Two switchable views over the same data:

**Time-ordered list.** Every conversion in chronological order. Each one expands to show its visitation log, notes field, and the system-suggested affiliate with an override picker. Two sections: *Needs Attention* and *Confirmed*.

**Affiliate-grouped.** Same conversions, grouped by affiliate. Verified affiliates first, then oldest-onboarded. Sortable via icon controls — date, name, confidence. Untagged ref codes hidden by default behind an eye-icon toggle next to the date range; when shown, grouped by ref code with a hint that it might be a typo or a missing affiliate.

Each conversion has a refresh icon. It re-runs the lookup **incrementally** — only visits with `created_at > last_lookup_at` — and **appends** new matches to the existing evidence (union of visit IDs, additive per-signal merge, score capped at 100). It exists to surface post-conversion activity: contact-form fills, later blog browsing. After a successful refresh, `last_lookup_at` advances to `now()`.

### A confidence score, honestly displayed

The scorer in `_shared/attribution.ts` weighs five signals: `browser_id`, FingerprintJS, Thumbmark fingerprint, IP `/24` subnet, and same-session presence. Weights sum to 130 and are hard-capped at 100 — overlap between signals is real, and capping it is more honest than re-normalizing.

Each conversion shows a 0–100 donut broken down by mechanism. Hover or expand each slice for plain-English copy explaining what the signal captured and why it weighs what it does. A small disclaimer makes the framing clear: this is a confidence detector, not proof. The admin's call is the final one.

## What was cut

Multi-affiliate per conversion, position fields, credit-share splits. Leads-first schema, cold-lead bucket, funnel widgets. Auto-correcting referral-code typos, auto-mapping unregistered codes. Cloudflare-Worker first-party IP detection. Stripe-driven payouts. A daily prune cron.

Everything that didn't directly serve "who sent this person?" got cut. The list above isn't a roadmap — it's a list of things that are not coming back without a new reason.

## Why this is right for one user

A general affiliate platform has to be flexible. We have one operator, a known volume profile, a manual review process, and a working scoring engine. Optimizing for those constraints means doing less, not more.

- The unit of review matches Hans's mental model. One row per conversion, one affiliate, one decision.
- Confirmation takes one click. The scorer's pick is pre-filled; touch-to-confirm moves the row from *Needs Attention* to *Confirmed*.
- Untagged ref codes get a place to live without taking up real estate. They're surfaced when the toggle is on, hidden when it isn't.
- Retention is a single sentence: rows live until the month's R2 backup verifies, then they're cleared. One cron, one gate.
- The dashboard never re-scores in bulk on load. The stored top-1 is the canonical answer; the per-row refresh exists for the rare cases where a visitor's identity firms up after the conversion.

The next twelve months of operating this system shouldn't require a redesign. That's the point.

## What I learned by redesigning the same thing three times

**Normalization isn't free.** The v2 multi-affiliate schema was textbook-correct for an abstract problem we don't have. Hans doesn't review credit splits; he reviews people. The cardinality I designed for never arrived in production data.

**Doc-first redesigns drift.** v3 lived in two long markdown files for a week before I noticed I was solving problems v2 had created — not problems Hans had. The cleanest thing I could do was throw both proposals away and ship a smaller delta from where the code actually was.

**Retention rules compound.** A daily 30-day prune plus a monthly verified-backup clear plus an R2 retention policy is three rules that interact. Replacing all three with one rule — *clear what was just backed up* — eliminated the interactions.

**Confidence is a UX problem, not a math problem.** The scorer was already good. What was missing was a way to show *why* it was confident. The donut is the only new visualization I added, and it's the thing Hans points at when he's deciding whether to trust the system.

The bottom line: the right answer for a one-operator system is the smallest one that lets the operator stop thinking about it. Less code, less schema, less ceremony. The system Hans is running today is the one that should still be running a year from now.
