# Design System

Rules that hold across the site. One rule per section. Add to this file only when a
decision has been made twice.

## Equidistant spacing within a group

**Elements that belong to one group are separated by one spacing value, applied once.**

A sign-in form is a group: its heading, its input, its bot check and its submit button are
one thing a person reads top to bottom. So the distance between each pair is identical. The
eye reads uneven gaps as a boundary — a larger gap says "this belongs to something else" —
so uneven spacing inside one group makes it look like two groups that were pushed together.

### How

Set the gap once on the container. Never on the children.

```tsx
<form className="flex max-w-md flex-col items-start gap-4">
  <p>Sign in required</p>
  <input />
  <div ref={turnstileContainerRef} className="empty:hidden" />
  <button type="submit">Send link</button>
</form>
```

Not this:

```tsx
<p>Sign in required</p>
<form className="mt-6 flex flex-col gap-3">
  <input />
  <button type="submit">Send link</button>
</form>
<div ref={turnstileContainerRef} className="mt-3" />
```

The second version has three different gaps (24px, 12px, 12px) and puts the bot check
outside the group it belongs to. It was the live version until 2026-09-21.

Margin utilities (`mt-*`, `space-y-*`) on children are how groups drift apart: each one is
set locally, by whoever last touched that element, with no view of its neighbours. A single
`gap-*` on the parent cannot drift, and reads as one number when someone changes it.

### Choosing the value

`gap-4` (16px) is the default for a form-sized group. Go tighter (`gap-3`) only when the
elements are smaller than a text input. Going looser than `gap-6` inside one group usually
means it is really two groups, and should be split with a heading rather than with space.

### An element that is sometimes empty

An empty child still takes a gap on both sides, which silently doubles the space in the
middle of the group. Cloudflare Turnstile in `interaction-only` mode renders nothing at all
most of the time, so its container is empty far more often than not.

Give any such container `empty:hidden`. `display: none` removes it from the flex layout, so
no gap is drawn around it, and the group stays equidistant. When the widget does render, the
container fills and takes its single gap like every other child.

This is the case that breaks a group without anyone noticing, because it only appears in the
state nobody screenshots.

### Verifying

Measure it, do not eyeball it. Read the rendered boxes and assert the gaps are equal:

```js
const form = document.querySelector('form');
const kids = [...form.children].filter((el) => getComputedStyle(el).display !== 'none');
const gaps = kids.slice(1).map((el, i) =>
  Math.round(el.getBoundingClientRect().top - kids[i].getBoundingClientRect().bottom),
);
```

Every number in `gaps` should be the same. Check it in the state where the optional child is
present and in the state where it is absent, since those are different layouts.
