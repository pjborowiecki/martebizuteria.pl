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
    overrides: [
      {
        files: ["src/components/shadcn/label.tsx"],
        rules: {
          "jsx-a11y/label-has-associated-control": "off"
        }
      },
      {
        files: ["src/components/shadcn/pagination.tsx"],
        rules: {
          // The <a> is a Base UI render slot — children are injected by the parent component
          "jsx-a11y/anchor-has-content": "off"
        }
      },
      {
        files: ["src/components/custom/landing/**/*.{ts,tsx}"],
        rules: {
          "jest/require-hook": "off",
          "max-lines": "off",
          "max-lines-per-function": "off",
          "max-statements": "off",
          "no-magic-numbers": "off",
          "react-perf/jsx-no-new-object-as-prop": "off",
          "react/jsx-max-depth": "off",
          "sort-keys": "off"
        }
      }
    ],
    plugins: ["typescript", "react", "react-perf", "jsx-a11y", "unicorn", "import", "promise", "vitest", "oxc", "eslint"],
    rules: {
      "capitalized-comments": "off",
      "consistent-return": "off",
      "func-style": "off",
      "id-length": "off",
      "import/consistent-type-specifier-style": "off",
      "import/exports-last": "off",
      "import/group-exports": "off",
      "import/max-dependencies": "off",
      "import/no-named-export": "off",
      "import/no-namespace": "off",
      "import/prefer-default-export": "off",
      "max-lines": ["error", { max: 800 }],
      "max-lines-per-function": ["error", { max: 150 }],
      "max-statements": ["error", { max: 20 }],
      "no-ternary": "off",
      "react/jsx-max-depth": ["error", { max: 5 }],
      "react/jsx-props-no-spreading": "off",
      "react/react-in-jsx-scope": "off",
      "sort-imports": "off",
      "typescript/prefer-readonly-parameter-types": "off"
    }
  },
  plugins: lazyPlugins(async () => {
    const { tanstackStart } = await import("@tanstack/react-start/plugin/vite");
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    const { default: react } = await import("@vitejs/plugin-react");

    if (process.env.VITEST !== undefined) {
      return [tailwindcss(), tanstackStart(), react()];
    }

    const { cloudflare } = await import("@cloudflare/vite-plugin");

    return [cloudflare({ viteEnvironment: { name: "ssr" } }), tailwindcss(), tanstackStart(), react()];
  }),

  resolve: { tsconfigPaths: true },
  server: { port: 3000 },
  staged: { "*": "vp check --fix" },
  test: {
    exclude: ["node_modules/**", "opensrc/**", "dist/**", "scripts/**"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    isolate: false,
    passWithNoTests: true,
    pool: "threads"
  }
});
