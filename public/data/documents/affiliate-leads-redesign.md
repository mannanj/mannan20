# Affiliate System v3 — Leads-First Redesign Proposal

> **Status**: Proposal for review. **Not implemented.** Supersedes the draft at `docs/affiliate-leads-proposal.md` (which proposed *adding* a leads table on top of the v2 multi-affiliate schema).
> **Owner**: Mannan (engineering) / Hans (product)
> **Predecessors**:
> - `TASK-AFFILIATE-ATTRIBUTION.md` — v1 (single affiliate per conversion, shipped)
> - `TASK-AFFILIATE-MULTI-AFFILIATE-LOVABLE-HANDOFF.md` — v2 (multi-affiliate redesign, **migration written but not yet deployed** as of 2026-05-06)
> - `docs/affiliate-leads-proposal.md` — additive leads draft from Lovable
> **Created**: 2026-05-06

---

## 0. TL;DR

The v2 multi-affiliate redesign (`conversions` + `conversion_affiliates` + `conversion_affiliate_visits`) is **correct normalization for an abstract many-to-many problem, but wrong for ours**. Hans manually reviews every payout on a coaching site. He doesn't think in "submissions"; he thinks in "Sally's people."

The genuine simplification is to make **the per-affiliate person ("lead") the spine** instead of a side table bolted onto a submission-keyed model. That collapses three tables (`conversions`, `conversion_affiliates`, `conversion_affiliate_visits`) into two (`affiliate_leads`, `lead_conversions`) — same data, cleaner mental model, durable identity that survives non-conversion.

The v2 schema is **not yet live in production** ([handoff](TASK-AFFILIATE-MULTI-AFFILIATE-LOVABLE-HANDOFF.md) confirms migration not applied). This is the moment to revise before deploying.

**Recommendation**: replace v2 with v3 below before Lovable applies the v2 migration. If v2 is already applied when this is read, the migration cost is small (the new tables are empty in production today).

---

## 1. The current state — honest diagnosis

### 1.1 What's deployed (v1)
- `affiliates` — lookup, ~20 rows ever
- `visits` — every pageview where a fingerprint was computed (firehose, pruned)
- `attribution_candidates` — one row per (submission, candidate ref_code), with `affiliate_id` nullable when ref code wasn't registered
- `attribution_candidate_visits` — junction visits ↔ candidates

### 1.2 What's written but not deployed (v2 — see [handoff](TASK-AFFILIATE-MULTI-AFFILIATE-LOVABLE-HANDOFF.md))
- `conversions` — one row per submission (kind + source_table + source_row_id)
- `conversion_affiliates` — composite-PK junction (conversion_id, affiliate_id) carrying credit_share, position, confidence, status, review fields
- `conversion_affiliate_visits` — visits-junction keyed by (conversion, affiliate, visit)

### 1.3 What's questionable about v2

**`conversion_affiliate_visits` is largely duplicative.** Its only data column is `signal_summary` (jsonb), which restates a subset of `conversion_affiliates.evidence.signals[]`. Its only structural job is anchoring the prune query so visits referenced by a live conversion don't get deleted. That can be done from the jsonb evidence on the parent row.

**`conversions` + `conversion_affiliates` is a clean 1:N split — but only useful if you query "all conversions" frequently independent of affiliates.** For Hans's actual workflow (review per-affiliate-per-person), a single per-(affiliate, person) row is the natural unit. Splitting into "the submission" + "this affiliate's claim on it" creates two rows you always join back together.

**There is no place for a ref-tagged person before they convert.** Today Sally can refer 50 people, none convert in 30 days, and the visits get pruned. There's no row in any table that says "Sally has touched 50 people this month, here are their last-seen timestamps and what pages they viewed." This is the gap [Lovable's leads draft](docs/affiliate-leads-proposal.md) correctly identifies.

**Two duplicate migration files for v2 exist locally** — this needs cleanup before any further migration work (see §10 Pitfalls).

### 1.4 What the user's gut said (and where it's right vs incomplete)

> "it feels excessive to have two tables for conversions… each conversion can be rated in terms of which affiliate gets what %… leads visitation data will have almost everything we need so a duplication of the conversion tables aren't needed"

**Right**: For a multi-affiliate world, the per-(affiliate, person) row is doing the work — `conversion_affiliates` is essentially "lead that has converted." If we extend that row to also exist BEFORE conversion (covering the leads gap), `conversions` becomes thin enough to fold into a small junction.

**Incomplete**: You still need *somewhere* to record the submission link (which subscribers/contact_submissions/application_submissions row this lead converted via), plus the reality that one lead may convert multiple times (subscribe to newsletter, then later submit application). That's what the slim `lead_conversions` table is for — but it's a 4-column junction, not a parallel "conversion_affiliates" with 16 columns of duplicated review state.

---

## 2. Industry reference points

I researched how the established affiliate platforms model this. The consensus is the **Visitor → Lead → Conversion** trinity:

| Stage | Rewardful definition | What it maps to in our system |
|---|---|---|
| **Visitor** | Anyone who clicks an affiliate link and lands on the site | One row in `visits` with `ref_code IS NOT NULL` |
| **Lead** | Prospect with attribution captured (in their world, "passed to Stripe" — for us, identity captured) | NEW: per-(affiliate, browser/email) durable row |
| **Conversion** | Successful charge / payment / desired action | Subscribe / contact / application submission, linked to the lead |

Source: [Rewardful — Visitors, Leads & Conversions](https://help.rewardful.com/en/articles/4202371-visitors-leads-conversions).

Other relevant findings:

- **Server-side first-party tracking with click IDs is the 2026 default.** ([iRev](https://irev.com/blog/cookieless-affiliate-tracking-what-actually-works-in-2026/), [Stape](https://stape.io/blog/the-impact-of-third-party-cookie-deprecation-on-affiliate-marketing)). LocalStorage-only is workable but degrades; the planned Cloudflare Worker upgrade gets us to first-party HttpOnly cookies.
- **For low-volume operations, rule-based attribution beats data-driven.** Google's threshold for data-driven attribution is ~600 conversions/month per action ([Marketing Mary](https://www.marketingmary.ai/blog/marketing-attribution-models-guide)). Below that, position-based (U-shaped) or first/last touch is the right call. We're nowhere near 600/month and won't be — Hans's manual review is the right adjudicator.
- **GDPR / ePrivacy require consent for fingerprinting** ([Consenteo](https://www.consenteo.com/knowledge-hub/GDPR/gdpr_cookie_consent_2026), [TermsFeed](https://www.termsfeed.com/blog/legal-requirements-device-fingerprinting/)). Article 5(3) ePrivacy Directive applies; legitimate-interest can cover fraud-prevention purposes but not behavioural advertising. We need to be specific about purpose in the privacy notice and audit whether the current `useTrackVisit.ts` flow needs a consent gate for EU traffic.
- **Self-referral / coupon fraud detection** is a real concern even at small scale ([Rewardful Self-Referral Detection](https://www.rewardful.com/self-referral-fraud-detection)). Cross-checking submission email vs affiliate email at conversion time is one line of code; the pattern of "many leads from same IP /24" is a useful signal.

None of these change the schema fundamentally — they shape the policy fields (consent, status enums) and the future Stripe webhook entry point.

---

## 3. Proposed v3 schema

```
┌────────────────────────────────────────────────────────────────────┐
│  affiliates  (unchanged)                                            │
│    id, ref_code (lower-unique), name, email, payout_terms,         │
│    notes, is_active, created_at, updated_at                        │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               │  affiliate_id
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  affiliate_leads  (NEW — the spine)                                 │
│  One row per (affiliate, person). Created at first ref-tagged       │
│  visit. Updated as identity firms up and activity accrues.          │
│                                                                    │
│  id  uuid PK                                                       │
│  affiliate_id  FK affiliates(id) ON DELETE RESTRICT                │
│  ref_code      text NOT NULL                                       │
│                                                                    │
│  -- identity (any subset; filled in over time)                     │
│  browser_id            text                                        │
│  fingerprint_thumbmark text                                        │
│  fingerprint_fpjs      text                                        │
│  ip_address_first      text   (snapshot of first-touch IP)         │
│  email                 text  -- nullable until known (form submit) │
│  name                  text  -- nullable                           │
│                                                                    │
│  -- activity                                                       │
│  first_seen_at  timestamptz NOT NULL                               │
│  last_seen_at   timestamptz NOT NULL                               │
│  visit_count    int NOT NULL DEFAULT 1                             │
│  pages_seen     jsonb NOT NULL DEFAULT '[]'  -- capped to last 50  │
│                                                                    │
│  -- attribution scoring (populated when conversion occurs)         │
│  position           text CHECK (position IN ('only','first',       │
│                                              'mid','last')) NULL   │
│  credit_share       numeric(5,4) NOT NULL DEFAULT 1.0              │
│                       CHECK (credit_share >= 0 AND <= 1)           │
│  confidence_score   smallint NOT NULL DEFAULT 0                    │
│                       CHECK (between 0 AND 100)                    │
│  evidence           jsonb NOT NULL DEFAULT '{}'                    │
│                                                                    │
│  -- review workflow                                                │
│  status text NOT NULL DEFAULT 'active'                             │
│    CHECK (status IN ('active','cold','pending_review',             │
│                      'confirmed','rejected','self_referral',       │
│                      'unsubscribed'))                              │
│  review_notes      text                                            │
│  reviewed_by_email text                                            │
│  reviewed_at       timestamptz                                     │
│                                                                    │
│  -- denorm for fast list views                                     │
│  conversion_count    int NOT NULL DEFAULT 0                        │
│  first_converted_at  timestamptz                                   │
│  last_converted_at   timestamptz                                   │
│                                                                    │
│  created_at, updated_at  timestamptz                               │
│                                                                    │
│  -- soft uniqueness (a person may show up under multiple ids)      │
│  UNIQUE (affiliate_id, browser_id) WHERE browser_id IS NOT NULL    │
│  UNIQUE (affiliate_id, email)      WHERE email      IS NOT NULL    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               │  lead_id
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  lead_conversions  (NEW — the events, zero or more per lead)        │
│                                                                    │
│  lead_id        FK affiliate_leads(id) ON DELETE CASCADE           │
│  source_table   text CHECK (source_table IN                        │
│    ('subscribers','contact_submissions','application_submissions'))│
│  source_row_id  uuid NOT NULL                                      │
│  kind           text CHECK (kind IN                                │
│                  ('subscribe','contact','application'))            │
│  email          text NOT NULL  -- snapshot                         │
│  name           text                                               │
│  payload_summary jsonb NOT NULL DEFAULT '{}'                       │
│  converted_at   timestamptz NOT NULL DEFAULT now()                 │
│                                                                    │
│  PRIMARY KEY (lead_id, source_table, source_row_id)                │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  visits  (unchanged firehose; prune query rewritten — see §5)       │
└────────────────────────────────────────────────────────────────────┘
```

### 3.1 What changes vs v2 (planned but undeployed)

| v2 plan | v3 proposal | Why |
|---|---|---|
| `conversions` (1 per submission) | dropped; replaced by `lead_conversions` (slim junction) | The unified "submission happened" row was justified for funnel queries, but a UNION ALL across source tables (or a view) covers that without a separate persistent table. |
| `conversion_affiliates` (per-(conversion, affiliate)) | folded into `affiliate_leads` (per-(affiliate, person)) | Same cardinality. The lead row carries the same credit/review fields, plus identity/activity it never had before. |
| `conversion_affiliate_visits` (per-(conv, aff, visit)) | dropped; matched_visit_ids stays in `affiliate_leads.evidence` | Junction table earned its keep only as a prune anchor; that role moves into the prune query (§5). |
| New: `affiliate_leads` | Same, but **as the spine, not an addition** | Lovable's draft added it; v3 makes it the centre. |
| New: `lead_conversions` | New, but minimal (no review fields) | Just records "this lead became this submission row at this time." Review state lives on the lead. |

**Net table count** for affiliate-side concerns (excluding the unchanged `affiliates` lookup and `visits` firehose):
- v1: 2 (`attribution_candidates`, `attribution_candidate_visits`)
- v2 (planned): 3 (`conversions`, `conversion_affiliates`, `conversion_affiliate_visits`)
- **v3 proposed: 2 (`affiliate_leads`, `lead_conversions`)**

### 3.2 Data flow

**On a ref-tagged visit** (`track-visit` edge function):
1. Insert `visits` row as today.
2. Resolve `ref_code` → `affiliate_id`. If unregistered, skip step 3.
3. Upsert `affiliate_leads` keyed by `(affiliate_id, browser_id)`:
   - First time → insert with `first_seen_at`, `visit_count=1`, copy fingerprints + IP snapshot.
   - Repeat → bump `last_seen_at`, `visit_count`, append path to `pages_seen` (cap 50).

**On an untagged visit**: `visits` row only. No lead activity (cheaper, also matches the privacy posture — we only profile people who entered our funnel via an affiliate).

**On form submission** (subscribe / contact / application via `register-attribution` or `subscribe-newsletter`):
1. Source-table row is inserted as today (subscribers / contact_submissions / application_submissions).
2. Run scorer over recent visits (logic from `_shared/attribution.ts` — unchanged).
3. For each scored ref_code that resolves to a registered affiliate:
   - Find or create the matching `affiliate_leads` row (by `affiliate_id` + any matching identifier).
   - Patch with `email`, `name`, refreshed `confidence_score`, `evidence`, `position`, `last_seen_at`.
   - Insert into `lead_conversions` with `(source_table, source_row_id, kind, email, payload_summary, converted_at)`.
   - Bump `conversion_count`, set `first_converted_at` if NULL, update `last_converted_at`.
4. **Self-referral check** (cheap addition): if submission `email` matches an `affiliates.email`, set lead `status = 'self_referral'` and skip credit by default (Hans can override). [Source: Rewardful self-referral detection](https://www.rewardful.com/self-referral-fraud-detection).

**On admin review** (Hans): updates `affiliate_leads.status`, `review_notes`, optional `credit_share` adjustment.

---

## 4. What this unlocks

These are queries that are awkward or impossible today, and trivial in v3:

```sql
-- Everyone Sally has touched
SELECT * FROM affiliate_leads WHERE affiliate_id = $sally
ORDER BY last_seen_at DESC;

-- Sally's funnel this month
SELECT
  count(*)                                          AS leads,
  count(*) FILTER (WHERE visit_count >= 3)          AS engaged,
  count(*) FILTER (WHERE email IS NOT NULL)         AS named,
  count(*) FILTER (WHERE conversion_count > 0)      AS converted
FROM affiliate_leads
WHERE affiliate_id = $sally AND first_seen_at >= date_trunc('month', now());

-- Cold leads (warm targeting list — for Hans's email outreach)
SELECT email, name, last_seen_at, pages_seen
FROM affiliate_leads
WHERE affiliate_id = $sally
  AND email IS NOT NULL
  AND conversion_count = 0
  AND last_seen_at < now() - interval '30 days'
  AND status NOT IN ('rejected','self_referral','unsubscribed');

-- Total credit share Hans owes Sally for confirmed conversions
SELECT sum(credit_share) AS owed_share, count(*) AS converted_leads
FROM affiliate_leads
WHERE affiliate_id = $sally AND status = 'confirmed' AND conversion_count > 0;
```

The "all conversions across all affiliates" view (which was on `conversions`) becomes a small view:

```sql
CREATE VIEW v_conversions AS
  SELECT lead_id, source_table, source_row_id, kind, email, converted_at,
         (SELECT affiliate_id FROM affiliate_leads WHERE id = lead_id) AS affiliate_id
  FROM lead_conversions
  UNION ALL
  -- Non-affiliate conversions: subscribers/contact_submissions/application_submissions
  -- not present in lead_conversions. Three small UNION ALL legs.
  ...;
```

---

## 5. Trade-offs (honest)

### 5.1 What v3 loses vs v2

1. **Dedicated "submission happened" row.** Today (well, in v2's plan) `conversions` is the canonical record of "a submission of any kind occurred." In v3 that lives across the three source tables + `lead_conversions`. Funnel queries that don't care about affiliates need a UNION ALL or a view. **Severity: low** — Hans doesn't have a non-affiliate funnel report today. If we add one, the view costs 8 lines of SQL.

2. **Multi-affiliate single-conversion accounting.** Today (v2 plan) one `conversions` row + two `conversion_affiliates` rows = clear "1 submission, 2 affiliates each with their share." In v3, two separate `affiliate_leads` rows each have a `lead_conversions` row pointing at the same `(source_table, source_row_id)`. Querying "how many actual sales did we make" needs DISTINCT. **Severity: medium** — easy to get wrong if not documented. Mitigation: the view above handles it.

3. **`conversion_affiliate_visits` audit detail.** v2 stored a junction row per (conversion, affiliate, visit) so you could exactly trace "which visit row did Sally's match come from." v3 keeps `matched_visit_ids[]` in `evidence` jsonb. **Severity: very low** — same data, different storage.

### 5.2 What v3 fixes vs v2

1. **No more "ref-tagged visitor who never converted vanishes in 30 days."** Active leads keep their visit history as long as the lead is active.
2. **The review unit matches Hans's mental model.** "Approve Sally's claim on this lead" instead of "approve Sally's row of this conversion's claim table."
3. **One less table, less SQL surface area to maintain.**
4. **Extensible to "influencer touch" attribution later.** A non-affiliate-converting subscriber whose `browser_id` matches an existing lead can be flagged as "Sally-influenced" without inventing a new table.

### 5.3 What's the same

- Capture beacon (`track-visit`) shape, fingerprinting libraries, scoring weights — unchanged.
- RLS posture — `USING (false)` everywhere, all writes via Service Role edge functions.
- Privacy retention — visits prune at 30d untagged / 12mo all (with the prune query rewrite below).
- Self-referral, ASN/network-type IP enrichment, Cloudflare Worker upgrade — all still on the roadmap, just unblocked.

### 5.4 Prune query rewrite (replaces `conversion_affiliate_visits` anchor)

```sql
CREATE OR REPLACE FUNCTION public.prune_visits()
RETURNS TABLE (deleted_untagged bigint, deleted_old bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE untagged_count bigint; old_count bigint;
BEGIN
  WITH deleted AS (
    DELETE FROM public.visits v
    WHERE v.created_at < now() - interval '30 days'
      AND v.ref_code IS NULL
      -- Keep visits referenced by an active lead's evidence
      AND NOT EXISTS (
        SELECT 1 FROM public.affiliate_leads al
        WHERE al.evidence -> 'matched_visit_ids' ? v.id::text
          AND al.status NOT IN ('rejected','self_referral','unsubscribed')
      )
    RETURNING 1
  ) SELECT count(*) INTO untagged_count FROM deleted;

  WITH deleted AS (
    DELETE FROM public.visits v
    WHERE v.created_at < now() - interval '12 months'
    RETURNING 1
  ) SELECT count(*) INTO old_count FROM deleted;

  RETURN QUERY SELECT untagged_count, old_count;
END;
$$;
```

The jsonb-contains check uses a GIN index on `affiliate_leads(evidence jsonb_path_ops)`. Slower than a real FK, but runs once a month — fine.

---

## 6. Open product / policy decisions (decide before build)

These are the same questions Lovable's draft surfaced, with my recommendations:

1. **Anonymous leads — keep rows for browsers whose email we never learn?**
   *Recommend* (b) keep only after `visit_count ≥ 2` OR `pages_seen` length ≥ 3. A drive-by single-pageview from a referral link is noise; a returning visitor is a lead. Drop the row at 90 days if still anonymous. Reasoning: balances signal density against GDPR data-minimisation.

2. **Cross-affiliate dedup — same browser visits via Sally's link, then Joe's.**
   *Recommend* **two leads** (one per affiliate). Mirrors v2's multi-affiliate model and keeps Hans's review unit clean ("Joe also touched this person"). Position fields (`first`/`last`) carry the multi-touch signal across the two rows.

3. **Page tracking — log every page a ref'd visitor sees?**
   *Recommend* yes, as a capped jsonb array (last 50 paths). Light addition to the visit beacon. Unlocks "Sally's leads who viewed `/the-unbinding`" queries that drive Hans's outreach.

4. **Cold-status job — auto-flip status to `'cold'` after 30d inactivity?**
   *Recommend* compute on read. A view or a CASE in queries: `WHEN last_seen_at < now() - interval '30 days' THEN 'cold' ELSE status END`. Avoids a cron job; status field stays meaningful (Hans's manual decisions, not derived state).

5. **GDPR consent gate for fingerprinting** (NEW — Lovable's draft missed this).
   *Recommend* gate fingerprint computation behind explicit consent for EU traffic; capture only `browser_id` + IP without consent (legitimate-interest fraud-prevention claim). Without consent, `affiliate_leads` rows still get created with degraded confidence scores. Reasoning: [ePrivacy Article 5(3) requires consent for fingerprinting](https://www.consenteo.com/knowledge-hub/GDPR/gdpr_cookie_consent_2026); CNIL fined Google €325M in 2025 for cookie violations. We're tiny but the rule is the rule. Open question: do we have meaningful EU traffic? If <5% of visits, defer; if not, gate before launching v3.

6. **Self-referral default** (NEW).
   *Recommend* auto-flag (`status = 'self_referral'`, `credit_share = 0`) when conversion email == affiliate email; Hans can override. Cheap, well-known anti-pattern ([Rewardful](https://www.rewardful.com/self-referral-fraud-detection), [Refgrow](https://refgrow.com/blog/affiliate-fraud-detection-guide)).

7. **Stripe future**: when the Unbinding's $4-6k checkout goes through Stripe, the conversion event is the `checkout.session.completed` webhook. That maps to a new `lead_conversions` row with `kind='purchase'` (extend the enum), `source_table='stripe_charges'`. Schema is forward-compatible. Defer until checkout is live.

---

## 7. Build plan (phased)

### Phase A — schema migration (small, ~1 hour Lovable)
- Drop v1 tables: `attribution_candidates`, `attribution_candidate_visits`.
- (If v2 already applied) Drop v2 tables: `conversions`, `conversion_affiliates`, `conversion_affiliate_visits`.
- Create v3: `affiliate_leads`, `lead_conversions`.
- Recreate `prune_visits()` with new anchor query (§5.4).
- RLS `USING (false)` on both new tables; updated_at trigger on `affiliate_leads`.
- Single migration file; Hans applies via Lovable agent. **Production data lost in this migration: zero affiliate review rows currently exist** (per the handoff context — we're pre-deploy).

### Phase B — capture (small, edge function)
- `track-visit/index.ts`: after the `visits` insert, if `ref_code` resolves to an affiliate, upsert `affiliate_leads`. ~15 lines added.

### Phase C — conversion (medium, edge function)
- `_shared/generate-candidates.ts`: rewrite to write `affiliate_leads` (upsert) + `lead_conversions` (insert). Self-referral check inline.
- `register-attribution/index.ts`, `subscribe-newsletter/index.ts`: unchanged signatures; only the inner `generateAttributionCandidates` call's data shape changes.

### Phase D — admin reads/writes (medium, edge function)
- Rename `list-attribution-candidates` → `list-affiliate-leads`. Returns one row per lead with conversions[] sub-array.
- Rename `update-attribution-candidate` → `update-affiliate-lead`. Body shape: `{lead_id, status?, review_notes?, credit_share?}`.

### Phase E — admin UI (medium, frontend)
- `AttributionsManager.tsx` → `AffiliateLeadsManager.tsx`. Per-affiliate grouping, lead list with conversions inline, funnel widget.
- Builds on the work in [TASK-AFFILIATE-ATTRIBUTION-UI-REDESIGN-v2-with-crud.md](TASK-AFFILIATE-ATTRIBUTION-UI-REDESIGN-v2-with-crud.md) — that design is largely portable, just the list unit changes from "candidate" to "lead."

### Phase F — types regen + smoke test (Lovable)
- Regenerate `src/integrations/supabase/types.ts`.
- Verification checklist: visit with ref → `affiliate_leads` row created. Submit form → `lead_conversions` row created, status updates work, funnel widget reads correctly. Multi-affiliate touch creates two leads.

**Estimated total**: ~1 focused session + Lovable handoff for migration/edge-functions/types.

---

## 8. Why this is "really good for ourselves" specifically

A general affiliate platform serves N customers and must be flexible. We serve one customer (Hans) with one product line and a manual review process. The right design for us is the one that:

- **Centres Hans's actual workflow** ("review Sally's people"), not an abstract "review a list of attribution candidates."
- **Survives non-conversion** (Sally builds an audience over months; we shouldn't lose that data because nobody bought yet).
- **Is small** — minimum number of tables, minimum number of edge functions, minimum cognitive load when Hans (or future Mannan-replacement) needs to maintain it.
- **Forward-compatible to Stripe-paid conversions** without schema rework.
- **Compliant by design** with GDPR/ePrivacy posture (consent gating + retention).
- **Hard to commit fraud against** for the well-known small-operator patterns (self-referral via own ref code, single-IP cluster).

v3 is more opinionated than v2. That's the right move for a system with a known operator and known volume profile.

---

## 9. What to do with `docs/affiliate-leads-proposal.md`

Lovable's draft proposed adding `affiliate_leads` *on top of* the v2 schema (so 6 tables total). v3 proposes replacing v2 with `affiliate_leads` + `lead_conversions` (so 4). Same gap analysis, different conclusion.

**Recommend**: update `docs/affiliate-leads-proposal.md` to either point at this document or be replaced by it once direction is confirmed. Keep one source of truth.

---

## 10. Pitfalls / cleanup tasks discovered during this analysis

### 10.1 Duplicate v2 migration files (real bug)
Two near-identical migrations exist:
- `supabase/migrations/20260506190000_attribution_multi_affiliate_redesign.sql` (the human-authored one referenced in [the v2 handoff](TASK-AFFILIATE-MULTI-AFFILIATE-LOVABLE-HANDOFF.md))
- `supabase/migrations/20260506233849_d7ce6c91-3039-4dd2-bf79-6f808e62c6df.sql` (Lovable-style hash filename, identical schema sans header comments)

If both run on Lovable's DB, the second will fail with "table already exists." **Recommend deleting the Lovable-generated duplicate before any further migrations land.** If v3 supersedes v2 entirely (recommended), this becomes moot — both v2 migrations get retired in favour of the v3 migration.

### 10.2 `register-attribution` does an email-based submission lookup
Today, after a contact/application form inserts a row, `register-attribution` does a "find the most recent submission with this email in the last 5 minutes" lookup. This is brittle (race conditions, near-duplicate submissions). v3 doesn't fix this directly, but a small improvement: have the form send the inserted row's ID along with the attribution payload. (Not required for v3; flag as a follow-up.)

### 10.3 IP enrichment never landed
The original spec called for `ip_country`, `ip_asn`, `ip_network_type` columns. None exist. The `visits` schema captures `ip_address` only. v3 doesn't require enrichment, but the planned Cloudflare Worker upgrade naturally provides `cf-ipcountry` / `cf-ipasn` / `cf-ipcity` headers free; worth adding columns at that point.

### 10.4 Untracked v2-redesign files referenced in `git status`
Several recent commits ("Changes" with no description) and untracked files (`affiliate-attribution-conversation.txt`, `affiliate-attribution-original-message.txt`) suggest in-flight work from multiple sessions. Worth a `git status` review before starting the v3 migration so context isn't lost.

---

## Sources

### Local repo references
- [TASK-AFFILIATE-ATTRIBUTION.md](TASK-AFFILIATE-ATTRIBUTION.md) — v1 spec (single affiliate per conversion)
- [TASK-AFFILIATE-MULTI-AFFILIATE-LOVABLE-HANDOFF.md](TASK-AFFILIATE-MULTI-AFFILIATE-LOVABLE-HANDOFF.md) — v2 multi-affiliate redesign handoff (not yet deployed)
- [TASK-AFFILIATE-ATTRIBUTION-UI-REDESIGN.md](TASK-AFFILIATE-ATTRIBUTION-UI-REDESIGN.md) and [v2-with-crud](TASK-AFFILIATE-ATTRIBUTION-UI-REDESIGN-v2-with-crud.md) — UI work (largely portable)
- [docs/affiliate-leads-proposal.md](docs/affiliate-leads-proposal.md) — Lovable's additive leads draft
- `affiliate-attribution-original-message.txt` and `affiliate-attribution-conversation.txt` — original v1 design conversation (Lovable agent + Mannan)
- `supabase/migrations/20260506154130_*.sql` — v1 schema (live)
- `supabase/migrations/20260506190000_attribution_multi_affiliate_redesign.sql` — v2 schema (in repo, not deployed)
- `supabase/functions/_shared/attribution.ts` and `generate-candidates.ts` — scoring + write logic
- `supabase/functions/track-visit/index.ts` — capture beacon
- `src/components/AttributionsManager.tsx` — current admin UI
- Memory: `feedback_lovable_cloud_no_cli.md` — Lovable Cloud constraint (no local supabase CLI)
- Memory: `project_app_overview.md` — overall app architecture (hardened-gateway RLS pattern)

### Industry references
- [Rewardful — Visitors, Leads & Conversions](https://help.rewardful.com/en/articles/4202371-visitors-leads-conversions) — the Visitor → Lead → Conversion model this proposal mirrors
- [Rewardful — Self-Referral Fraud Detection](https://www.rewardful.com/self-referral-fraud-detection) and [Guide to Detecting Affiliate Fraud](https://www.rewardful.com/guides/how-to-detect-and-prevent-affiliate-fraud)
- [Refgrow — Affiliate Fraud Detection Guide](https://refgrow.com/blog/affiliate-fraud-detection-guide)
- [Tapfiliate — Referral Link Tracking 2026](https://tapfiliate.com/blog/how-to-set-up-referral-link-tracking_bb/) and [click-id based API tracking](https://tapfiliate.com/docs/guides/migrating-from-referral-code-to-click-id-based-api-tracking/)
- [iRev — Server-Side Affiliate Tracking Without Cookies (2026)](https://irev.com/blog/cookieless-affiliate-tracking-what-actually-works-in-2026/)
- [Stape — Cookieless Affiliate Tracking Guide](https://stape.io/blog/the-impact-of-third-party-cookie-deprecation-on-affiliate-marketing)
- [Marketing Mary — Multi-Touch Attribution Models Guide](https://www.marketingmary.ai/blog/marketing-attribution-models-guide) (600 conversions/month threshold for data-driven attribution)
- [Improvado — Best Multi-Touch Attribution Solutions 2026](https://improvado.io/blog/multi-touch-attribution-solutions)
- [Adjust — What is Multi-Touch Attribution](https://www.adjust.com/blog/what-is-multi-touch-attribution/)
- [Consenteo — GDPR Cookie Consent in 2026](https://www.consenteo.com/knowledge-hub/GDPR/gdpr_cookie_consent_2026) — ePrivacy Article 5(3) and fingerprinting consent
- [TermsFeed — Legal Requirements for Device Fingerprinting](https://www.termsfeed.com/blog/legal-requirements-device-fingerprinting/)
- [EFF — GDPR and Browser Fingerprinting](https://www.eff.org/deeplinks/2018/06/gdpr-and-browser-fingerprinting-how-it-changes-game-sneakiest-web-trackers)
- [Refferq (open source affiliate platform)](https://github.com/Refferq/Refferq) — referenced for table-naming conventions (Affiliates / Referrals / Clicks / Commissions / Payouts)
