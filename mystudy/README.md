# Founding / Senior Engineer Technical Exercise

## Format

- 90-minute take-home exercise
- 45-minute follow-up discussion
- AI coding tools are expected
- All study and patient data are synthetic

Please stop after 90 minutes. We assess judgment, prioritisation and engineering
approach, not completeness. Setup problems do not count toward the timebox; contact
us if `./verify.sh` does not pass before you begin.

## Background

myStudy is building a modern, affordable clinical-trial platform. Our initial focus
is patient recruitment, with a longer-term vision spanning the clinical-trial
lifecycle, including EDC, eCOA and RTSM/IRT.

This exercise is based on a fictional public study website. Visitors can complete a
short eligibility check before continuing to a separate, consented prescreener.

An AI coding agent produced the implementation in the latest commit. It works on the
happy path, but it has not received adequate engineering or product review. You can
inspect its complete change with:

```sh
git show HEAD
```

## Stack

```text
technical-exercise/
├── README.md
├── product-rules.md
├── frontend/       # Next.js, React and TypeScript
├── backend/        # FastAPI and Python
└── verify.sh
```

The backend uses Python and FastAPI because this reflects the myStudy stack.
Previous Python experience is not required. We are assessing whether you can use AI
and the repository's existing patterns to make safe, well-understood changes in an
unfamiliar codebase.

## Your task

Review the implementation as if it were an AI-generated pull request you were
responsible for shipping.

Within the 90-minute timebox:

1. Identify the most important engineering, privacy and product problems.
2. Prioritise them according to risk.
3. Fix the one or two problems you consider most important.
4. Include at least one backend change and one relevant backend test.
5. Run the most relevant available checks.
6. Record your assessment and decisions in `ASSESSMENT.md`.

You may change the frontend, backend or both. A focused, well-reasoned change is more
valuable than a large rewrite. You are not expected to make the implementation
perfect or demonstrate Python fluency, but you should understand and be able to
explain any AI-generated Python you submit.

## AI-tooling expectations

Use an AI coding assistant as part of the exercise. You may use any assistant and
workflow you prefer. If you do not currently have access to one, let us know.

We are interested in how you:

- give the model useful product and repository context;
- break down and delegate work;
- review generated code critically;
- detect incorrect assumptions;
- verify changes through tests and inspection; and
- keep control of scope.

Do not submit a complete transcript. In `ASSESSMENT.md`, briefly describe how you
used AI, how you verified its output, and one suggestion or generated change you
rejected or corrected.

## Deliverables

Submit the modified repository with:

- your code changes;
- tests you added or changed; and
- `ASSESSMENT.md`, limited to 500 words.

Your assessment should cover:

1. Main problems found and their priority
2. Changes made
3. What you would address next
4. How you used and supervised AI
5. Commands run and their results

## Follow-up discussion

The 45-minute follow-up does not include live coding:

1. **Technical walkthrough — 25 minutes.** Explain the problems you found,
   changes made, test strategy, alternatives and remaining production risks.
2. **AI-engineering discussion — 10 minutes.** Explain how you gave AI context,
   reviewed its work, corrected it and would manage a larger agent-assisted change.
3. **Product scenario — 10 minutes.** Discuss a request to pass public
   quick-check answers into the consented prescreener to avoid repeated questions.

## Getting started

Clone this repository and complete the exercise in your own development environment:

```sh
git clone https://github.com/my-study-systems/my-study-technical-exercise-ai-pr-review.git
cd my-study-technical-exercise-ai-pr-review
```

Requirements:

- Node.js 22+
- pnpm 11+
- Python 3.11
- uv

Install and verify:

```sh
pnpm install
uv sync --project backend
./verify.sh
```

Run the applications:

```sh
uv run --project backend uvicorn app.main:app --app-dir backend --reload --port 8000
pnpm --dir frontend dev
```

Then open `http://localhost:3000`.
