# Education Panel Line-Height Design

## Problem

Descriptions in the expanded Education projects panel use `line-height: 1.6`, producing a loose vertical rhythm that is harder to scan than the expanded employment bullets.

## Approved design

Keep the existing typography everywhere except nested `ContentCard` descriptions. Nested descriptions are specific to the light Education projects panel, so they will use `line-height: 1.35`. Non-nested descriptions will retain `line-height: 1.6`.

## Scope

- Modify the description typography in `src/components/about/content-card.tsx`.
- Do not change employment expansion typography, font sizes, project spacing, colors, panel dimensions, or content.
- Verify the Education panel at a mobile-width viewport and confirm employment remains unchanged.

## Acceptance

- Education project description lines are visibly tighter and easier to read.
- The change applies only when `ContentCard` receives `nested`.
- TypeScript and the focused browser check pass.
