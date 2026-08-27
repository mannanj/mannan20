# MCP Article Fetch Count Design

**Date:** 2026-08-26
**Status:** Approved for implementation

## Goal

Let an MCP client fetch the full text of a public Garden article and expose a truthful per-article counter beside the existing browser view count:

> **1,284 views · 24 MCP fetches**

The metric reports successful article-content responses from Mannan's MCP server. It does not claim that a model used the article in its final answer or that a human saw it.

## Current behavior to preserve

- `ArticleViews` increments the public `views` counter from a client-side POST after an article page renders in a JavaScript-capable browser.
- The site middleware separately records page requests, including raw HTTP clients and bots, in the visits D1 database.
- A raw fetch of a website article URL therefore remains visit telemetry, not a public `views` increment.
- `list_writing` continues to return the public article catalog.
- Hidden, unavailable, and no-index articles remain excluded from MCP article content.

## MCP interface

Add one read-only tool:

```text
get_article({ slug })
```

The input accepts only slugs present in the generated public MCP writing snapshot. A successful response returns normalized article content and metadata, then records one MCP fetch for that slug. Unknown or excluded slugs return a tool error and do not increment a counter.

The generated MCP snapshot will include a stable `slug` and normalized full-text `content` for every MCP-public Garden article. Agent-readable article text will live in explicit Markdown source files so the Worker never scrapes rendered HTML at request time. The MCP build drift check remains the freshness gate.

## Counter architecture

Extend the existing portfolio state Worker rather than introducing another database:

- Add persistent per-slug MCP fetch totals alongside Garden view totals.
- Add authenticated get, increment, and reset operations scoped to known public article slugs.
- Preserve operation-ID idempotency for increment and reset mutations.
- Bind the MCP Worker to the portfolio state Worker and authenticate calls with the existing state-service pattern.
- Increment only after `get_article` has resolved a valid public article and constructed a successful content response.
- If counter persistence is unavailable, still serve the public article but do not fabricate a count.

The reset operation exists for controlled validation and maintenance; it is not exposed as an MCP tool or public site endpoint.

## Site API and display

Extend the existing Garden views API response from:

```json
{ "views": 1284 }
```

to:

```json
{ "views": 1284, "mcpFetches": 24 }
```

The browser POST continues to increment only `views`. Reading the response never increments `mcpFetches`.

`ArticleViews` displays the exact copy:

> **1,284 views · 24 MCP fetches**

Both values render consistently, including zero. The existing alignment, accent color, loading transition, and failure-hiding behavior remain unchanged.

## Validation and final seed

Automated coverage will verify:

- `get_article` is listed and returns the correct public article content.
- Excluded and unknown slugs cannot be fetched or counted.
- Successful calls increment exactly once; failed calls do not increment.
- State mutations remain idempotent by operation ID.
- The article API returns both counters while its POST changes only browser views.
- The component formats and labels both counters correctly.
- MCP snapshot and privacy checks continue to pass.

After deployment authorization and deployment:

1. Reset MCP fetch counts for every MCP-public article.
2. Fetch every public article three times through the live MCP tool.
3. Verify every count equals three.
4. Reset every count to zero.
5. Fetch every public article three times again.
6. Verify and leave every public article at exactly three MCP fetches.

## Non-goals

- Claiming that a model cited, quoted, or surfaced the article.
- Treating generic crawlers or raw website GET requests as MCP fetches.
- Changing the meaning of the existing browser view count.
- Exposing counter reset through the public MCP protocol.
- Adding a general analytics dashboard in this change.
