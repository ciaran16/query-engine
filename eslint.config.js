import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import path from "node:path";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintConfigPrettier,
  includeIgnoreFile(path.resolve(import.meta.dirname, ".gitignore")),
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      curly: ["error", "multi-line", "consistent"],
      eqeqeq: ["error", "smart"],
      "no-console": ["error"],
      "no-empty-function": ["error", { allow: ["constructors"] }],
      "@typescript-eslint/no-unused-vars": ["off"], // Already checked by TypeScript.
      "@typescript-eslint/strict-boolean-expressions": ["error"],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      // Require using async and await for better stack traces.
      "@typescript-eslint/return-await": ["error", "always"],
      "@typescript-eslint/promise-function-async": ["error"],
      // These are only warnings by default.
      "@typescript-eslint/explicit-module-boundary-types": ["error"],
    },
  },
);
