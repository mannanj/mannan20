# Product rules

These rules are the source of truth for the exercise.

## Journey

The public quick check helps a visitor decide whether continuing to a consented
prescreener may be worthwhile. It is not a clinical assessment and must not tell
someone that they are eligible or ineligible for a study.

No identity or contact information is collected during the quick check.

## Sensitive answers

Quick-check answers are sensitive and ephemeral:

- they may exist in browser memory while the visitor completes the check;
- they must not appear in URLs, cookies or browser storage;
- they must not be sent to analytics;
- they must not be included in logs; and
- they must not be sent to a Next.js or FastAPI endpoint.

## Handoff contract

The handoff may contain only:

```json
{
  "locale": "en-GB",
  "source": "study-website",
  "campaign": "example-campaign",
  "selectedSiteId": "site-london",
  "precheckOutcome": "potentialMatch"
}
```

`precheckOutcome` may be `potentialMatch` or `unlikelyMatch`. It is a
non-authoritative navigation signal and must not be stored or exposed as a clinical
eligibility status.

The selected site must belong to the study identified in the route and must be both
active and published for patient recruitment.

## Experience

The journey should:

- explain why questions are being asked;
- use calm, understandable language;
- make clear that the result is only an initial indication; and
- provide understandable validation and failure messages.
