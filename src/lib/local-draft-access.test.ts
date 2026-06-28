import { describe, expect, test } from "bun:test";
import { canViewLocalDraft } from "./local-draft-access";

describe("local draft access", () => {
  test("allows localhost and loopback hosts in development", () => {
    expect(canViewLocalDraft({ host: "localhost:3847", nodeEnv: "development" })).toBe(true);
    expect(canViewLocalDraft({ host: "127.0.0.1:3847", nodeEnv: "development" })).toBe(true);
    expect(canViewLocalDraft({ host: "[::1]:3847", nodeEnv: "development" })).toBe(true);
  });

  test("blocks public hosts and non-development environments", () => {
    expect(canViewLocalDraft({ host: "mannan.is", nodeEnv: "development" })).toBe(false);
    expect(canViewLocalDraft({ host: "localhost:3847", nodeEnv: "production" })).toBe(false);
    expect(canViewLocalDraft({ host: null, nodeEnv: "development" })).toBe(false);
  });
});
