In this assessment, I found several issues documented below, including answers being set in storage or passed along where they shouldn't be. I fixed the problem where they were set in local storage, and where the backend received, logged and persisted them. 

Subsequently, tests were added around the use cases of ensuring no quickcheck answers are persisted to local storage. And that the python records have no answers and the payload gets on answers. We reject payloads that have answers to ensure we never process that data.

Next, I would work down the list and start addressing the issues in order. 

How did I use AI?

Here's an overview. For a better answer, I suggest looking at codex transcript files which can be provided upon request. I agree with OpenAI's philosophy, which is that you want to share prompts, not results or interpretations after-the-fact. I think you can learn the most by seeing directly how I interact with the AI.

It's like the game of telephone we played as a kid.

I used AI to explore the project and get a UV dependency issue resolved, then gave the context of the product rules and had it find and transform violations in the code to the list we have below. It also helped test my assumptions and separate defects from product intent (noted in the list). It fixed the two items I narrowed in on fixing, one at a time, and when I found out I couldn't push to your remote repo, I had it push the code to this PR in my own repo https://github.com/mannanj/mannan20/pull/3/commits.

It acted as my git partner, it had too much scope when I asked it to fix a defect and I stopped it. I worked with it across 4 sessions and had it summarize the work into a format I could ingest for this summary for you. Some challenges/pushbacks: its tendency to fill this document with fluff. It's tendency was to eagerly jump into fixing things before my consent and I had to be clear to only do specific things.

How would I manage a larger agent-assisted change? It would be essential to know the prompt and context. More likely, I think I would scratch the output and start over with a fresh prompt with different system design and parameters. It's harder to take a bad design and make it good then start with a good design.

# Issues

1. FIXED: **Critical — Answers are saved in browser storage.**
   [QuickCheck.tsx](frontend/app/components/QuickCheck.tsx#L38) writes sensitive answers to `localStorage`, which the product rules explicitly prohibit.

2. **Critical — Answers are sent to analytics and logs.**
   Individual answers are tracked in [QuickCheck.tsx](frontend/app/components/QuickCheck.tsx#L45), and the complete answer set is tracked at [line 62](frontend/app/components/QuickCheck.tsx#L62). The analytics implementation logs and sends both payloads.

3. **Critical — Answers are included in the handoff.**
   The frontend adds `answers` to the handoff in [QuickCheck.tsx](frontend/app/components/QuickCheck.tsx#L72), despite the handoff's five-field allowlist.

4. FIXED (BACKEND ONLY): **Critical — The backend receives, logs, and persists answers.**
   The complete path is:

   - Next.js accepts and logs the body in [route.ts](frontend/app/api/studies/%5BstudyId%5D/handoffs/route.ts#L9).
   - Next.js forwards the body to FastAPI.
   - FIXED: FastAPI accepts an unrestricted dictionary and logs it in [handoffs.py](backend/app/api/routes/handoffs.py#L12).
   - FIXED: The service copies `answers` into the record in [services/handoffs.py](backend/app/services/handoffs.py#L38).
   - The repository retains the record.

5. **High — The system makes clinical eligibility claims.**
   The UI describes visitors as eligible or ineligible in [QuickCheck.tsx](frontend/app/components/QuickCheck.tsx#L113). The backend also converts the navigation signal into `eligibilityStatus` in [services/handoffs.py](backend/app/services/handoffs.py#L35). Both directly violate the product rules.

6. **High — Invalid sites are displayed and accepted.**
   Manchester is unpublished, and Cardiff belongs to another study, but both are offered. The backend's recruiting-site validator exists but is never called. A focused backend check confirmed that Cardiff is accepted with HTTP 201.

7. **High — Public API input is not validated.**
   FastAPI accepts `dict[str, Any]`, including unexpected fields. The existing Pydantic response model is unused, and there is no transport-owned request model.

8. **Medium — Raw technical errors reach visitors.**
   The screenshot's `fetch failed` message travels directly from the failed server request to the UI. Backend exception details can also be relayed. The message provides no understandable explanation, recovery guidance, or retry context.

9. **Medium — The success message is misleading and leads to a dead end.**
   “Your details have been passed” is inaccurate because the quick check collects no identity or contact details. “You can now continue” is also misleading because there is no continuation action.

10. **Medium — The flow does not explain why the questions are being asked.**
    The product rules explicitly require this explanation, but the question UI does not provide one.

# Product questions to track

11. **Should visitors with `unlikelyMatch` be allowed to continue?**
    This is not specified. The contract permits `unlikelyMatch` in a handoff, suggesting that continuation may be intentional. Blocking it requires an explicit product decision.

12. **Should site selection be hidden for `unlikelyMatch`?**
    This is also unspecified. The site picker currently appears for both outcomes because it is rendered unconditionally.

13. **Should the quick check stop immediately after a “No”?**
    This is unspecified. Any “No” eventually produces `unlikelyMatch`, but the rules do not require early termination.

14. **Is the actual prescreener missing?**
    It is absent, but the README describes it as a “separate” system, so implementing it may be outside the exercise's scope. However, the missing continuation destination remains an integration and UX gap.

15. **The `precheckOutcome` terminology is confusing.**
    `QuickCheckOutcome` and `quickCheckOutcome` would better match the product language. However, `precheckOutcome` is the documented public handoff field, so it cannot be renamed only in code; the contract must also change.
