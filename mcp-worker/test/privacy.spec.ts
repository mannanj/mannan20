import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { connectClient, firstText } from "./helpers";
import { data } from "../src/data";

const FORBIDDEN_PATTERNS: Array<[string, RegExp]> = [
  ["hidden episode: affiliate", /affiliate-leads-redesign/i],
  ["hidden episode: new rich", /rules-of-the-new-rich/i],
  ["unavailable article: taken", /garden\/article\/taken/i],
  ["noindex article: ai false positives", /ai-false-positives/i],
  ["jordan workspace", /\/jordan/i],
  ["access codes", /ACCESS_CODE/],
  ["personal email host", /protonmail/i],
  ["email address", /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i],
  ["phone number", /\+?1?[\s.(-]\d{3}[\s.)-]+\d{3}[\s.-]\d{4}/],
];

const NO_ARG_TOOLS = [
  "get_profile",
  "get_mission_and_goals",
  "list_experience",
  "list_writing",
  "list_readings",
  "list_apps",
  "list_research",
  "get_downloads",
  "how_to_contact",
];

let client: Client;
let everyResponse: string;

beforeAll(async () => {
  client = await connectClient();
  const outputs: string[] = [];
  for (const name of NO_ARG_TOOLS) {
    outputs.push(firstText(await client.callTool({ name, arguments: {} })));
  }
  outputs.push(firstText(await client.callTool({ name: "search", arguments: { query: "a" } })));
  everyResponse = outputs.join("\n");
});

afterAll(async () => {
  await client.close();
});

const RESPONSE_ONLY_PATTERNS: Array<[string, RegExp]> = [
  ["raw R2 keys", /portfolio\/(resume|documents)\//],
  ["raw R2 public host", /r2\.dev/],
];

describe("privacy", () => {
  it("bundled snapshot contains no gated or private content", () => {
    const snapshot = JSON.stringify(data);
    for (const [label, pattern] of FORBIDDEN_PATTERNS) {
      expect(snapshot, label).not.toMatch(pattern);
    }
  });

  it("no tool response contains gated or private content", () => {
    for (const [label, pattern] of [...FORBIDDEN_PATTERNS, ...RESPONSE_ONLY_PATTERNS]) {
      expect(everyResponse, label).not.toMatch(pattern);
    }
  });
});
