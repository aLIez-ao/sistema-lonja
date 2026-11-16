import js from "@eslint/js";
import globals from "globals";
import nodePlugin from "eslint-plugin-n";

export default [
  { ignores: ["**/.claude/**", "**/node_modules/**", "public/bootstrap/**", "public/chartjs/**", "public/uploads/**", "doc/**"] },
  js.configs.recommended,
  nodePlugin.configs["flat/recommended-module"],
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: { globals: globals.node },
    settings: { node: { version: ">=20" } },
    rules: {
      "no-unused-vars": "warn",
      "no-control-regex": "off",
      "n/no-process-exit": "off",
      "n/no-unpublished-import": "off",
      "n/no-unsupported-features/node-builtins": "off",
    },
  },
  {
    files: ["public/js/**/*.js"],
    languageOptions: { globals: { ...globals.browser, bootstrap: "readonly", Chart: "readonly" } },
  },
];
