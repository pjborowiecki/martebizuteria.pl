import { defineConfig, lazyPlugins, loadEnv } from "vite-plus"

const ignorePatterns = [
  "node_modules",
  "dist",
  "coverage",
  "blob-report",
  "dist-ssr",
  "e2e",
  "playwright/.cache",
  "playwright-report",
  "test-results",
  "opensrc",
  "scripts",
  ".tanstack",
  ".wrangler",
  ".vite-hooks",
  ".vscode",
  ".agents",
  ".claude",
  ".codex",
  "bun.lock",
  "**/*.d.ts",
  "**/*.tsbuildinfo",
  "src/routeTree.gen.ts",
  "src/integrations/**/migrations/**",
]

export default defineConfig({
  build: { target: "esnext" },
  fmt: {
    arrowParens: "always",
    bracketSpacing: true,
    endOfLine: "lf",
    ignorePatterns,
    jsxSingleQuote: false,
    printWidth: 140,
    semi: false,
    singleQuote: false,
    sortImports: {
      customGroups: [
        { elementNamePattern: ["@tanstack/react-start/server-only"], groupName: "server-only" },
        { elementNamePattern: ["cloudflare:workers"], groupName: "cloudflare" },
        { elementNamePattern: ["~/src/modules/**"], groupName: "modules" },
        { elementNamePattern: ["~/src/hooks/**"], groupName: "hooks" },
        { elementNamePattern: ["~/src/platform/**"], groupName: "platform" },
        { elementNamePattern: ["~/src/routes/**"], groupName: "routes" },
        { elementNamePattern: ["~/src/types/**"], groupName: "types" },
        { elementNamePattern: ["~/src/presentation/branding/**"], groupName: "branding" },
        {
          elementNamePattern: ["react", "react/**", "react-dom", "react-dom/**"],
          groupName: "react",
        },
        {
          elementNamePattern: ["~/src/data/**", "~/src/presentation/theme/**"],
          groupName: "constants",
        },
        {
          elementNamePattern: ["~/src/providers/**"],
          groupName: "providers",
        },
        {
          elementNamePattern: ["~/src/integrations/**"],
          groupName: "integrations",
        },
        {
          elementNamePattern: ["~/src/lib/**"],
          groupName: "lib",
        },
        {
          elementNamePattern: ["~/src/presentation/components/shadcn/**"],
          groupName: "components-shadcn",
        },
        {
          elementNamePattern: ["~/src/presentation/components/custom/**"],
          groupName: "components-custom",
        },
        {
          elementNamePattern: ["~/src/presentation/components/**"],
          groupName: "components-other",
        },
        {
          elementNamePattern: ["~/src/presentation/styles/**"],
          groupName: "styles",
        },
      ],
      groups: [
        "server-only",
        "cloudflare",
        "react",
        ["builtin", "external"],
        "platform",
        "providers",
        "integrations",
        "modules",
        "routes",
        "hooks",
        "constants",
        "types",
        "lib",
        "branding",
        "components-shadcn",
        "components-custom",
        "components-other",
        "styles",
        ["internal", "parent", "sibling", "index"],
        "unknown",
      ],
      ignoreCase: true,
      newlinesBetween: true,
      sortSideEffects: true,
    },
    sortTailwindcss: {
      attributes: ["className", "classList"],
      functions: ["cn", "cva", "tw"],
      stylesheet: "./src/presentation/styles/globals.css",
    },
    tabWidth: 2,
    trailingComma: "all",
    useTabs: false,
  },
  lint: {
    categories: {
      correctness: "error",
      nursery: "error",
      pedantic: "error",
      perf: "error",
      style: "error",
      suspicious: "error",
    },
    env: { browser: true, es2024: true, node: true, worker: true },
    globals: { HTMLRewriter: "readonly", WebSocketPair: "readonly", caches: "readonly" },
    ignorePatterns,
    options: {
      denyWarnings: true,
      reportUnusedDisableDirectives: "error",
      typeAware: true,
      typeCheck: true,
    },
    overrides: [
      {
        files: ["src/**/*.test.{ts,tsx}", "src/**/__test__/**", "src/platform/testing/**"],
        rules: {
          "no-await-in-loop": "off",
          "no-magic-numbers": "off",
          "unicorn/no-null": "off",
        },
      },
      {
        files: ["src/presentation/**", "src/hooks/**"],
        rules: { "typescript/consistent-return": "off" },
      },
      {
        files: ["src/platform/testing/mocks/**"],
        rules: { "require-await": "off", "typescript/require-await": "off" },
      },
      {
        files: ["src/routes/**"],
        rules: { "sort-keys": "off" },
      },
      {
        files: ["vite.config.ts"],
        rules: {
          "max-lines": "off",
        },
      },
    ],
    rules: {
      "id-length": ["error", { exceptions: ["_", "m", "t"], properties: "never" }],
      "max-lines": ["error", { max: 800 }],
      "max-lines-per-function": ["error", { max: 150 }],
      "max-statements": ["error", { max: 20 }],
      "new-cap": ["error", { properties: false }],
      "no-magic-numbers": ["error", { ignore: [-1, 0, 1], ignoreArrayIndexes: true, ignoreDefaultValues: true, ignoreTypeIndexes: true }],
      "no-ternary": "off",
      "no-underscore-dangle": ["error", { allow: ["_splat", "__executeServer"] }],
      "one-var": ["error", "never"],
      "sort-imports": ["error", { ignoreDeclarationSort: true }],
      "typescript/only-throw-error": [
        "error",
        {
          allow: [
            { from: "package", name: "NotFoundError", package: "@tanstack/router-core" },
            { from: "package", name: "Redirect", package: "@tanstack/router-core" },
          ],
        },
      ],
      "typescript/prefer-readonly-parameter-types": "off",
      "unicorn/no-useless-undefined": ["error", { checkArguments: false }],
    },
  },
  plugins:
    lazyPlugins(async () => {
      const { default: react } = await import("@vitejs/plugin-react")

      if (process.env["VITEST"] === "true") {
        return [...react()]
      }

      const { cloudflare } = await import("@cloudflare/vite-plugin")
      const { tanstackStart } = await import("@tanstack/react-start/plugin/vite")
      const { default: tailwindcss } = await import("@tailwindcss/vite")

      return [
        ...cloudflare({
          inspectorPort: false,
          remoteBindings: process.env["CLOUDFLARE_ENV"] === "development",
          viteEnvironment: { name: "ssr" },
        }),
        ...tailwindcss(),
        ...tanstackStart({
          router: {
            codeSplittingOptions: {
              defaultBehavior: [["component"], ["loader"], ["errorComponent"], ["notFoundComponent"]],
            },
            routeFileIgnorePattern: "__test__",
          },
        }),
        ...react(),
      ]
    }) ?? [],

  resolve: { tsconfigPaths: true },
  server: { port: 3000, strictPort: true, watch: { ignored: ["**/coverage/**"] } },
  staged: { "*": "vp check --fix" },
  test: {
    coverage: {
      clean: true,
      exclude: [
        "**/*.{test,spec}.{ts,tsx}",
        "**/__test__/**",
        "**/*.d.ts",
        "src/routeTree.gen.ts",
        "src/presentation/components/shadcn/**",
        "src/platform/testing/**",
      ],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
    },
    env: loadEnv("test", import.meta.dirname, ""),
    environment: "node",
    exclude: ["node_modules/**", "opensrc/**", "dist/**", "scripts/**", "e2e/**", "src/integrations/drizzle-orm/migrations/**"],
    isolate: true,
    passWithNoTests: false,
    pool: "threads",
    projects: [
      {
        extends: true,
        test: {
          exclude: ["src/**/*.integration.test.{ts,tsx}"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          name: "node",
        },
      },
      {
        extends: true,
        test: {
          include: ["src/**/*.integration.test.{ts,tsx}"],
          name: "integration",
        },
      },
    ],
  },
})
