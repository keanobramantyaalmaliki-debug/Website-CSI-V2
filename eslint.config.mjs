import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

// Vite + React 19 project (not Next.js) — flat config replacing the leftover
// eslint-config-next scaffold, which crashed lint (package not installed).
export default defineConfig([
  globalIgnores(["dist/**", "build/**", "coverage/**"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // Classic, stable hook rules only. The v7 `recommended` preset also pulls
      // in experimental React-Compiler rules (immutability/refs/purity) that
      // flag untouched R3F + billiard internals we deliberately don't modify.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // warn (not error): the only offenders are pre-existing dead symbols in
      // untouched R3F/billiard files (principle: don't modify 3D internals).
      // Kept visible as debt without blocking lint.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);
