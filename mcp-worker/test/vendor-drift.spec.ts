/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import vendoredGrant from "../src/vendor/grant.ts?raw";
import vendoredConnections from "../src/vendor/connections.ts?raw";

/**
 * src/vendor/{grant,connections}.ts are generated copies of ~/Documents/mcp-grant/src
 * (node bin/sync.mjs mcp-worker/src/vendor). Where the source package is checked
 * out next to this repo, the copies must match it byte for byte after the banner.
 * Elsewhere (CI without the sibling repo) the comparison is skipped; the banner
 * check still runs.
 */
const SOURCE = import.meta.glob("../../../mcp-grant/src/*.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const source = (name: string) => SOURCE[`../../../mcp-grant/src/${name}`];
const body = (text: string) => text.split("\n").slice(2).join("\n");

describe.each([
  ["grant.ts", vendoredGrant],
  ["connections.ts", vendoredConnections],
])("vendor/%s", (name, vendored) => {
  it("carries the generated banner", () => {
    expect(vendored.startsWith(`// GENERATED FROM @mannan/mcp-grant/${name} - DO NOT EDIT HERE.`)).toBe(true);
  });

  it.skipIf(!source(name))("matches the mcp-grant source", () => {
    expect(body(vendored)).toBe(source(name));
  });
});
