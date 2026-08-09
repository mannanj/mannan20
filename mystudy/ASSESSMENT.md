# Defects

1. **Critical — Answers are saved in browser storage.**
   [QuickCheck.tsx](frontend/app/components/QuickCheck.tsx#L38) writes sensitive answers to `localStorage`, which the product rules explicitly prohibit.

2. **Critical — Answers are sent to analytics and logs.**
   Individual answers are tracked in [QuickCheck.tsx](frontend/app/components/QuickCheck.tsx#L45), and the complete answer set is tracked at [line 62](frontend/app/components/QuickCheck.tsx#L62). The analytics implementation logs and sends both payloads.

3. **Critical — Answers are included in the handoff.**
   The frontend adds `answers` to the handoff in [QuickCheck.tsx](frontend/app/components/QuickCheck.tsx#L72), despite the handoff's five-field allowlist.

4. **Critical — The backend receives, logs, and persists answers.**
   The complete path is:

   - Next.js accepts and logs the body in [route.ts](frontend/app/api/studies/%5BstudyId%5D/handoffs/route.ts#L9).
   - Next.js forwards the body to FastAPI.
   - FastAPI accepts an unrestricted dictionary and logs it in [handoffs.py](backend/app/api/routes/handoffs.py#L12).
   - The service copies `answers` into the record in [services/handoffs.py](backend/app/services/handoffs.py#L38).
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
