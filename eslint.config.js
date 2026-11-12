const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const rule = (selector, message) => ({ selector, message });
const PROCESS_ENV = rule(
  "MemberExpression[object.name='process'][property.name='env']",
  "Read configuration from @/lib/config.",
);
const DATE_NEW = rule(
  "NewExpression[callee.name='Date'][arguments.length=0]",
  "Use clock.now() from @/lib/clock.",
);
const DATE_NOW = rule(
  "CallExpression[callee.object.name='Date'][callee.property.name='now']",
  "Use clock.now() from @/lib/clock.",
);
const HEX = rule(
  "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
  "No raw colours: use tokens from @/lib/theme.",
);
const restricted = (...omit) => [
  "error",
  ...[PROCESS_ENV, DATE_NEW, DATE_NOW, HEX].filter((r) => !omit.includes(r)),
];

module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/*", ".expo/*", "node_modules/*", "docs/*", "coverage/*"] },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
      "no-empty": ["error", { allowEmptyCatch: false }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "react-hooks/exhaustive-deps": "error",
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
      "no-restricted-syntax": restricted(),
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Network calls live in @/lib/api." },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/ui/*", "@/components/ui/**"],
              message: "Import from @/components/ui.",
            },
            {
              group: ["@/features/*/*", "@/features/*/**"],
              message: "Import a feature through its index.ts.",
            },
          ],
        },
      ],
    },
  },
  { files: ["src/lib/config/env.ts"], rules: { "no-restricted-syntax": restricted(PROCESS_ENV) } },
  {
    files: ["src/lib/clock.ts"],
    rules: { "no-restricted-syntax": restricted(DATE_NEW, DATE_NOW) },
  },
  { files: ["src/lib/theme/tokens.ts"], rules: { "no-restricted-syntax": restricted(HEX) } },
  { files: ["src/lib/api/**"], rules: { "no-restricted-globals": "off" } },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "jest.setup.ts"],
    rules: {
      "no-restricted-syntax": "off",
      "no-restricted-globals": "off",
      "no-restricted-imports": "off",
      "max-lines": "off",
    },
  },
]);
