# M’Arte Jewellery

A jewellery storefront and admin application built with TanStack Start, React, TypeScript, and Cloudflare Workers. Drizzle uses D1 for the catalog, customers, checkout, and orders; Better Auth uses D1 for sessions, verification, and rate limits; product images use R2. Payments run through Stripe Checkout, email through Resend, and parcel lockers through InPost.

## Development

Use Bun and the project-local Vite+ toolchain.

```sh
vp install
cp .env.example .env.development
cp .env.example .env.preview
cp .env.example .env.production
# Configure each environment's values before using it.
bun run dev
```

The `development` Wrangler environment shares preview resources. Vite and Wrangler load the matching environment file; Bun's automatic loading is disabled in `bunfig.toml`, and Drizzle commands load their file explicitly. `VITE_*` values are browser-visible. Declare private Worker bindings in `wrangler.jsonc`.

```sh
bun run check                # Formatting, lint, and types
bun run check:fix            # Apply formatter and lint fixes
bun run lint                 # Lint and types without formatting
bun run test                 # All local regression tests
bun run test:unit            # Node test project
bun run test:integration     # In-memory database test project
bun run test:coverage        # Application coverage report
bun run build:preview        # Preview Worker build and artifact validation
bun run build:production     # Production Worker build and artifact validation
bun run typegen              # Regenerate ignored Worker declarations
bun run skills:sync          # Restore skills-lock.json into vendor groups
bun run skills:update        # Explicitly update skills, then restore their layout
```

Use `bun run start` to preview the built Worker. Install regenerates Worker types; these declarations are not checked into Git. Formatting, lint, test projects, and coverage live in `vite.config.ts`; `tsconfig.json` enables strict checking for application code and scripts.

Lint uses the React Projects and SaaSyLand baseline: correctness, nursery, pedantic, performance, style, and suspicious categories are errors, with type-aware rules and type checking. Functions are limited to 150 lines and 20 statements; files to 800 lines. SaaSyLand's scoped exceptions cover tests, test mocks, UI return types, route option ordering, and config length. Keep exceptions local to a documented framework or test requirement; fix application code instead of weakening the shared rules. Warnings and unused suppression comments fail checks.

Database commands use explicit suffixes: `db:migrate:development`, `db:migrate:preview`, `db:migrate:production`, `db:studio:preview`, and `db:introspect:production`. Migration and seed commands with `--remote` change the selected database; `db:migrate:local` uses local D1.

Deployment commands are `bun run deploy:preview` and `bun run deploy:production`. They validate bindings, build, verify the emitted Worker, and deploy with only declared application secrets. Cloudflare management credentials are excluded from the uploaded secret file. Ordinary builds, checks, and tests do not deploy or mutate remote databases.

The Better Auth upgrade requires the additive `20260920212415_auth_database_storage.sql` migration before deployment. Existing KV sessions and pending verification records are not transferred; users must sign in again and restart pending password-reset, OAuth, or two-factor flows. See [auth migration notes](src/integrations/better-auth/MIGRATION.md).

The historical migration files cannot currently bootstrap an empty database in Wrangler's filename order: `20260604232955_curved_wallow.sql` assumes a later table rename has already run. Preserve the deployed migration history; use the current schema snapshot for isolated test databases until the initial migration sequence is repaired.

## Organization

```text
messages/{en,pl}/                  Translation catalogs
public/                           Fonts, images, and other static assets
scripts/                          Skills, commit messages, build and deployment checks
.github/actions/setup/            Shared CI/deployment toolchain setup
.vite-hooks/                      Staged checks and conventional commit messages
src/
  routes/                         Flat TanStack file routes, loaders, guards, HTTP handlers
  routes.ts                       Route constants
  router.tsx                      Per-request QueryClient and SSR integration
  server.ts                       Worker entry, locale handling, WebSockets, audit queue
  integrations/{vendor}/          Provider setup, configuration, and shared adapters
  modules/{feature}/              Schema, validation, types, constants, and domain helpers
    use-cases/{verb-noun}.ts       Server functions and their native query options
  modules/_core/constants/        Shared currency and cache-key roots
  presentation/
    branding/                     Application identity and social links
    components/shadcn/            UI primitives
    components/custom/            Shared and feature UI, with local hooks/types/helpers
    emails/                       Email templates
    styles/                       Shared theme, route CSS, and critical font declarations
    theme/                        Theme and sidebar preferences and startup scripts
  providers/                      Application-wide React providers
  hooks/                          Shared hooks
  stores/                         Persisted cart state
  data/                           Marketing content and existing admin demo data
  lib/                            Shared utilities, imported directly
  platform/testing/               Shared local test infrastructure
  durable-objects/                WebSocket invalidation hub
```

Routes coordinate loading and rendering. Feature use cases export `createServerFn` functions directly, with query options beside the operation they fetch. Shared database helpers remain where several operations need the same query or write workflow. Authorization and input validation run inside the server boundary; page guards provide navigation behavior.

Query keys are readonly tuples in the owning feature’s `*.constants.ts`; integration-owned keys stay with the integration. Preserve key values when reorganizing code. Reuse query options for cache reads and prefetching, and invalidate the affected feature after mutations. The query client belongs to a router instance, so SSR requests do not share private data.

Routes declare their translation namespaces in `staticData.namespaces`. The root preloads the matched namespaces into the query cache, and the translation provider combines only the active route messages. Polish uses unprefixed URLs; English uses `/en`. Email translations load separately on the server. Add catalog files and their types in `i18n.types.ts`, then declare each namespace on the route that needs it.

Protected server operations use `getRequestSession()`, which shares a pending lookup within one HTTP request and checks stored sessions again on the next request. Route guards and server functions share this lookup without sharing sessions between requests.

Import utilities and operations from their defining files. Add a helper when it owns reusable behavior, rather than wrapping a single function call. Keep feature-specific UI and hooks together. Use `src/lib/cn.ts` for class merging.

`globals.css` owns Tailwind, theme tokens, and shared controls. Admin and storefront routes link their own stylesheets; critical font declarations remain inline in the document head.

`skills:sync` restores `skills-lock.json` into vendor groups under `.agents/skills` and links them from `.claude/skills`; both directories are ignored. Use `bun run skills:sync --local` to regroup installed skills without downloads.

Inventory reservations use version guards and compensating releases because D1 lacks interactive transactions. Durable Object WebSockets and BroadcastChannel invalidate query caches after writes. Audit events use the Worker queue and request execution context for background persistence.

Some marketing, content, coupon, and settings views use fixtures from `src/data/`.

## Verification

Tests live in local `__test__` directories. Separate `node` and `integration` projects run the existing suites; integration tests execute real SQL against in-memory SQLite through the shared D1 test adapter. External providers are mocked. Coverage includes application TypeScript, excluding generated files, shadcn primitives, and test infrastructure; reports go to `coverage/`. Browser tests and numeric coverage gates are not configured.

Vite+ loads only the React plugin during tests. Worker and Start plugins are used for application builds. Database migrations and checked-in SQL remain under `src/integrations/drizzle-orm/`.

CI uses the shared setup action and dummy `.env.test` values, then runs the same check, coverage, and preview-build scripts as local development. Both deployment workflows run `bun run check` before building or deploying, reuse setup, and supply values through GitHub environments. The pre-commit hook runs staged checks; the prepare-commit-message hook applies the references' conventional commit format.

See [AGENTS.md](./AGENTS.md) for contributor instructions and [LICENSE.md](./LICENSE.md) for licensing.
