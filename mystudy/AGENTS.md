# Repository guidance

This is a small hiring exercise, not production software. Keep changes focused and
proportionate to the 90-minute timebox.

## Product and data rules

- Treat eligibility-check answers as sensitive.
- Follow `product-rules.md` as the source of truth.
- Do not add identity collection to the public quick check.
- Do not describe the quick-check result as clinical eligibility.

## Frontend

- Use the Next.js App Router, React and TypeScript.
- Keep interactive state inside focused client components.
- Treat Next.js route handlers as public HTTP boundaries.
- Validate browser input at runtime; TypeScript types alone are not validation.
- Test user-visible behaviour rather than implementation details.

## Backend

- Use transport-owned Pydantic request and response models.
- Public JSON is camelCase; Python code remains snake_case.
- Reject unexpected request fields.
- Keep routes thin: validate and orchestrate in the route, and keep product logic
  in services.
- Do not expose persistence records as API contracts.
- Return sanitised errors and avoid logging raw request or domain payloads.

## Validation

- Add tests at the layer where the risk is owned.
- Run the narrowest relevant test while iterating.
- Run `./verify.sh` before submitting when time permits.
