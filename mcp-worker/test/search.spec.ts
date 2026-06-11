import { describe, expect, it } from "vitest";
import { data } from "../src/data";
import { searchData } from "../src/search";

describe("searchData", () => {
  it("matches case-insensitively across sections", () => {
    expect(searchData(data, "JUNGIAN").total).toBeGreaterThanOrEqual(1);
    expect(searchData(data, "robot").total).toBeGreaterThanOrEqual(1);
  });

  it("returns typed hits with urls", () => {
    const result = searchData(data, "Sun Signal");
    const hit = result.results.find((r) => r.type === "app");
    expect(hit?.url).toBe("https://sunsignal.app");
  });

  it("caps results and reports the true total", () => {
    const result = searchData(data, "e");
    expect(result.results.length).toBeLessThanOrEqual(25);
    expect(result.total).toBeGreaterThanOrEqual(result.results.length);
  });

  it("returns zero results without throwing on no match", () => {
    const result = searchData(data, "xyzzyplughnope");
    expect(result).toEqual({ query: "xyzzyplughnope", total: 0, results: [] });
  });
});
