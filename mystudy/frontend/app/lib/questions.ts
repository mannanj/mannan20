export type Answer = "yes" | "no";
export type AnswerMap = Record<string, Answer>;
export type PrecheckOutcome = "potentialMatch" | "unlikelyMatch";

export type QuickCheckQuestion = {
  id: string;
  text: string;
};

export const quickCheckQuestions: QuickCheckQuestion[] = [
  {
    id: "age-range",
    text: "Are you between 18 and 74 years old?",
  },
  {
    id: "diagnosis",
    text: "Have you been diagnosed with depression?",
  },
  {
    id: "previous-treatments",
    text: "Have you tried at least two prescribed treatments for depression?",
  },
  {
    id: "current-symptoms",
    text: "Are you currently experiencing symptoms of depression?",
  },
  {
    id: "clinic-visits",
    text: "Would you be able to attend appointments at a study clinic?",
  },
];

export function calculateOutcome(answers: AnswerMap): PrecheckOutcome {
  return quickCheckQuestions.every((question) => answers[question.id] === "yes")
    ? "potentialMatch"
    : "unlikelyMatch";
}
