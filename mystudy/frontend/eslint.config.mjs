import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    settings: {
      react: { version: "19" },
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["app/lib/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "coverage/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
]);
