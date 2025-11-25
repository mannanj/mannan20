### Task 150: Smart Contact Input with Google OAuth Integration

Transform the contact modal input into a smart single input with Google sign-in integration, similar to event-every's SmartInput.

**Reference:** `/Users/mannanj/Projects/event-every/src/components/SmartInput.tsx`

- [ ] Add Google icon (or +) inside the input field for OAuth trigger
- [ ] Implement Google OAuth flow to retrieve user contact info
- [ ] Show checkboxes after Google auth to let user select which info to share (name, email, etc.)
- [ ] Add remove icons to deselect contact fields
- [ ] Update placeholder to indicate manual entry options (name, email, reason)
- [ ] Add educational messaging explaining this is for validation/noise reduction, not newsletter collection
- [ ] Conditionally reveal contact info based on validation outcome
- [ ] Update contact form styling to match smart input UX pattern

- Location: `src/app/components/contact/contact-form.ts`
