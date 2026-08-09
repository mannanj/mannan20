"use client";

import { useState } from "react";

import { track } from "@/lib/analytics";
import { createHandoff } from "@/lib/handoffs";
import {
  calculateOutcome,
  quickCheckQuestions,
  type Answer,
  type AnswerMap,
  type PrecheckOutcome,
} from "@/lib/questions";

const STUDY_ID = "study-trd-301";

const sites = [
  { id: "site-london", name: "London Research Centre" },
  { id: "site-manchester", name: "Manchester Research Centre" },
  { id: "site-cardiff", name: "Cardiff Research Centre" },
];

export function QuickCheck() {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [outcome, setOutcome] = useState<PrecheckOutcome | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = quickCheckQuestions[questionIndex];
  const currentAnswer = question ? answers[question.id] : undefined;
  const progress = outcome
    ? 100
    : ((questionIndex + 1) / quickCheckQuestions.length) * 100;

  function answerQuestion(answer: Answer) {
    if (!question) return;

    setAnswers((current) => ({ ...current, [question.id]: answer }));
    track("quick_check_answered", { questionId: question.id, answer });
  }

  function continueQuestions() {
    if (!currentAnswer) return;

    if (questionIndex < quickCheckQuestions.length - 1) {
      setQuestionIndex((current) => current + 1);
      return;
    }

    const result = calculateOutcome(answers);
    setOutcome(result);
    track("quick_check_completed", { answers, outcome: result });
  }

  async function continueToPrescreener() {
    if (!outcome || !selectedSiteId) return;

    setSubmitting(true);
    setError(null);

    try {
      await createHandoff({
        studyId: STUDY_ID,
        locale: navigator.language || "en-GB",
        source: "study-website",
        campaign: "summer-search",
        selectedSiteId,
        precheckOutcome: outcome,
        answers,
      });
      setSubmitted(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to continue",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="result-panel">
        <p className="success">
          Your details have been passed to the prescreener. You can now
          continue.
        </p>
      </div>
    );
  }

  if (outcome) {
    const potentialMatch = outcome === "potentialMatch";

    return (
      <>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="result-panel">
          <h3>
            {potentialMatch
              ? "You appear to be eligible for this study"
              : "You do not appear to be eligible for this study"}
          </h3>
          <p>
            {potentialMatch
              ? "Choose a research centre to continue to the full prescreener."
              : "Based on your answers, this study is unlikely to be suitable for you."}
          </p>

          <label className="site-field">
            Research centre
            <select
              value={selectedSiteId}
              onChange={(event) => setSelectedSiteId(event.target.value)}
            >
              <option value="">Select a centre</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="error">{error}</p> : null}

          <div className="actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setOutcome(null);
                setQuestionIndex(quickCheckQuestions.length - 1);
              }}
            >
              Back
            </button>
            <button
              className="button button-primary"
              type="button"
              disabled={!selectedSiteId || submitting}
              onClick={continueToPrescreener}
            >
              {submitting ? "Continuing…" : "Continue to prescreener"}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="question-panel">
        <p className="progress-label">
          Question {questionIndex + 1} of {quickCheckQuestions.length}
        </p>
        <fieldset>
          <legend>{question.text}</legend>
          <div className="choices">
            {(["yes", "no"] as const).map((answer) => (
              <label className="choice" key={answer}>
                <input
                  type="radio"
                  name={question.id}
                  value={answer}
                  checked={currentAnswer === answer}
                  onChange={() => answerQuestion(answer)}
                />
                {answer === "yes" ? "Yes" : "No"}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="actions">
          <button
            className="button button-secondary"
            type="button"
            disabled={questionIndex === 0}
            onClick={() => setQuestionIndex((current) => current - 1)}
          >
            Back
          </button>
          <button
            className="button button-primary"
            type="button"
            disabled={!currentAnswer}
            onClick={continueQuestions}
          >
            {questionIndex === quickCheckQuestions.length - 1
              ? "See result"
              : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
