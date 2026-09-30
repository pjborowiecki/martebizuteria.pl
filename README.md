# M'Arte Jewellery

A full-stack e-commerce platform — storefront, checkout, and admin dashboard — running entirely on Cloudflare Workers. Built with TanStack Start, React 19, TypeScript, Drizzle, and D1.

The interesting part of this codebase is not that it sells jewellery. It is that it does so on a runtime with no filesystem, no Node server, no multi-statement database transactions, and a hard limit on how long a request may live. Most of the decisions below exist because of those constraints.

---

## Status

This is a working application under active development, not a finished product. Being precise about the boundary matters more than the headline:

**Live and wired end to end** — storefront catalog (products, variants, categories, collections, attributes, search, filtering, pagination), cart, the four-step checkout, Stripe payment with webhook-driven fulfilment, inventory reservation and compensation, order placement, customer accounts (orders, addresses, sessions, login history), transactional email, the audit log, realtime cache invalidation, and admin management of products, categories, collections, attributes, customers, orders and audit.

**Scaffolded, not finished** — two-factor auth (plugin and columns provisioned; no enrolment flow), in-app password change, discounts and coupons (table and column exist, no code path), InPost (parcel-locker _discovery_ only — no shipment creation or labels), and the admin order detail page, `/admin/coupons` and `/admin/content`, which still render from fixtures in `src/data/`.

**Not present** — end-to-end tests, scheduled/cron jobs, a dead-letter queue, and error reporting (Sentry env vars are declared but nothing is wired).

See [Known gaps](#known-gaps) for the specifics.

---

## Architecture

```
                    Cloudflare Worker  (src/server.ts)
                              │
      ┌───────────────┬───────┴────────┬──────────────────┐
      │               │                │                  │
  /sitemap.xml   WebSocket         locale 301      TanStack Start
                  upgrade          middleware      (wrapped in ALS
                      │                             carrying waitUntil)
                      ▼                                  │
             Durable Object                    ┌─────────┴─────────┐
          (invalidation fan-out)               │                   │
                      ▲                    route loaders     server functions
                      │                        │             (the trust boundary
                      └──── notifyInvalidation ┘              — assertAdmin here)
                                                             │
                                    ┌────────────────────────┼──────────────┐
                                    ▼                        ▼              ▼
                                D1 (Drizzle)              R2 media      Stripe / Resend
                                    │
                              Queue → audit log
```

Requests enter one Worker. Four paths short-circuit before the React framework is reached — the sitemap, both WebSocket upgrades, and the locale redirect — because none of them need an SSR render.

### Layering

```
src/
  routes/               61 locale-free file routes + api/; loaders, guards, HTTP handlers
  modules/{feature}/    36 domain modules — schema, Zod, types, constants, helpers
    *.accessors.ts        unauthenticated data access (reads and writes)
    use-cases/*.ts        createServerFn + validation + assertAdmin + query options
  integrations/{vendor}/ 8 providers: better-auth, stripe, drizzle-orm, resend,
                           cloudflare-r2, inpost, use-intl, realtime-invalidation
  presentation/         603 files — shadcn layer, feature UI, emails, styles, theme
  durable-objects/      WebSocket invalidation hub
  platform/testing/     shared test infrastructure
```

The split that does the most work is **`accessors` vs `use-cases`**. Accessors are plain data access with no notion of who is asking. Use cases wrap them in `createServerFn`, validate input, assert authorization, and export the TanStack Query options next to the operation they fetch. That means a loader and the component that later refetches share one query key and one fetcher by construction, and it means there is exactly one layer where authorization can be forgotten — which is the layer the tests target.

---

## Problems worth talking about

### Consistency without transactions

D1 has no interactive transactions. `db.batch()` is atomic, but anything that must read, decide, then write cannot be one statement — so the usual "wrap it in a transaction" answer is unavailable.

**Inventory reservation uses optimistic concurrency.** The reserve path issues a compare-and-set `UPDATE` guarded on both the row `version` read during validation and `quantityAvailable >= qty`, using `.returning()` length as the success signal. Overselling is prevented by that `gte` predicate rather than by locking. Multi-line carts reserve concurrently and compensate: if any line fails its guard, the already-succeeded reservations are released before the error propagates.

The compensation is **best-effort and deliberately documented as such** — its own failure is caught and logged, so a failed rollback leaves stock reserved. The honest version of this design is a saga with a known hole, not a distributed transaction.

**Checkout idempotency is layered, because the application guard alone cannot be atomic.** `resolvePendingCheckout` refuses to act unless the checkout row still reads `pending`, which collapses Stripe's _sequential_ retries. That read and the fulfil batch are separate round-trips, so two genuinely concurrent deliveries can both pass it — necessary, but not sufficient.

The constraint that actually holds is in the database: `order.checkout_id` and `payment.transaction_id` are unique. A batch is atomic on D1, so the losing delivery's `INSERT` violates the index and the whole batch rolls back, leaving exactly one order. The status flip additionally carries a `WHERE status = 'pending'` predicate. The integration suite drives two deliveries that both observe `pending` and asserts one order results; removing the unique index makes that test fail.

### Authorization lives at the RPC boundary

A server function is a public HTTP endpoint. It is reachable whether or not the route that normally calls it was ever loaded, so a route guard cannot protect it.

Route `beforeLoad` guards exist here and are honest about their job: they redirect, for navigation UX, and they also run client-side. The actual boundary is `assertAdmin()` at the top of 55 server functions, before any database access, and **ownership predicates compiled into the SQL** for customer-facing reads — `eq(order.userId, session.user.id)` in the `WHERE` clause rather than a fetch-then-filter. A foreign order id returns no row, which makes IDOR structurally absent rather than conventionally avoided.

The authorization tests compile the Drizzle condition with `SQLiteSyncDialect` and assert the exact generated SQL and bound parameters. A refactor that drops an ownership predicate fails the suite instead of silently widening access. Eight catalog read endpoints are table-driven to assert they reject _before_ their query mock is touched.

### Session freshness versus per-request cost

Better Auth is configured with a 300-second signed cookie cache, and every server-side session read then passes `disableCookieCache: true` and hits D1 anyway. That looks contradictory; it is a deliberate trade.

The cost is one D1 read per HTTP request. The benefit is that a banned or signed-out user cannot ride a cached cookie for five minutes. To stop that becoming N reads, the lookup is memoized per `Request` in a `WeakMap` — keyed on the request object, not a module global, which is what makes it safe in a Worker isolate serving many requests. Concurrent loaders and server functions in one request share a lookup; a new request always revalidates.

Note the asymmetry: the bypass is server-side only. The client's `useSession()` goes through `/api/auth/get-session`, which _does_ consult the cookie cache, so a revoked user's browser chrome can render as signed-in for up to five minutes even though every server read revalidates.

D1 is the sole auth store — no `secondaryStorage` is configured. KV was rejected for sessions, verification tokens and rate-limit counters because it is eventually consistent and cannot do the atomic consume-and-increment those need. That choice is pinned by a test asserting the option is absent.

### Background work on a runtime that kills floating promises

A promise still pending when a Worker returns its response is terminated. Better Auth's background hooks and the domain layer's audit recorders have no access to the `ExecutionContext`, and threading `ctx` through every call site would be invasive.

`src/server.ts` enters an `AsyncLocalStorage` carrying `waitUntil` around the framework handler, and `scheduleBackgroundWork` pulls it back out at arbitrary depth. When no store exists — the queue consumer, unit tests, the paths that short-circuit before the ALS — it degrades to a fire-and-forget with a `catch`, so failures are observed rather than silently dropped.

Audit events are enqueued to a Cloudflare Queue rather than written inline, with ids and timestamps minted at enqueue time so ordering survives batching. 31 typed recorder functions cover 5 of the 6 declared categories across a 33-entry action catalogue.

### Realtime cache invalidation

Admin dashboards go stale the moment a second person is working. Polling is the usual answer and it is wasteful.

A Durable Object acts as a connection fan-out hub — one object per audience, addressed by name. The upgrade handshake reaches it via `fetch` (a WebSocket upgrade has no choice), but invalidations use a **native RPC method**, `hub.notifyInvalidation(prefixes)`, avoiding Request/Response construction on the hot path. The hub holds no durable state; it is a broadcaster, not a store.

Matching is a **symmetric prefix overlap** — deliberately broader than TanStack Query's one-directional prefix match — so a narrowly-scoped publish still invalidates the coarser prefix a tab subscribed to. Clients subscribe to a fixed prefix list (12 admin, 10 storefront); the hub broadcasts to the audience and each tab discards what does not overlap. A `BroadcastChannel` mirrors invalidations across tabs in the same browser without a second socket.

Admin upgrades are role-checked **in the Worker, before the Durable Object is addressed** — a DO `fetch` has no cookie or session context of its own, so checking after `getByName()` would already have let an unauthenticated client open the object.

### Catalog modelling

Products carry localized content as typed JSON maps (`titles` non-null, `subtitles`/`descriptions`/`tags` nullable) rather than a translations table, so a product reads in one query. Search is a `LIKE` across those JSON columns, which queries every locale at once without an FTS table.

Variants, options, attributes and the category/collection junctions are replaced as a **single `db.batch`**, so a product edit is atomic across nine tables. Point reads — by handle, by id, stats, the `json_each` aggregates — are prepared once at module load; list queries are built per request because the variant-stats join, filters and sort change shape and a prepared statement cannot.

Reordering is one `UPDATE` with a generated `CASE WHEN` over an `IN` list rather than N round-trips. The attribute path chunks at 30 rows against D1's bind limit; the product, category and collection paths do not yet.

### Locale-first routing

Route files carry no locale segment. The router rewrites instead — `rewrite.input` de-localizes the URL before matching and `rewrite.output` re-applies the prefix when generating links, so `blog.$slug.tsx` serves both `/en-US/blog/x` and the bare Polish path. Locales are BCP-47 (`pl-PL` default, `en-US`); the default collapses to no prefix, and a redundant `/pl-PL/...` URL is 301'd to the bare path at the Worker before the router runs.

One consequence worth knowing: because the router only ever sees the de-localized path, anything deriving locale from router location silently yields the default. `getCurrentLocale()` reads the real request URL and is the single derivation used everywhere.

Message catalogues are split by namespace, so a page ships the four always-on root namespaces plus what its route and layout ancestors declare — not the whole catalogue. A test asserts file-by-file that Polish contains every key English does.

### First paint

Fonts are 12 self-hosted `woff2` files served `immutable`, with critical `@font-face` rules inlined into `<head>` ahead of `<HeadContent />` on storefront routes, plus one sans and one serif preload chosen by locale subset (`pl-PL` → latin-ext, `en-US` → latin). The admin shell skips that entirely and inlines its own critical chrome CSS instead — different route, different critical path.

The admin data grid emits `width: max(var(--marte-dg-<slug>-<column>, <default>px), <min>px)` in SSR'd markup, and a blocking head script fills those variables from `localStorage` before first paint — so a resized column paints at its saved width on the first frame, with no React render and no layout shift.

Stylesheets are split three ways: `globals.css` at the root, `storefront.css` and `admin.css` from their respective layouts.

---

## Engineering standards

The linter runs with **six of Oxlint's seven categories set to `error`, including `nursery`**, with type-aware rules and type checking enabled. Warnings fail. Unused suppression directives fail.

```jsonc
// tsconfig.json — the flags that actually change how code is written
"exactOptionalPropertyTypes":        true,  // `{k: undefined}` ≠ omitted
"noUncheckedIndexedAccess":          true,  // arr[i] is T | undefined
"noPropertyAccessFromIndexSignature": true, // obj["k"] for index signatures
"noImplicitReturns":                 true,
"noFallthroughCasesInSwitch":        true,
"erasableSyntaxOnly":                true,
"strict":                            true
```

Hard structural limits: **800 lines per file, 150 lines per function, 20 statements per function.**

The result worth quoting: across roughly **77,800 hand-written lines**, the source carries exactly **two** inline lint suppressions — both `typescript/no-unsafe-type-assertion`, both with a written justification. Exceptions are narrow, file-scoped overrides (tests, mocks, presentation return types, route key order) rather than repo-wide rule removals.

Formatting, linting, testing and the dev/build pipeline are one toolchain (Vite+), configured in a single `vite.config.ts`. 17 custom import groups give every file a layer-named import order applied automatically by the formatter.

### Testing

Deliberately stated plainly: **coverage is low** — 236 cases in 23 files, around 8.6% of lines. There are no end-to-end or browser tests, and large areas of the UI are untested.

Coverage thresholds are configured as a ratchet rather than a target: they sit just under the current numbers, so any regression fails CI, and they are raised deliberately as each area is covered.

What exists is aimed at the places where a silent regression is expensive rather than at a coverage number:

- **Authorization** — assert the compiled SQL predicate and bound parameters, so dropping an ownership filter breaks the build
- **Rate limiting** — fire 8 concurrent sign-ins against the real Better Auth limiter over in-memory SQLite and assert exactly 5 pass, 3 are rejected, counter at 5
- **Session cache** — shared pending lookup, revalidation on a new `Request`, anonymous/authenticated isolation, and that a rejection does not poison the next request
- **i18n** — every English key exists in Polish, file by file

Integration suites run against `node:sqlite` behind a hand-written D1-shaped transport. It emulates batch atomicity but not D1's parameter ceiling, so concurrency results are SQLite's, not proof against D1 under production load.

### Delivery

Three GitHub Actions workflows share one composite setup action. CI runs `check` → `test:coverage` → `build:preview` and uploads coverage. Both deploy workflows re-run the full check before building.

Deploys are gated by scripts that fail the build rather than warn: `verify-bindings.ts` reads the same JSONC wrangler uses and rejects placeholder D1/KV ids; `verify-build.ts` rejects a client bundle still carrying an unbundled `cloudflare:workers` or `node:*` import; `prepare-deploy-secrets.ts` uploads only the declared application secrets, keeping Cloudflare management credentials out of the Worker.

---

## Getting started

```sh
vp install
cp .env.example .env.development     # then fill in real values
bun run dev
```

`bun run dev` uses **remote bindings** — it talks to the real development D1, R2 and KV, so migrations must be applied before first run:

```sh
bun run db:migrate:development
```

| Command                                               | Purpose                                             |
| ----------------------------------------------------- | --------------------------------------------------- |
| `bun run check`                                       | Format, lint, and type check — the gate CI runs     |
| `bun run test` / `test:unit` / `test:integration`     | Test suites                                         |
| `bun run test:coverage`                               | Coverage report                                     |
| `bun run build:preview` / `build:production`          | Build and verify the Worker artifact                |
| `bun run db:generate`                                 | Generate a migration from schema changes            |
| `bun run db:migrate:{development,preview,production}` | Apply migrations                                    |
| `bun run db:studio`                                   | Drizzle Studio                                      |
| `bun run typegen`                                     | Regenerate Worker type declarations (not committed) |
| `bun run deploy:preview` / `deploy:production`        | Verify, build, and deploy                           |

Three environments — `development`, `preview`, `production` — each with a matching `.env` file, Wrangler environment and Vite mode. `VITE_`-prefixed values are browser-visible; everything else is a Worker secret declared in `wrangler.jsonc`. Bun's automatic env loading is disabled in `bunfig.toml` so the environment is always explicit.

Migrations are applied by `wrangler d1 migrations apply` in filename order — 54 files across 31 tables. Drizzle's `meta/_journal.json` lists 51 and is no longer authoritative.

---

## Known gaps

Kept here rather than hidden, because an accurate map is more useful than a flattering one.

**Correctness**

- Inventory compensation is best-effort — a failed rollback leaves stock reserved, with no alert
- The confirmation email is attempted at most once and never retried — a failed send is recorded as an audit event, with no outbox
- `order.status` is never written as `completed`, so admin revenue and average-order-value cards compute from an empty set
- `fulfillmentStatus: delivered`, `trackingNumber` and `trackingUrl` have no write path
- Partial refunds never restock and are not idempotent
- `isAdminPathname` uses `includes("/admin")`, so a storefront URL containing that substring is misclassified

**Missing infrastructure**

- No cron or reconciliation job — stale reservations are reclaimed only when Stripe emits `checkout.session.expired`
- No dead-letter queue; an audit batch failing three times is dropped
- No expiry sweep for `session`, `verification` or `rate_limit` rows
- Sentry is declared in env types but never initialised

**Security hardening**

- `getSessionFn` returns Better Auth's session object verbatim to the browser, including `session.token` — it should project a user shape
- `assertAdmin()` throws a bare `Error("UNAUTHORIZED")` with no status, so denials surface as generic 500-shaped RPC errors
- Rate limiting is per-IP with no per-account lockout
- Audit-log IP resolution falls back to `x-forwarded-for`, which is client-spoofable (rate limiting is unaffected — it reads only `cf-connecting-ip`)

**Dead or unused**

- `order_address` table, `CACHE` KV binding, the `anonymous()` plugin, the declared access-control statement matrix (application authorization is the binary `hasAdminAccess` check), and several fixture-backed admin pages

---

## Licence

See [LICENSE.md](LICENSE.md).
