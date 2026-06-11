import { describe, expect, it } from "vitest";
import { data } from "../src/data";

function corpus(): string {
  const texts: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") texts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk({
    profile: data.profile,
    narrative: data.narrative,
    experience: data.experience,
    extracurriculars: data.extracurriculars,
    writing: data.writing,
    readings: data.readings,
    apps: data.apps,
    research: data.research,
  });
  return texts.join("\n");
}

describe("derived goals honesty", () => {
  const siteText = corpus();

  it("has 7 goals, each with a mannan.is source url and a quote", () => {
    expect(data.goals).toHaveLength(7);
    for (const goal of data.goals) {
      expect(goal.source.url).toMatch(/^https:\/\/mannan\.is/);
      expect(goal.source.quote.length).toBeGreaterThan(5);
    }
  });

  it("every goal quote appears verbatim in the site data", () => {
    for (const goal of data.goals) {
      expect(siteText, goal.statement).toContain(goal.source.quote);
    }
  });
});
