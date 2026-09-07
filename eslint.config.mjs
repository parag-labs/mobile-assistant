import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

/** Flat ESLint config: TypeScript-aware, no-unused-vars and no-explicit-any as the guard
 *  rails the spec asks for. Kept self-contained so `eslint .` is reproducible in CI. Only the
 *  pure-TS core under src/ is linted; the Expo/React Native app files use their own toolchain. */
export default [
  { ignores: ["dist/**", "node_modules/**", ".expo/**", "expo-env.d.ts", "*.config.js", "*.config.ts", "app/**", "metro.config.js"] },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
    },
  },
];
