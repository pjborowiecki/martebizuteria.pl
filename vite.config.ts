import { defineConfig, lazyPlugins } from "vite-plus";

const ignorePatterns = [
  "node_modules",
  "dist",
  "opensrc",
  "scripts",
  ".tanstack",
  ".wrangler",
  ".vite-hooks",
  ".vscode",
  ".agents",
  "bun.lock",
  "**/*.d.ts",
  "**/*.tsbuildinfo",
  "src/routeTree.gen.ts"
];

export default defineConfig({
  build: { target: "esnext" },
  fmt: {
    arrowParens: "always",
    bracketSpacing: true,
    endOfLine: "lf",
    ignorePatterns,
    jsxSingleQuote: false,
    printWidth: 140,
    semi: true,
    singleQuote: false,
    sortImports: {
      customGroups: [
        {
          elementNamePattern: ["react", "react/**", "next", "next/**"],
          groupName: "react-and-next"
        },
        {
          elementNamePattern: ["~/src/constants", "~/src/constants/**"],
          groupName: "constants"
        },
        {
          elementNamePattern: ["~/src/providers/**"],
          groupName: "providers"
        },
        {
          elementNamePattern: ["~/src/integrations/**"],
          groupName: "integrations"
        },
        {
          elementNamePattern: ["~/src/lib/**"],
          groupName: "lib"
        },
        {
          elementNamePattern: ["~/src/components/shadcn/**"],
          groupName: "components-shadcn"
        },
        {
          elementNamePattern: ["~/src/components/custom/**"],
          groupName: "components-custom"
        },
        {
          elementNamePattern: ["~/src/components/**"],
          groupName: "components-other"
        },
        {
          elementNamePattern: ["~/src/styles/**"],
          groupName: "styles"
        }
      ],
      groups: [
        "react-and-next",
        ["builtin", "external"],
        "constants",
        "providers",
        "integrations",
        "lib",
        "components-shadcn",
        "components-custom",
        "components-other",
        "styles",
        ["internal", "parent", "sibling", "index"],
        "unknown"
      ],
      ignoreCase: true,
      newlinesBetween: true
    },
    sortTailwindcss: {
      attributes: ["className", "classList"],
      functions: ["cn", "cva"],
      stylesheet: "./src/styles/globals.css"
    },
    tabWidth: 2,
    trailingComma: "none",
    useTabs: false
  },
  lint: {
    categories: {
      correctness: "error",
      pedantic: "error",
      perf: "error",
      style: "error",
      suspicious: "error"
    },
    ignorePatterns,
    options: {
      denyWarnings: true,
      reportUnusedDisableDirectives: "error",
      typeAware: true,
      typeCheck: true
    },
    plugins: ["typescript", "react", "react-perf", "jsx-a11y", "unicorn", "import", "promise", "vitest", "oxc", "eslint"],
    rules: {
      "func-style": "off",
      "id-length": "off",
      "import/consistent-type-specifier-style": "off",
      "import/exports-last": "off",
      "import/group-exports": "off",
      "import/no-named-export": "off",
      "import/no-namespace": "off",
      "import/prefer-default-export": "off",
      "react/jsx-max-depth": ["error", { max: 5 }],
      "react/react-in-jsx-scope": "off",
      "sort-imports": "off",
      "typescript/prefer-readonly-parameter-types": [
        "error",
        {
          allow: [
            { from: "package", name: "ReactNode", package: "react" },
            { from: "package", name: "ReactNode", package: "@types/react" },
            { from: "package", name: "ClassValue", package: "clsx" },
            { from: "lib", name: "Promise" }
          ],
          ignoreInferredTypes: true,
          treatMethodsAsReadonly: true
        }
      ]
    }
  },
  plugins: lazyPlugins(async () => {
    const { cloudflare } = await import("@cloudflare/vite-plugin");
    const { tanstackStart } = await import("@tanstack/react-start/plugin/vite");
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    const { default: react } = await import("@vitejs/plugin-react");

    return [cloudflare({ viteEnvironment: { name: "ssr" } }), tailwindcss(), tanstackStart(), react()];
  }),

  resolve: { tsconfigPaths: true },
  server: { port: 3000 },
  staged: { "*": "vp check --fix" },
  test: {
    isolate: false,
    pool: "threads"
  }
});
