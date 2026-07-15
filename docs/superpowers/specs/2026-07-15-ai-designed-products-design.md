# AI-Designed Product Grouping

## Goal

Separate products whose visual design has not received full human quality attention from the main Tools group, while explaining the distinction without interrupting browsing.

## Design

- Keep Poppy, Greenlights, and Event Every under the existing **Tools** heading.
- Add an **AI-Designed** subsection immediately below Tools.
- Place SkillGuard and claude-cues in the AI-Designed subsection.
- Put a compact information button inline with the AI-Designed heading.
- Show the supplied disclosure on hover, keyboard focus, or click.
- A click pins the disclosure open; clicking outside or pressing Escape closes it.
- Use the existing dark card and border language, with a restrained floating disclosure panel sized for readable paragraph text.

## Accessibility

- Use a real button with an accessible label and expanded state.
- Connect the button and disclosure with ARIA attributes.
- Support keyboard focus and Escape dismissal.
- Keep the disclosure available through pointer hover without making hover the only interaction.

## Verification

- Add component behavior coverage for grouping and disclosure interactions.
- Run the relevant tests, typecheck, and production build.
- Deploy only after local verification passes.
