# Globe AI-Designed Label

## Goal

Identify AI-designed products consistently in both the flat product list and the globe product detail panel.

## Design

- Store the AI-designed classification on product data rather than inferring it from position.
- Share one disclosure component and one concise disclosure sentence across both views.
- In the globe detail metadata row, render `AI-Designed` with its info icon after the year for SkillGuard and claude-cues only.
- Preserve hover, focus, click-pin, outside-click, and Escape dismissal.
- Keep the globe label muted to match the existing metadata row.

## Verification

- Cover product classification and detail-label rendering in automated tests.
- Run the relevant Playwright tests, typecheck, and production build before deployment.
