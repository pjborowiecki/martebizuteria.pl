# M'Arte Jewellery

Source code for the M'Arte storefront, checkout, customer account area, and admin console. One TanStack Start application — localized storefront, Stripe checkout, order fulfilment, catalog management, audit log and realtime cache invalidation — deployed as a single Cloudflare Worker.

The interesting part of this codebase is not that it sells jewellery. It is that it does so on a runtime with no filesystem, no Node server, no multi-statement database transactions, and a hard limit on how long a request may live. Most of the decisions below exist because of those constraints.

Everything deeper than this file lives in the documentation site at [`/docs`](#documentation), written in English and Polish and served by the application itself.

## Contents

- [Features and implementation status](#features-and-implementation-status)
- [Documentation](#documentation)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Configuration and integrations](#configuration-and-integrations)
- [Project structure and conventions](#project-structure-and-conventions)
- [Problems worth talking about](#problems-worth-talking-about)
- [Engineering standards](#engineering-standards)
- [Commands and verification](#commands-and-verification)
- [Database and deployment](#database-and-deployment)
- [Localization and content](#localization-and-content)
- [Performance and first paint](#performance-and-first-paint)
- [Known gaps](#known-gaps)
- [Contributing](#contributing)
- [Licensing](#licensing)

## Features and implementation status

This is a working application under active development, not a finished product. A rendered admin screen does not necessarily have a persistent backend workflow, so the table states which is which.

| Area                     | Current implementation                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Storefront catalog       | Products, variants, options, categories, collections and attributes from D1. Localized search, faceted filtering, sorting and pagination. Product, category and collection detail pages by handle.                             |
| Cart                     | Server-backed cart and cart items, availability re-checks against live inventory, and a cross-tab availability banner.                                                                                                         |
| Checkout                 | Four steps (contact, billing address, delivery, payment) with lazily loaded step components, a persisted draft, a discount code field, Stripe Payment Element, and webhook-driven fulfilment.                                  |
| Payments and fulfilment  | Stripe Checkout Sessions, `/api/webhooks/stripe` with signature verification, idempotent order placement, inventory reservation with compensation, refunds with restock on full refund.                                        |
| Customer accounts        | Better Auth email/password with required verification, GitHub and Google sign-in, two-factor auth with backup codes, password change and recovery, multi-session, order history, addresses, active sessions and login history. |
| Transactional email      | Resend with React Email templates: verify email, change email, reset password, account deleted, order confirmation, order shipped. Previewable at `/dev/emails`.                                                               |
| Admin catalog            | Products, variants, categories, collections and attributes: permission-checked CRUD, reordering, localized content editing, R2 image upload, stats cards, product CSV export.                                                  |
| Admin orders             | Database-backed list and detail page with tabs, filters, stats and CSV export, plus fulfil, ship with tracking, mark delivered, cancel and refund actions, webhook-flagged disputes, audit trail and shipment email.           |
| Discounts                | Percentage, fixed-amount and free-shipping codes with date, usage, per-customer and minimum-order limits, applied to the Stripe Checkout Session as a one-off coupon and managed at `/admin/coupons`.                          |
| Admin customers          | Database-backed customer list and detail, order counts and spend aggregates.                                                                                                                                                   |
| Audit log                | Cloudflare Queue producer/consumer, 37 typed recorder functions over a 38-entry action catalogue, admin list with category and date filters.                                                                                   |
| Realtime invalidation    | Durable Object fan-out hub per audience, WebSocket subscriptions for 14 admin and 11 storefront query prefixes, `BroadcastChannel` mirroring across tabs.                                                                      |
| Documentation and legal  | Fumadocs-backed `/docs` with 98 pages per locale. The privacy policy and exchanges-and-returns pages are Markdown in the D1 `content_page` table, edited with MDXEditor at `/admin/content`.                                   |
| Scaffolded, not finished | InPost parcel-locker discovery only (no shipments or labels).                                                                                                                                                                  |
| Fixture-backed screens   | `/admin/marketing`, `/admin/settings` and the blog render from `src/data/`, not the database.                                                                                                                                  |
| Not present              | End-to-end/browser tests, scheduled or cron jobs, a dead-letter queue, and error reporting.                                                                                                                                    |

The built-in roles are `admin` and `customer`; new accounts receive `customer`. See [Known gaps](#known-gaps) for the specifics behind the last three rows.

## Documentation

The application serves its own documentation at `/docs`, in English (`en-US`) and Polish (`pl-PL`). Source MDX lives in [`content/docs/`](content/docs) as `slug.{locale}.mdx` with `meta.{locale}.json` navigation, and is compiled by Fumadocs through `bun run content`.

| Section           | Covers                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `project`         | What the project is, its status, and how the repository is organized.                             |
| `getting-started` | Prerequisites, installation, environment variables, first run, preview deployment, scripts.       |
| `architecture`    | Layering, dependency rules, request lifecycle, security model, i18n, realtime, testing, caching.  |
| `features`        | One page per user-facing area: catalog, cart, checkout, inventory, orders, account, audit, email. |
| `guides`          | Task recipes — adding a module, a use case, a route, a migration, an email, a locale.             |
| `integrations`    | Per-vendor notes for Better Auth, Stripe, Drizzle/D1, Resend, R2, InPost, use-intl, TanStack.     |
| `ui`              | Presentation layer, shadcn baseline, theming, data grid, motion.                                  |
| `tooling`         | Vite+, formatter and lint configuration, testing, CI, deployment scripts.                         |
| `reference`       | Schema, query keys, routes, environment, error codes, audit actions.                              |

This README is the operational summary. The docs site is the reference; when the two disagree, the code wins and both should be corrected.

## Technology

| Responsibility           | Implementation                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Application and routing  | React 19, TypeScript, TanStack Start and Router with locale URL rewriting                             |
| Toolchain                | Bun 1.4.0 and Vite+ — dev server, build, format, lint, type check and tests from one `vite.config.ts` |
| Hosting                  | Cloudflare Workers with smart placement and observability enabled                                     |
| Storage                  | D1 (SQLite) for all application data, R2 for media, KV declared as `CACHE`, static assets binding     |
| Coordination             | Durable Object (`RealtimeInvalidationHub`) and a Cloudflare Queue for the audit log                   |
| Database access          | Drizzle ORM, `drizzle-zod`, and checked-in SQLite migrations applied by Wrangler                      |
| Auth and authorization   | Better Auth (admin, anonymous, multi-session, two-factor plugins) with D1 as the sole store           |
| Data and forms           | TanStack Query and Table, React Hook Form with Zod resolvers, `nuqs` for URL state, Zustand           |
| UI                       | Tailwind CSS 4, shadcn-styled components over Base UI, Lucide icons, Recharts, Embla, Vaul, Sonner    |
| Motion and scrolling     | GSAP with `@gsap/react`, Lenis smooth scroll synchronized with the router                             |
| Localization and content | `use-intl` with ICU messages split by namespace, Fumadocs and MDX for docs, MDXEditor for legal pages |
| External services        | Stripe for payments, Resend for email, InPost for parcel-locker lookup, MapLibre for locker maps      |
| Verification             | Vite+/Vitest with node, integration and jsdom component projects; Testing Library                     |

[`package.json`](package.json) and [`bun.lock`](bun.lock) define the toolchain. Vite and Vitest are pinned through `overrides` to the Vite+ release-candidate core, so use the repository scripts rather than globally installed binaries.

## Getting started

### Prerequisites

- **Bun 1.4.0**, matching `packageManager` and the CI setup action.
- **Node.js 24**, matching `voidzero-dev/setup-vp` in CI. Node's `node:sqlite` also backs the integration test harness.
- The `vp` CLI from Vite+. `bun install` runs `vp config --no-agent` during `prepare`.
- A Cloudflare account with access to the project's D1, R2, KV, Queue and Durable Object bindings, plus Stripe and Resend credentials. The development server talks to **remote** resources; there is no fully offline mode.

### Install

```sh
bun install
```

The `postinstall` script runs `bun run typegen`, which regenerates `src/types/worker-configuration.d.ts` from `wrangler.jsonc` and compiles Fumadocs content into `.source/`. Neither is committed. If you install with `--ignore-scripts`, run `bun run typegen` yourself before type checking.

### Configure the environment

```sh
cp .env.example .env.development
openssl rand -base64 48        # use as AUTH_SECRET
```

Fill in the values described under [environment variables](#environment-variables). Bun's automatic `.env` loading is disabled in [`bunfig.toml`](bunfig.toml) (`env = false`), so every command states its environment explicitly: Vite and Wrangler load the file matching the selected mode, and the Drizzle scripts opt in with `--env-file`.

`.env.test` is committed and contains dummy values. It is what CI copies over `.env.development` and `.env.preview` so that checks and builds can run without real credentials.

### Apply migrations and run the dev server

```sh
bun run db:migrate:development
bun run dev
```

The server listens on <http://localhost:3000> with `strictPort` enabled. The `dev` script sets `CLOUDFLARE_ENV=development` before `vp dev --mode development`, and the Cloudflare Vite plugin enables `remoteBindings` **only** when that variable equals `development` — so local development reads and writes the real remote D1, R2, KV and Queue.

> **The `development` and `preview` Wrangler environments bind the same D1 database.**
>
> Both declare `database_name: "martebizuteria-preview"` and `database_id: 1660d0df-fff9-463b-bbc6-dec65f754302`, the same `CACHE` KV namespace `d6727c712d3443cc9e79be1bf42a6f0c`, the same `martebizuteria` R2 bucket, and the same `martebizuteria-audit-log-preview` queue. Only `production` has its own D1 database (`2bf4f35e-0a01-43c0-8a10-df5cc84ceb89`) and KV namespace; it still shares the R2 bucket.
>
> Consequences: local development writes land in the preview database that the deployed preview Worker serves. `db:migrate:development` and `db:migrate:preview` apply to the same database. Anything you delete while developing is deleted from preview. If you need isolation, create your own D1 database and point the `development` environment at it.

To exercise the Stripe webhook locally, forward events to the running server:

```sh
bun run stripe:listen
```

`STRIPE_WEBHOOK_SECRET` must match the secret the Stripe CLI prints, otherwise `/api/webhooks/stripe` rejects the delivery.

### Bootstrap an admin account

There is no admin seed. Sign up through `/auth/sign-up`, verify the email (Resend must be configured, because `requireEmailVerification` is enabled), then set that row's `user.role` to `admin` in the target database with Drizzle Studio or `wrangler d1 execute`:

```sh
bun run db:studio:development
```

After sign-in, the `/auth` route guard sends an `admin` user to `/admin` and a `customer` to `/account/overview`, unless the sign-in URL carries a same-site `?redirect` path.

## Configuration and integrations

### Environment files

Use `.env.development`, `.env.preview` and `.env.production`, matching the Wrangler environments and Vite modes of the same names. They are gitignored; [`.env.example`](.env.example) lists every key. Only `VITE_`-prefixed values reach browser code — never prefix a credential.

| Variable                                                                     | Purpose                                                                                                         |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `VITE_R2_URL`                                                                | Public base URL for R2-hosted media. Browser-visible and also declared as a Worker secret.                      |
| `VITE_STRIPE_PUBLISHABLE_KEY`                                                | Stripe publishable key used by the Payment Element.                                                             |
| `AUTH_SECRET`                                                                | Better Auth signing secret. Generate a distinct value per environment.                                          |
| `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`                         | GitHub OAuth application credentials.                                                                           |
| `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`                         | Google OAuth application credentials.                                                                           |
| `RESEND_API_KEY`, `RESEND_EMAIL_FROM`                                        | Resend API key and a sender address your Resend account accepts.                                                |
| `STRIPE_SECRET_KEY`                                                          | Stripe server key used for intents, refunds and customer operations.                                            |
| `STRIPE_WEBHOOK_SECRET`                                                      | Secret used to verify `/api/webhooks/stripe` deliveries.                                                        |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, `CLOUDFLARE_ACCESS_TOKEN` | Drizzle Kit credentials for Studio, introspect and push over the D1 HTTP API. **Never uploaded to the Worker.** |
| `SENTRY_AUTH_TOKEN`                                                          | Declared in `.env.example` only. No error reporting is wired; nothing in `src/` reads it.                       |

Server code reads secrets through `env` from `cloudflare:workers`. The ten keys listed in `secrets.required` for each environment in [`wrangler.jsonc`](wrangler.jsonc) are the authoritative deployment list: `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`, `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `VITE_R2_URL`. [`scripts/prepare-deploy-secrets.ts`](scripts/prepare-deploy-secrets.ts) uploads exactly those and fails if one is missing, which keeps the Cloudflare management credentials out of the Worker.

### Domains and branding

The canonical URL is configured in source, not in an environment file. Rebuild after changing any of these.

| Location                                                                         | What to configure                                                                                                                |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [`src/presentation/branding/app.ts`](src/presentation/branding/app.ts)           | `APP_DOMAIN` (`martebizuteria.pl`), the derived `APP_URL`, `APP_NAME`, icon, OG image dimensions, theme colour, R2 fallback URL. |
| [`src/presentation/branding/business.ts`](src/presentation/branding/business.ts) | Legal name, NIP/REGON, postal address, phone, contact email and opening hours used in structured data and legal pages.           |
| [`src/presentation/branding/socials.ts`](src/presentation/branding/socials.ts)   | Social profile links.                                                                                                            |
| [`src/modules/_core/constants/api.ts`](src/modules/_core/constants/api.ts)       | `appHostsForMode` — the hosts Better Auth accepts per mode, and `isLocalMode`, which also controls secure cookies.               |
| [`wrangler.jsonc`](wrangler.jsonc)                                               | Worker names per environment and every binding id.                                                                               |
| [`src/presentation/styles/`](src/presentation/styles)                            | Theme tokens, typography, font declarations, and the storefront/admin stylesheet split.                                          |
| [`public/`](public)                                                              | `favicon.svg`, `og.png`, `llms.txt`, `_headers`, self-hosted fonts, screenshots and video.                                       |

`appHostsForMode` currently allows `preview.martebizuteria.pl` plus `martebizuteria-preview.pjborowiecki.workers.dev` for preview, `martebizuteria.pl` plus `martebizuteria.pjborowiecki.workers.dev` for production, and `localhost:3000`/`127.0.0.1:3000` for development and test. Adding a host means editing that file — an unknown host makes Better Auth reject the request.

### Provider setup

- **GitHub and Google OAuth.** Callback URLs are `https://<host>/api/auth/callback/github` and `https://<host>/api/auth/callback/google`. Account linking is enabled with `github` and `google` as trusted providers, and OAuth tokens are encrypted at rest.
- **Resend.** Configure the API key and a verified sender before testing sign-up, because `requireEmailVerification` blocks sign-in until the address is verified. Templates live in [`src/presentation/emails/`](src/presentation/emails) and are previewable at `/dev/emails`.
- **Stripe.** Create the webhook endpoint at `https://<host>/api/webhooks/stripe` and store its signing secret. Handlers live in [`src/integrations/stripe/stripe.webhooks.tsx`](src/integrations/stripe/stripe.webhooks.tsx) and cover payment success, failure, refund and `checkout.session.expired`.
- **R2.** Admin media upload writes to the `IMAGES` binding with a one-year immutable `Cache-Control`. Reads go through the public `VITE_R2_URL`, so the bucket needs public access or a custom domain.
- **InPost.** [`src/integrations/inpost/inpost.api.ts`](src/integrations/inpost/inpost.api.ts) calls the public points API by city to power locker selection during checkout. It needs no credentials, and it creates no shipments and prints no labels.
- **Cloudflare Queue and Durable Object.** Both are declared per environment in `wrangler.jsonc`. The queue needs to exist before deploying; `scripts/verify-bindings.ts` refuses a configuration whose producer queue has no matching consumer.

## Project structure and conventions

```text
content/
  docs/                       Localized MDX documentation (98 pages per locale) and meta.{locale}.json
messages/{locale}/            48 JSON namespace files per locale
public/                       Fonts, favicon, OG image, llms.txt, _headers, screenshots, video
scripts/                      verify-bindings, verify-build, prepare-deploy-secrets, sync-skills, commit-msg
src/
  server.ts                   Worker entry: sitemap, robots, WebSocket upgrades, locale redirect, queue consumer
  router.tsx                  Per-request QueryClient, SSR integration, locale rewrite, default components
  routes.ts                   Route constants shared by links, guards and head metadata
  routes/                     65 locale-free file routes + 2 API handlers
  modules/{feature}/          39 domain modules — schema, Zod, types, constants, utils
    *.accessors.ts              unauthenticated data access (reads and writes), 18 files
    use-cases/*.ts              createServerFn + validation + authorization + query/mutation options, 108 files
  modules/_core/              Shared error codes, HTTP statuses, currency, pagination, CSV, column filters
  integrations/{vendor}/      14 vendors: better-auth, stripe, drizzle-orm, resend, cloudflare-r2, inpost, use-intl,
                                fumadocs, mdxeditor, tanstack-query, realtime-invalidation, gsap, lenis, react-day-picker
  presentation/               1170 files — shadcn baseline (58), feature UI, data grid, emails, styles, theme, branding
  durable-objects/            RealtimeInvalidationHub
  providers/                  Theme and translation providers
  hooks/                      Shared React hooks
  lib/                        background (ALS + waitUntil), cookie, image, rate-limit, request, seo, url
  data/                       Fixtures still backing unfinished admin screens and the blog
  platform/testing/           D1-shaped transport over node:sqlite, server-function driver, render and message helpers
  types/                      Generated Worker declarations, router and Vite ambient types
```

Routes coordinate loading and rendering. Business operations live in modules. The split that does the most work is **`accessors` vs `use-cases`**: accessors are plain data access with no notion of who is asking; use cases wrap them in `createServerFn`, attach the `authorized()` middleware, validate input with the module's Zod schema, and export the TanStack Query `queryOptions`/`mutationOptions` next to the operation they fetch.

That has two consequences worth stating. A loader and the component that later refetches share one query key and one fetcher by construction, because both import the same exported options. And there is exactly one layer where authorization can be forgotten — which is the layer the tests target.

Conventions that are enforced rather than suggested:

- **Import from the defining file.** There are no barrel files and no constant bags. The formatter's 17 custom import groups give every file a layer-named import order automatically, so a misplaced dependency is visible in the diff.
- **Query and mutation keys are readonly tuples** owned by the feature's `*.constants.ts`. Inputs that change the result belong in the key. Invalidate only what a mutation changes.
- **Server-only code is marked.** Files that must never reach the client import `@tanstack/react-start/server-only` or are named `*.server.ts`. `scripts/verify-build.ts` fails the build if a client asset still imports `cloudflare:workers` or a `node:*` module.
- **No comments in TypeScript or TSX.** Intent is expressed through names and types. Prose belongs in `content/docs`.
- **Tests sit beside their owner** in `__test__/` directories, which the router's `routeFileIgnorePattern` excludes from route generation.

Authentication and authorization entry points are in [`src/integrations/better-auth/`](src/integrations/better-auth):

| File                  | Responsibility                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `auth.server.ts`      | Better Auth configuration: adapter, providers, plugins, rate-limit rules, database hooks, email sends. |
| `auth.access.ts`      | Roles, the permission statement matrix, `hasAdminAccess` and `hasPermission`.                          |
| `auth.middleware.ts`  | `withRequest`, `authorized(permission?)`, `withRateLimit` — the server-function trust boundary.        |
| `auth.session.ts`     | Per-request session memoization, the client session query options and `clearCacheOnUserChange`.        |
| `auth.routes.ts`      | `requireSignedIn`, `requireAdmin`, `requireCustomer`, `redirectIfSignedIn` and post-auth redirects.    |
| `auth.client.ts`      | Browser auth client with the matching plugin set.                                                      |
| `auth.constraints.ts` | Password length bounds shared by the server config and the Zod schemas.                                |
| `auth.errors.ts`      | Maps Better Auth API error codes to translation keys.                                                  |

## Problems worth talking about

### Consistency without transactions

D1 has no interactive transactions. `db.batch()` is atomic, but anything that must read, decide, then write cannot be one statement — so the usual "wrap it in a transaction" answer is unavailable.

**Inventory reservation uses optimistic concurrency.** The reserve path is a prepared compare-and-set `UPDATE` guarded on both the row `version` read during validation and `quantityAvailable >= qty`, using `.returning()` length as the success signal. Overselling is prevented by that `gte` predicate rather than by locking. Multi-line carts reserve concurrently and compensate: if any line fails its guard, the already-succeeded reservations are released before the error propagates. Release itself is clamped in SQL — `min(quantityReserved, qty)` and `max(0, quantityReserved - qty)` — so a double release cannot create stock.

The compensation is **best-effort and deliberately documented as such**: its own failure is caught and logged, so a failed rollback leaves stock reserved. The honest description of this design is a saga with a known hole, not a distributed transaction.

**Checkout idempotency is layered, because the application guard alone cannot be atomic.** `resolvePendingCheckout` refuses to act unless the checkout row still reads `pending`, which collapses Stripe's _sequential_ retries. That read and the fulfil batch are separate round-trips, so two genuinely concurrent deliveries can both pass it — necessary, but not sufficient.

The constraint that actually holds is in the database. [`20260924120000_checkout_idempotency_constraints.sql`](src/integrations/drizzle-orm/migrations/20260924120000_checkout_idempotency_constraints.sql) creates `order_checkoutId_unique` on `order.checkout_id` and `payment_transactionId_unique` on `payment.transaction_id`. A batch is atomic on D1, so the losing delivery's `INSERT` violates the index and the whole batch rolls back, leaving exactly one order. The status flip additionally carries `WHERE status = 'pending'`. The integration suite drives two deliveries that both observe `pending` and asserts one order results; removing the unique index makes that test fail.

### Authorization lives at the RPC boundary

A server function is a public HTTP endpoint. It is reachable whether or not the route that normally calls it was ever loaded, so a route guard cannot protect it.

Route `beforeLoad` guards exist here and are honest about their job: `requireSignedIn`, `requireAdmin` and `requireCustomer` redirect, for navigation UX, and they also run client-side. The actual boundary is the `authorized()` middleware, applied to **83 server functions**. It resolves the session, throws `AppError(UNAUTHORIZED)` when there is none, and — for the 62 calls that pass a permission — throws `AppError(FORBIDDEN)` unless the role's compiled Better Auth access-control role authorizes that statement. The remaining 21 require only an authenticated session. The statement matrix in `auth.access.ts` is the real authorization source, not decoration: `product` splits `create`/`read`/`update`/`delete`/`publish`, `order` splits `read`/`update`/`refund`, `content` splits `read`/`update`, `settings` has `manage`, and `user` inherits Better Auth's admin statements.

Customer-facing reads take a different route: **ownership predicates compiled into the SQL**, `eq(order.userId, session.user.id)` in the `WHERE` clause rather than a fetch-then-filter. A foreign order id returns no row, which makes IDOR structurally absent rather than conventionally avoided.

The authorization tests compile the Drizzle condition with `SQLiteSyncDialect` and assert the exact generated SQL and bound parameters. A refactor that drops an ownership predicate fails the suite instead of silently widening access. Catalog read endpoints are table-driven to assert they reject _before_ their query mock is touched.

### Session freshness versus per-request cost

Better Auth is configured with a 300-second signed cookie cache, and every server-side session read then passes `disableCookieCache: true` and hits D1 anyway. That looks contradictory; it is a deliberate trade.

The cost is one D1 read per HTTP request. The benefit is that a banned or signed-out user cannot ride a cached cookie for five minutes. To stop that becoming N reads, `getRequestSession` memoizes the in-flight promise in a `WeakMap` keyed on the `Request` object — not a module global, which is what makes it safe in a Worker isolate serving many requests concurrently. Loaders, middleware and server functions within one request share a lookup; a new request always revalidates.

The browser's copy is revalidated the same way. Route guards and components share one TanStack Query entry, `getCurrentSessionQuery`, filled by the `getCurrentSession` server function through `getRequestSession` rather than by Better Auth's `useSession` and its `/api/auth/get-session` endpoint, and the server render of a guarded page dehydrates it into the HTML. What can lag is that cached copy: it stays fresh for 60 seconds and does not refetch on window focus or reconnect, so open storefront chrome can show a revoked session as signed-in until something refetches it. A navigation into `/account` or `/admin` always re-checks. A change of user is handled in one place: `clearCacheOnUserChange`, which `getRouter` installs in the browser only, watches the query cache and, whenever the session switches to a different user, removes every cached query except the session itself and the translation catalogues. Sign-out is a full page load, which discards the cache. What reaches the browser is projected — `toClientSession` destructures `session.token` away before returning.

D1 is the sole auth store: `storeSessionInDatabase`, `storage: "database"` for rate limiting, and `storeInDatabase` with hashed identifiers for verification tokens. No `secondaryStorage` is configured. KV was rejected for sessions, verification tokens and rate-limit counters because it is eventually consistent and cannot do the atomic consume-and-increment those need. That choice is pinned by a test asserting the option is absent.

Rate limiting is itself one atomic statement: an `INSERT … ON CONFLICT DO UPDATE` whose `set` resets or increments the counter depending on whether the window has elapsed, with `setWhere` admitting the request only while under the limit, and `.returning()` length as the verdict. If the storage throws, the request is **rejected** rather than admitted. Client identity comes from `cf-connecting-ip`, which Cloudflare sets and a client cannot forge.

### Background work on a runtime that kills floating promises

A promise still pending when a Worker returns its response is terminated. Better Auth's `advanced.backgroundTasks` hooks and the domain layer's audit recorders have no access to the `ExecutionContext`, and threading `ctx` through every call site would be invasive.

[`src/server.ts`](src/server.ts) enters an `AsyncLocalStorage` carrying `waitUntil` around the framework handler, and `scheduleBackgroundWork` pulls it back out at arbitrary depth. When no store exists — the queue consumer, unit tests, the paths that short-circuit before the ALS — it degrades to a fire-and-forget wrapped in a `catch`, so failures are logged rather than silently dropped.

Audit events are enqueued to `AUDIT_LOG_QUEUE` rather than written inline, with ids and timestamps minted at enqueue time so ordering survives batching (`max_batch_size: 50`, `max_batch_timeout: 5`, `max_retries: 3`). 37 typed recorder functions cover a 38-entry action catalogue across all seven declared categories.

### Realtime cache invalidation

Admin dashboards go stale the moment a second person is working. Polling is the usual answer and it is wasteful.

A Durable Object acts as a connection fan-out hub — one object per audience, addressed by name (`admin`, `storefront`). The upgrade handshake reaches it via `fetch`, because a WebSocket upgrade has no choice, but invalidations use a **native RPC method**, `hub.notifyInvalidation(prefixes)`, avoiding Request/Response construction on the hot path. The hub holds no durable state; it is a broadcaster, not a store.

Matching is a **symmetric prefix overlap** — deliberately broader than TanStack Query's one-directional prefix match — so a narrowly-scoped publish still invalidates the coarser prefix a tab subscribed to. Clients subscribe to a fixed prefix list (14 admin keys, 11 storefront keys, both declared in `realtime-invalidation.subscriptions.ts` and `satisfies readonly QueryKey[]`); the hub broadcasts to the audience and each tab discards what does not overlap. A `BroadcastChannel` mirrors invalidations across tabs in the same browser without opening a second socket.

Admin upgrades are role-checked **in the Worker, before the Durable Object is addressed**. A DO `fetch` has no cookie or session context of its own, so checking after `getByName()` would already have let an unauthenticated client open the object.

### Catalog modelling

Products carry localized content as typed JSON maps — `titles` non-null, `subtitles`/`descriptions`/`tags` nullable — rather than a translations table, so a product reads in one query. Storefront search runs against `storefront_search`, an FTS5 index of the Polish and English text that triggers on `product`, `product_category` and `product_collection` keep current, ranked by `bm25`. Admin product search is a `lower(cast(column as text)) like ? escape '\'` over each locale's `json_extract` from those JSON columns.

Variants, options, attributes and the category/collection junctions are replaced as a **single `db.batch`** through `runDrizzleBatch`, so a product edit is atomic across nine tables. Point reads — by handle, by id, stats, the `json_each` aggregates — are prepared once at module load (eight prepared statements in the product accessors alone); list queries are built per request because the variant-stats join, filters and sort change shape and a prepared statement cannot.

Reordering is one `UPDATE` with a generated `CASE WHEN` over an `IN` list rather than N round-trips. The attribute path chunks at 30 rows against D1's bind limit; the product, category and collection paths do not yet.

### Locale-first routing

Route files carry no locale segment. The router rewrites instead — `rewrite.input` de-localizes the URL before matching and `rewrite.output` re-applies the prefix when generating links, so `_storefront.blog.$slug.tsx` serves both `/en-US/blog/x` and the bare Polish path. Locales are BCP-47 (`pl-PL` default, `en-US`); the default collapses to no prefix, and a redundant `/pl-PL/...` URL is 301'd to the bare path by `resolveLocale` in the Worker, before the router runs. Bare language aliases such as `/pl` and `/en` canonicalize to the full tag. `/api`, `/rpc`, `/_serverFn` and `/assets` are excluded from all of it.

One consequence worth knowing: because the router only ever sees the de-localized path, anything deriving locale from router location silently yields the default. `getCurrentLocale()` reads the real request URL and is the single derivation used everywhere — including by server functions, whose `/_serverFn` URLs carry no locale prefix at all.

Message catalogues are split into 48 namespaces per locale, so a page ships the always-on root namespaces plus what its route and layout ancestors declare in `staticData.namespaces` — not the whole catalogue. A test asserts file by file that Polish contains every key English does.

## Engineering standards

The linter runs with **six of Oxlint's categories set to `error`, including `nursery`** — `correctness`, `nursery`, `pedantic`, `perf`, `style` and `suspicious` — with `typeAware` and `typeCheck` enabled, `denyWarnings: true` so warnings fail, and `reportUnusedDisableDirectives: "error"` so a stale suppression fails too.

```jsonc
// tsconfig.json — the flags that actually change how code is written
"exactOptionalPropertyTypes":         true,  // `{k: undefined}` ≠ omitted
"noUncheckedIndexedAccess":           true,  // arr[i] is T | undefined
"noPropertyAccessFromIndexSignature": true,  // obj["k"] for index signatures
"noImplicitReturns":                  true,
"noFallthroughCasesInSwitch":         true,
"erasableSyntaxOnly":                 true,
"strict":                             true
```

Hard structural limits: **800 lines per file, 150 lines per function, 20 statements per function.** `no-magic-numbers` allows only `-1`, `0` and `1`; `id-length` allows `_`, `m` and `t`; `one-var` forbids grouped declarations; `only-throw-error` permits only TanStack's `Redirect` and `NotFoundError` as non-`Error` throws.

Across roughly **88,100 hand-written lines** of application source, there are **no inline lint suppressions** outside generated declaration files. Exceptions are narrow, file-scoped overrides declared in `vite.config.ts` — relaxed magic numbers and loop awaits in tests, `consistent-return` off in presentation and hooks, unsafe assertions allowed only in `src/platform/testing/mocks/**`, key ordering off in `src/routes/**`, and `max-lines` off for `vite.config.ts` itself — rather than repo-wide rule removals.

Formatting, linting, testing and the dev/build pipeline are one toolchain (Vite+), configured in a single [`vite.config.ts`](vite.config.ts). The formatter runs at 140 columns without semicolons, sorts Tailwind classes against `globals.css` for `cn`/`cva`/`tw`, and applies the 17 custom import groups. Git hooks in [`.vite-hooks/`](.vite-hooks) run `vp check --fix` on staged files and validate commit messages.

## Commands and verification

Use `bun run test`, not `bun test` — the latter bypasses the configured Vitest projects.

| Command                                                     | Purpose                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `bun run dev`                                               | Compile content, then start the dev server with **remote** development bindings.      |
| `bun run typegen`                                           | Regenerate `worker-configuration.d.ts` and Fumadocs `.source/`. Neither is committed. |
| `bun run content`                                           | Compile the `content/docs` MDX only.                                                  |
| `bun run check`                                             | Format, lint and type check — the gate CI runs.                                       |
| `bun run check:fix`                                         | The same, applying supported fixes.                                                   |
| `bun run check:staged`                                      | Lint and type check staged files without reformatting.                                |
| `bun run format` / `format:check` / `lint`                  | Run one stage of the gate on its own.                                                 |
| `bun run test`                                              | Run the node, integration and component projects.                                     |
| `bun run test:unit` / `test:integration` / `test:component` | Run one project.                                                                      |
| `bun run test:watch` / `test:changed`                       | Watch, or run only what changed.                                                      |
| `bun run test:coverage`                                     | Run with the configured coverage gate and write `coverage/`.                          |
| `bun run build:preview` / `build:production`                | Clean `dist`, compile content, build the Worker for that mode, then verify it.        |
| `bun run start`                                             | Serve the last preview build at `127.0.0.1:3000`.                                     |
| `bun run deploy:preview` / `deploy:production`              | Verify bindings, build, prepare secrets, deploy through Wrangler.                     |
| `bun run db:generate`                                       | Generate a migration from the collected schemas.                                      |
| `bun run db:migrate:{local,development,preview,production}` | Apply migrations to that database.                                                    |
| `bun run db:migrations:{development,preview,production}`    | List applied and pending migrations.                                                  |
| `bun run db:studio:{development,preview,production}`        | Open Drizzle Studio against that environment's `.env` file.                           |
| `bun run db:introspect:*` / `db:push:*`                     | Introspect or push the schema over the D1 HTTP API. Prefer generated migrations.      |
| `bun run stripe:listen`                                     | Forward Stripe CLI events to the local webhook route.                                 |
| `bun run clean` / `clean:deep` / `clean:hardcore`           | Remove build output, then `node_modules`, then the lockfile and `opensrc`.            |
| `bun run skills:sync` / `skills:update`                     | Restore or update the vendored agent skill directories from `skills-lock.json`.       |

`vp <name>` runs a Vite+ built-in and `vp run <name>` runs a package script, so `vp dev` and `vp run dev` are not the same thing. Prefer `bun run <script>` to pick the repository's tool versions.

### Test architecture and coverage

Three Vitest projects share one configuration:

| Project       | Environment | Matches                              | Purpose                                                        |
| ------------- | ----------- | ------------------------------------ | -------------------------------------------------------------- |
| `node`        | node        | `*.test.ts(x)`, excluding the others | Pure logic, SQL predicate assertions, server-function drivers. |
| `integration` | node        | `*.integration.test.ts(x)`           | Real SQL against `node:sqlite` behind a D1-shaped transport.   |
| `component`   | jsdom       | `*.component.test.ts(x)`             | Rendering with Testing Library and the project's providers.    |

Tests are colocated in `src/**/__test__/`. Shared infrastructure lives in [`src/platform/testing/`](src/platform/testing): a hand-written `D1Database` implementation over `node:sqlite` that can also observe every query, a driver that invokes a `createServerFn` through its real validators and middleware, message loading for translated assertions, and a render helper.

Current measured coverage, from `coverage/coverage-summary.json`:

| Metric     | Covered / total | Percent | Configured gate |
| ---------- | --------------- | ------- | --------------- |
| Statements | 16 398 / 16 608 | 98.73%  | 72              |
| Branches   | 7 236 / 7 341   | 98.56%  | 69              |
| Functions  | 4 521 / 4 623   | 97.79%  | 68              |
| Lines      | 15 702 / 15 884 | 98.85%  | 71              |

889 test files hold roughly 8 707 cases, 379 of them table-driven, across about 123 000 lines of test code. Coverage includes all of `src/**/*.{ts,tsx}`, excluding tests and fixtures, test infrastructure, the generated route tree and declaration files, and the shadcn primitives.

The configured thresholds are a **ratchet, not a target**, and they are currently well below the measured result — they were last raised when coverage was in the seventies. Raise them deliberately; `autoUpdate` is off so they never move on their own.

What the suite is aimed at, beyond the number:

- **Authorization** — assert the compiled SQL predicate and bound parameters, so dropping an ownership filter breaks the build.
- **Checkout idempotency** — drive two concurrent webhook deliveries that both observe `pending` and assert exactly one order.
- **Rate limiting** — fire concurrent sign-ins against the real Better Auth limiter over in-memory SQLite and assert the admitted/rejected split and the final counter.
- **Session cache** — shared pending lookup, revalidation on a new `Request`, anonymous/authenticated isolation, and that a rejection does not poison the next request.
- **i18n** — every English key exists in Polish, file by file.

Two honest limits. There are **no end-to-end or browser tests**; nothing drives a real browser against a real Worker. And the integration transport emulates batch atomicity but not D1's parameter ceiling, so concurrency results are SQLite's, not proof against D1 under production load.

## Database and deployment

### Bindings per environment

| Binding                     | Type           | `development`                | `preview`                 | `production`               |
| --------------------------- | -------------- | ---------------------------- | ------------------------- | -------------------------- |
| `DB`                        | D1             | `martebizuteria-preview`     | `martebizuteria-preview`  | `martebizuteria`           |
| `CACHE`                     | KV             | `d6727c71…`                  | `d6727c71…`               | `4126270a…`                |
| `IMAGES`                    | R2             | `martebizuteria`             | `martebizuteria`          | `martebizuteria`           |
| `AUDIT_LOG_QUEUE`           | Queue          | `…-audit-log-preview`        | `…-audit-log-preview`     | `martebizuteria-audit-log` |
| `REALTIME_INVALIDATION_HUB` | Durable Object | `RealtimeInvalidationHub`    | `RealtimeInvalidationHub` | `RealtimeInvalidationHub`  |
| `ASSETS`                    | Static assets  | `./public`                   | `./public`                | `./public`                 |
| Worker name                 |                | `martebizuteria-development` | `martebizuteria-preview`  | `martebizuteria`           |

**`development` and `preview` are the same D1 database, the same KV namespace and the same queue.** Only the Worker name and `APP_ENV` differ. All three environments share the R2 bucket, so uploaded media is visible everywhere including production. Treat the development environment as "preview with hot reload", not as a sandbox.

To get real isolation for local work, create your own resources and point the `development` environment at them:

```sh
bunx wrangler login
bunx wrangler d1 create martebizuteria-local
bunx wrangler kv namespace create CACHE --env development
bunx wrangler queues create martebizuteria-audit-log-local
```

Then replace `database_id`, the KV `id` and both queue names under `env.development` in `wrangler.jsonc`, keeping the binding names and `migrations_dir` unchanged, and run `bun run typegen`.

### Migrations

Module schemas are collected by [`drizzle.schemas.ts`](src/integrations/drizzle-orm/drizzle.schemas.ts): 36 tables from 34 modules, each exported with its relations where it has any. The FTS5 search index `storefront_search` is declared in its module but left out of that file, because a hand-written migration creates it. Generate a migration with:

```sh
bun run db:generate
```

Review and commit the SQL under `src/integrations/drizzle-orm/migrations/` together with the schema change, then apply it before deploying code that depends on it.

Migrations are applied by `wrangler d1 migrations apply` in filename order, which is the authority here: there are currently **66 `.sql` files**, while Drizzle's `meta/_journal.json` lists 52, because several were hand-written rather than generated. Do not trust the journal count, and do not renumber existing files.

| Command                          | Database affected                                              |
| -------------------------------- | -------------------------------------------------------------- |
| `bun run db:migrate:local`       | Local `.wrangler` copy of the development database.            |
| `bun run db:migrate:development` | Remote `martebizuteria-preview` — **the same one as preview**. |
| `bun run db:migrate:preview`     | Remote `martebizuteria-preview`.                               |
| `bun run db:migrate:production`  | Remote `martebizuteria`.                                       |

`db:studio:*`, `db:introspect:*` and `db:push:*` use Drizzle Kit over the D1 HTTP API and need `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID` and `CLOUDFLARE_ACCESS_TOKEN` in the selected `.env` file. `db:push` bypasses migration history; prefer generated migrations for anything that will be deployed.

### Seeds — do not run them

[`src/integrations/drizzle-orm/seeds/`](src/integrations/drizzle-orm/seeds) holds eleven SQL files wired into `db:seed:preview` and `db:seed:production`.

> **The seed files are stale against the live preview database, and running them destroys data.**
>
> Ten of the eleven files open with a `DELETE FROM <table> WHERE id NOT IN (…)` over a hardcoded list of seed ids. Every product, variant, category, collection, attribute, image, inventory row and junction row created through the admin UI since the seeds were last edited is **not** in those lists, so `bun run db:seed:preview` would delete it and then reinstate the old fixture rows. Several of the files have not been touched since early June.
>
> Do not run `db:seed:preview`, `db:seed:production` or the bare `db:seed`. If the fixtures ever need to be refreshed, regenerate them from the current database first and re-verify the id lists.

### Automatic GitHub deployments

Three workflows share the composite action at [`.github/actions/setup`](.github/actions/setup), which installs Bun 1.4.0 and Node 24, runs `bun install --frozen-lockfile --ignore-scripts`, optionally copies `.env.test` over `.env.development` and `.env.preview`, and then runs `bun run typegen`.

| Workflow                                                         | Trigger                                       | What it does                                                                     |
| ---------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| [CI](.github/workflows/ci.yml)                                   | Pull requests and pushes to `main`            | `check` → `test:coverage` → `build:preview`, then uploads `coverage/`.           |
| [Preview Deployment](.github/workflows/deploy-preview.yml)       | PRs to `main` (opened, synchronize, reopened) | Re-runs `check`, then `deploy:preview`, then comments the preview URL on the PR. |
| [Production Deployment](.github/workflows/deploy-production.yml) | Pushes to `main`                              | Re-runs `check`, then `deploy:production`.                                       |

CI runs with a 15-minute timeout and cancels superseded runs on the same ref. Preview deployments are keyed on the PR number and cancel in progress; production deployments queue on a single `production` group and never cancel, so a push cannot overtake the deploy before it.

Preview is a **shared environment**: each successful PR deployment replaces the previous one, on the same Worker, the same D1 database and the same KV namespace. There is no per-PR Worker or database.

Both deploy workflows use GitHub `environment: preview` / `environment: production`. Configure these in repository settings:

| Kind     | Name                                                                                                                                                                                                           | Purpose                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Secret   | `CLOUDFLARE_ACCESS_TOKEN`                                                                                                                                                                                      | Passed as `CLOUDFLARE_API_TOKEN`; needs Worker deploy plus the bindings and routes it manages. |
| Secret   | `CLOUDFLARE_ACCOUNT_ID`                                                                                                                                                                                        | Account holding the Worker, D1, KV, R2, queue and Durable Object.                              |
| Secret   | `AUTH_SECRET`, `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`, `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | The Worker secrets that `prepare-deploy-secrets.ts` uploads.                                   |
| Variable | `VITE_APP_URL`, `VITE_R2_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`                                                                                                                                                   | Browser-visible values baked into the client bundle at build time.                             |

The deploy jobs `touch .env.<environment>` and rely on the process environment, because `prepare-deploy-secrets.ts` prefers `process.env[name]` over the file. **Neither deploy workflow applies D1 migrations** — run `db:migrate:preview` or `db:migrate:production` yourself before merging a change that needs them, and keep schema changes backward compatible with the currently deployed Worker.

Use one deployment owner. If a Cloudflare Workers Builds trigger is also connected to this repository, disable it so a push does not deploy twice or bypass the CI gate.

### Manual preview and production deployment

```sh
cp .env.example .env.preview
# Fill in preview secrets and Stripe test keys, then:
bun run db:migrate:preview
bun run deploy:preview
```

```sh
cp .env.example .env.production
# Fill in production secrets and live Stripe keys, then:
bun run db:migrate:production
bun run deploy:production
```

Each deploy script runs four gates in order, and each one fails the deploy rather than warning:

1. [`verify-bindings.ts`](scripts/verify-bindings.ts) reads the same JSONC Wrangler reads and rejects a missing or placeholder `DB` id, `CACHE` id, `IMAGES` bucket, `AUDIT_LOG_QUEUE` producer without a matching consumer, or a renamed Durable Object class.
2. `build:preview` / `build:production` clears `dist`, compiles content, and builds with `CLOUDFLARE_ENV` and `--mode` both set to the target environment.
3. [`verify-build.ts`](scripts/verify-build.ts) checks that `.wrangler/deploy/config.json` points at `dist/server/wrangler.json`, that the built Worker's `APP_ENV` and name match the requested environment, that `main` and `dist/client` exist with fonts, CSS and JavaScript — and then transpile-scans every client chunk and **fails on any `cloudflare:workers` or `node:*` import** that leaked into the browser bundle.
4. [`prepare-deploy-secrets.ts`](scripts/prepare-deploy-secrets.ts) writes a `0600` secrets file containing only the keys declared in `secrets.required`, which is what keeps `CLOUDFLARE_*` management credentials out of the Worker.

Only then does `wrangler deploy` run, against the generated `dist/server/wrangler.json` with `CLOUDFLARE_ENV` unset so the generated config is used verbatim. Builds alone deploy nothing and apply no migrations.

## Localization and content

Supported locales are `pl-PL` (default) and `en-US`, declared in [`i18n.config.ts`](src/integrations/use-intl/i18n.config.ts) together with the `marte_locale` cookie name and the `Europe/Warsaw` default time zone. The time zones customers pick from are `TIMEZONES` in [`timezone.ts`](src/modules/_core/constants/timezone.ts).

Polish uses unprefixed paths, because it is the default. English uses the full BCP-47 tag — `/en-US/products`. A redundant `/pl-PL/...` URL is 301'd to the bare path in the Worker, and bare language aliases (`/pl`, `/en`) canonicalize to the full tag.

- **UI messages** live in `messages/{locale}/` as 48 dotted-namespace JSON files, using the same keys, ICU arguments and rich-text tags across locales. A test asserts Polish parity with English file by file.
- **Route namespaces** are declared in `staticData.namespaces`; a page loads the always-on root namespaces plus what its route and layout ancestors ask for. Loaders fetch messages and data in one `Promise.all`.
- **Documentation** lives in `content/docs/` as `slug.{locale}.mdx` with `meta.{locale}.json` for navigation. It compiles through Fumadocs into `.source/`, which is generated — edit the MDX, never the output.
- **Legal pages** — `/privacy-policy` and `/exchanges-and-returns` — are rows in the D1 `content_page` table, with titles, descriptions and Markdown bodies as per-locale JSON maps. The [`20261002120000_content_pages.sql`](src/integrations/drizzle-orm/migrations/20261002120000_content_pages.sql) migration creates and seeds them without overwriting existing rows. Admins edit them with MDXEditor at `/admin/content`, styled with the same prose class as the storefront page. A save publishes immediately, is refused if someone else saved the page after it was opened, and moves the "Last updated" date of each locale whose title or body changed. A new locale needs a migration that adds it to every row's maps before it can be translated in the editor.
- **Emails** load their `emails.*` namespace in the sending use case and pass `locale` and `messages` into the template. Email templates contain markup only, and never call a browser-side hook.
- **Links** use `LocalizedLink` or `ROUTES.*`; the router's `rewrite.output` adds the prefix. Raw URLs outside the router, such as email links and the email-verification and password-reset callbacks, are built with `buildLocalizedUrl`. The Google and GitHub sign-in `callbackURL` is the current page's `location.publicHref`, which is already localized.
- **Locale derivation** is `getCurrentLocale()`, which reads the real request URL. Do not derive it from router location — the router only ever sees the de-localized path.
- `localeLinks` emits the canonical link plus one `alternate` per locale and an `x-default`, used by `pageHead`.

## Performance and first paint

Fonts are 12 self-hosted `woff2` files under `public/fonts` — Cormorant Garamond in latin and latin-ext subsets, Manrope as a variable font in both — served with a one-year immutable `Cache-Control` from [`public/_headers`](public/_headers). Critical `@font-face` rules, including metric-matched `local()` fallbacks with `size-adjust`, `ascent-override` and `descent-override`, are inlined into `<head>` ahead of `<HeadContent />` on storefront routes. `getCriticalFontPreloads` then preloads exactly one sans and one serif file, choosing the subset by locale: `pl-PL` gets latin-ext, `en-US` gets latin.

The admin shell skips that entirely and inlines its own critical chrome CSS instead — different route, different critical path. Stylesheets are split three ways: `globals.css` at the root, `storefront.css` and `admin.css` from their respective layouts.

The admin data grid emits `width: max(var(--marte-dg-<slug>-<column>, <default>px), <min>px)` in SSR'd markup, and a blocking head script reads `localStorage` and fills those custom properties before first paint — so a resized column paints at its saved width on the first frame, with no React render and no layout shift.

Four request paths short-circuit in [`src/server.ts`](src/server.ts) before the React framework is reached — `/sitemap.xml`, `/robots.txt`, and both WebSocket upgrades — because none of them need an SSR render. The locale redirect returns before the handler too. Route code splitting is configured per concern (`component`, `loader`, `errorComponent`, `notFoundComponent`), checkout steps are lazily imported per step, and the router preloads on intent with a 1000px proximity radius.

## Known gaps

Kept here rather than hidden, because an accurate map is more useful than a flattering one. Each item below was re-verified against the current source.

**Correctness**

- Inventory compensation is best-effort. A failed rollback leaves stock reserved, and nothing alerts.
- The order confirmation email is attempted at most once and never retried. A failed send is recorded as an audit event; there is no outbox.
- `order.status` becomes `completed` only when an admin marks the order delivered through `mark-order-delivered`. The admin revenue and average-order-value cards filter on `eq(order.status, "completed")`, so paid orders that have not been marked delivered are left out of them.
- Partial refunds never restock: the restock branch requires both `input.restock` and `input.fullyRefunded`.
- `isAdminPathname` uses `pathname.includes(ROUTES.ADMIN)`, so a storefront URL containing that substring is misclassified — which changes the theme, the pending component and the sidebar preference.

**Missing infrastructure**

- No cron or reconciliation job. Stale inventory reservations are reclaimed only when Stripe emits `checkout.session.expired`.
- No dead-letter queue. An audit batch that fails three times is dropped.
- No expiry sweep for `session`, `verification` or `rate_limit` rows. The rate-limit table grows one row per distinct key forever.
- No error reporting. `SENTRY_AUTH_TOKEN` appears in `.env.example` and nothing in `src/` reads it.
- No end-to-end or browser tests, and no Playwright configuration.

**Security hardening**

- `AppError` carries a typed code but no HTTP status, so a denial surfaces to the client as a generic RPC failure that the UI maps by code string rather than by status.
- Rate limiting is per-IP only, with no per-account lockout. A distributed credential-stuffing attempt is not slowed by it.
- Audit-log IP resolution falls back to `x-forwarded-for`, which a client can spoof. Rate limiting is unaffected — it reads only `cf-connecting-ip`.
- The browser's cached session stays fresh for 60 seconds and does not refetch on window focus or reconnect, so storefront chrome such as the navigation link and the wishlist can show a revoked or ended session, including a sign-out in another tab, until something refetches it. Navigating into `/account` or `/admin` re-checks, and every server-side read revalidates.

**Unfinished or fixture-backed**

- InPost is parcel-locker _discovery_ only — `fetchPointsByCity` against the public points API. No shipment creation, no labels, no tracking.
- `/admin/marketing` and `/admin/settings` render from `src/data/`. The admin order list and detail page are fully database-backed, as are their fulfil, ship, mark-delivered, cancel and refund actions.
- The blog reads `src/data/blog-posts.ts` rather than MDX or the database.
- The `CACHE` KV binding is declared and verified at deploy time but never read. The `anonymous()` Better Auth plugin is registered with no flow that uses it.

## Contributing

Read the [architecture docs](content/docs/architecture) before the first change — `layering`, `dependency-rules` and `security-model` in particular. Follow the existing theme and typography definitions in [`src/presentation/styles/`](src/presentation/styles) rather than introducing new values.

Before opening a pull request:

```sh
bun run check
bun run test:coverage
bun run build:preview
```

That is the CI sequence, in order. The pre-commit hook already runs `vp check --fix` on staged files, but it does not run the tests or the build.

House rules, in addition to what the linter enforces:

- **No comments in TypeScript or TSX.** Express intent through names and types. Prose belongs in `content/docs`.
- **Never run a regex or `sed` rename across multiple files.** Edit each site individually.
- **Do not run `db:seed:preview`, `db:seed:production`, or any other remote database mutation** as part of development. The seeds are stale and destructive; see [above](#seeds--do-not-run-them).
- **Do not commit generated output.** `src/types/worker-configuration.d.ts`, `.source/` and `src/routeTree.gen.ts` are regenerated by `bun run typegen` and the dev server.
- **Update the documentation with the behaviour.** A user-facing change needs its `content/docs` page updated in **both** `en-US` and `pl-PL`, and a new message key needs both message catalogues.
- **Keep the coverage ratchet honest.** Raise the thresholds in `vite.config.ts` when you cover an area; never lower them to make a change pass.

Agent guidance is vendored: `bun run skills:sync` rebuilds `.agents/skills` from [`skills-lock.json`](skills-lock.json) and links it into `.claude/skills`, replacing whatever is in those directories. Keep custom guidance elsewhere. Project conventions for agents live in [`AGENTS.md`](AGENTS.md).

For documentation corrections, verify commands and file paths against the implementation before submitting. For behaviour changes, describe the resulting behaviour, the validation you ran, and any gap the change leaves open.

## Licensing

The source code is shared under **CC BY-NC 4.0** for educational purposes. See [`LICENSE.md`](LICENSE.md) for the full terms, including the attribution and non-commercial conditions.

No copyright, trademark or other intellectual property rights are claimed over the name "M'Arte" or over any names, logos or branding used here. Third-party assets and dependencies retain their own licences.
