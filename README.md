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

| Area                     | Current implementation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storefront catalog       | Products, variants, options, categories, collections and attributes from D1. Localized search, faceted filtering, sorting and pagination. Product, category and collection detail pages by handle.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Cart                     | Server-backed cart and cart items, availability and price re-checks against live inventory and the catalogue, and a cross-tab availability banner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Checkout                 | Four steps (contact, billing address, delivery, payment) with lazily loaded step components, a persisted draft, a discount code field, Stripe Payment Element, and webhook-driven fulfilment. A new checkout passes a Cloudflare Turnstile bot check and a cap of five open checkouts per client address and three per email, and an order holds at most ten of one piece.                                                                                                                                                                                                                                                        |
| Payments and fulfilment  | Stripe Checkout Sessions, `/api/webhooks/stripe` with signature and live/test mode verification, idempotent order placement, inventory reservation with compensation, refunds that restock only when the admin says the goods came back, never twice per order.                                                                                                                                                                                                                                                                                                                                                                   |
| Customer accounts        | Better Auth email/password with required verification, Google sign-in, two-factor auth with backup codes, password change and recovery, multi-session, order history, addresses, active sessions and login history. Sign-up, password-reset requests and verification resends pass a Cloudflare Turnstile bot check.                                                                                                                                                                                                                                                                                                              |
| Admin sign-in            | Password plus two-factor authentication: `/admin/security` turns it on and off, and the admin panel, admin permissions, the admin socket and Better Auth's admin endpoints wait until it is on. Google sign-in is refused for admins.                                                                                                                                                                                                                                                                                                                                                                                             |
| Transactional email      | Resend with React Email templates: verify, change and reset emails, password changed, account deleted, order confirmation, shipped, cancelled, refunded, failed payment, withdrawal acknowledgement, and the shop's notices of new orders, withdrawals and incidents. Order emails are retried twice under Resend idempotency keys. Previewable at `/dev/emails`. Emails any visitor can ask for (verification, password reset, newsletter, and the acknowledgement of a withdrawal sent by order number) are capped at three per address and kind an hour and 50 a day for the shop; the other order emails are never held back. |
| Newsletter               | Double opt-in sign-up, and a composer at `/admin/marketing/new` that sends a Polish and English letter to every confirmed subscriber in their language, in batches of 100 through a Cloudflare Queue with a dead-letter queue, with one-click unsubscribe headers, a test send, an audit entry, an alert if a campaign stops part way, and no second send of the same campaign.                                                                                                                                                                                                                                                   |
| Admin catalog            | Products, variants, categories, collections and attributes: permission-checked CRUD, reordering, localized content editing, R2 image upload, stats cards, product CSV export.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Admin orders             | Database-backed list and detail page with tabs, filters, stats and a CSV export with the buyer's company and NIP, a printable order summary that is not a VAT invoice, plus fulfil, ship with tracking, mark delivered, cancel, refund and return-to-stock actions, webhook-flagged disputes, audit trail, customer and shop emails, and Resend email for one that still failed.                                                                                                                                                                                                                                                  |
| Discounts                | Percentage, fixed-amount and free-shipping codes with date, usage, per-customer and minimum-order limits, applied to the Stripe Checkout Session as a one-off coupon and managed at `/admin/coupons`.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Admin customers          | Database-backed customer list and detail, order counts and spend aggregates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Audit log                | Cloudflare Queue producer/consumer with a dead-letter queue, 61 typed recorder functions over a 61-entry action catalogue, admin order actions and account security changes credited to whoever made them, admin list with category and date filters.                                                                                                                                                                                                                                                                                                                                                                             |
| Realtime invalidation    | Durable Object fan-out hub per audience, WebSocket subscriptions for 16 admin and 12 storefront query prefixes, `BroadcastChannel` mirroring across tabs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Monitoring               | Workers Logs and Issues, `/api/health` reading D1, KV and R2 for an uptime monitor, and e-mails to `RESEND_EMAIL_FROM` when a paid checkout creates no order, a Stripe event fails, an audit batch fails, a newsletter stops part way or an order email still fails after its retries, at most once per incident.                                                                                                                                                                                                                                                                                                                 |
| Data retention           | A daily Cron Trigger in preview and production deletes or anonymises ended checkouts, old activity, sign-in and audit entries, lapsed newsletter sign-ups and expired sessions, tokens and rate-limit rows; orders, payments and withdrawals stay.                                                                                                                                                                                                                                                                                                                                                                                |
| Documentation and legal  | Fumadocs-backed `/docs` with 105 pages per locale. The terms of service, privacy policy, exchanges-and-returns and FAQ pages are Markdown in the D1 `content_page` table, edited with MDXEditor at `/admin/content`. Customers withdraw from a contract online at `/withdraw-from-contract` or on the order's page in their account.                                                                                                                                                                                                                                                                                              |
| Scaffolded, not finished | InPost shipments are booked, labelled and tracked from the admin order page through ShipX, but InPost's status does not move the order.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Fixture-backed screens   | `/admin/settings` renders from `src/data/`, not the database. The blog is hidden until `src/data/blog-posts.ts` lists an article.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Not present              | A stock reconciliation job.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

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

| Responsibility           | Implementation                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Application and routing  | React 19, TypeScript, TanStack Start and Router with locale URL rewriting                                      |
| Toolchain                | Bun 1.4.0 and Vite+ — dev server, build, format, lint, type check and tests from one `vite.config.ts`          |
| Hosting                  | Cloudflare Workers with smart placement, Workers Logs and Workers Issues enabled                               |
| Storage                  | D1 (SQLite) for all application data, R2 for media, KV declared as `CACHE`, static assets binding              |
| Coordination             | Durable Object (`RealtimeInvalidationHub`) and Cloudflare Queues for the audit log and the newsletter          |
| Database access          | Drizzle ORM, `drizzle-zod`, and checked-in SQLite migrations applied by Wrangler                               |
| Auth and authorization   | Better Auth (admin, multi-session, two-factor plugins) with D1 as the sole store                               |
| Data and forms           | TanStack Query and Table, React Hook Form with Zod resolvers, `nuqs` for URL state, Zustand                    |
| UI                       | Tailwind CSS 4, shadcn-styled components over Base UI, Lucide icons, Recharts, Embla, Vaul, Sonner             |
| Motion and scrolling     | GSAP with `@gsap/react`, Lenis smooth scroll synchronized with the router                                      |
| Localization and content | `use-intl` with ICU messages split by namespace, Fumadocs and MDX for docs, MDXEditor for legal pages          |
| External services        | Stripe for payments, Resend for email, InPost for parcel-locker lookup and shipments, MapLibre for locker maps |
| Verification             | Vite+/Vitest with node, integration and jsdom component projects; Testing Library                              |

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
> Both declare `database_name: "martebizuteria-preview"` and `database_id: 1660d0df-fff9-463b-bbc6-dec65f754302`, the same `CACHE` KV namespace `d6727c712d3443cc9e79be1bf42a6f0c`, the same `martebizuteria-preview` R2 bucket, and the same `martebizuteria-audit-log-preview` and `martebizuteria-newsletter-preview` queues with their `-dlq` dead-letter queues. Only `production` has its own D1 database (`2bf4f35e-0a01-43c0-8a10-df5cc84ceb89`), KV namespace and R2 bucket (`martebizuteria`). The preview bucket has to exist before `bun run dev` can reach `IMAGES`; [Image delivery](content/docs/guides/image-delivery.en-US.mdx) creates and fills it.
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

The admin panel requires two-factor authentication, so the first visit lands on `/admin/security`: turn it on there with an authenticator app and keep the recovery codes. Admins sign in with their password and a code; Google sign-in is refused for them because Better Auth's `twoFactor` plugin never asks for the code on that path. An account created with Google gets a password through **Forgot password?** first. See [Better Auth](content/docs/integrations/better-auth.en-US.mdx#two-factor-authentication-for-admins).

## Configuration and integrations

### Environment files

Use `.env.development`, `.env.preview` and `.env.production`, matching the Wrangler environments and Vite modes of the same names. They are gitignored; [`.env.example`](.env.example) lists every key. Only `VITE_`-prefixed values reach browser code — never prefix a credential.

| Variable                                                                     | Purpose                                                                                                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_R2_URL`                                                                | Public base URL of the environment's R2 bucket. Browser-visible and also declared as a Worker secret.                                                         |
| `VITE_STRIPE_PUBLISHABLE_KEY`                                                | Stripe publishable key used by the Payment Element: `pk_live_` in production, `pk_test_` elsewhere.                                                           |
| `VITE_TURNSTILE_SITE_KEY`                                                    | Site key of the checkout's Turnstile bot check: the shop's own widget in production, Cloudflare's testing key elsewhere.                                      |
| `AUTH_SECRET`                                                                | Better Auth signing secret. Generate a distinct value per environment.                                                                                        |
| `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`                         | Google OAuth application credentials.                                                                                                                         |
| `RESEND_API_KEY`, `RESEND_EMAIL_FROM`                                        | Resend API key and a bare sender address on a domain verified in Resend (`onboarding@resend.dev` locally), which also receives the shop's notices and alerts. |
| `RESEND_MANAGEMENT_API_KEY`                                                  | Optional Resend Full access key the deploy check uses to read the sender domain's DNS records. **Never uploaded to the Worker.**                              |
| `STRIPE_SECRET_KEY`                                                          | Stripe server key for intents, refunds and customers: `sk_live_` or `rk_live_` in production, test keys elsewhere.                                            |
| `STRIPE_WEBHOOK_SECRET`                                                      | Secret used to verify `/api/webhooks/stripe` deliveries.                                                                                                      |
| `INPOST_API_TOKEN`, `INPOST_ORGANIZATION_ID`                                 | InPost ShipX token and organisation id for shipments from the admin; blank turns them off. InPost's sandbox outside production.                               |
| `TURNSTILE_SECRET_KEY`                                                       | Secret key the server sends to Turnstile's siteverify with every new checkout's token; pairs with `VITE_TURNSTILE_SITE_KEY`.                                  |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, `CLOUDFLARE_ACCESS_TOKEN` | Drizzle Kit credentials for Studio, introspect and push over the D1 HTTP API. **Never uploaded to the Worker.**                                               |

Server code reads secrets through `env` from `cloudflare:workers`. The eleven keys listed in `secrets.required` for each environment in [`wrangler.jsonc`](wrangler.jsonc) are the authoritative deployment list: `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `INPOST_API_TOKEN`, `INPOST_ORGANIZATION_ID`, `RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY` and `VITE_R2_URL`. [`scripts/prepare-deploy-secrets.ts`](scripts/prepare-deploy-secrets.ts) uploads exactly those and fails if one is missing or blank, except the two InPost keys, which may be blank, which keeps the Cloudflare management credentials out of the Worker.

### Domains and branding

The canonical URL is configured in source, not in an environment file. Rebuild after changing any of these.

| Location                                                                         | What to configure                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/presentation/branding/app.ts`](src/presentation/branding/app.ts)           | `APP_DOMAIN` (`martebizuteria.pl`), the derived `APP_URL`, `APP_NAME`, icon, OG image dimensions, theme colour, R2 fallback URL.                                                                                                                                       |
| [`src/presentation/branding/business.ts`](src/presentation/branding/business.ts) | Legal name, NIP/REGON, postal address, phone, contact email and opening hours. The footer, the about page and the order confirmation show the seller's details, every product page names the seller as the manufacturer, and the legal pages are checked against them. |
| [`src/presentation/branding/socials.ts`](src/presentation/branding/socials.ts)   | Social profile links.                                                                                                                                                                                                                                                  |
| [`src/modules/_core/constants/api.ts`](src/modules/_core/constants/api.ts)       | `appHostsForMode` — the hosts Better Auth accepts per mode, and `isLocalMode`, which also controls secure cookies.                                                                                                                                                     |
| [`wrangler.jsonc`](wrangler.jsonc)                                               | Worker names and custom domains per environment, and every binding id.                                                                                                                                                                                                 |
| [`src/presentation/styles/`](src/presentation/styles)                            | Theme tokens, typography, font declarations, and the storefront/admin stylesheet split.                                                                                                                                                                                |
| [`public/`](public)                                                              | `favicon.svg`, `og.png`, `llms.txt`, `_headers`, self-hosted fonts, screenshots and video.                                                                                                                                                                             |

`appHostsForMode` currently allows `preview.martebizuteria.pl` plus `martebizuteria-preview.pjborowiecki.workers.dev` for preview, `martebizuteria.pl` plus `martebizuteria.pjborowiecki.workers.dev` for production, and `localhost:3000`/`127.0.0.1:3000` for development and test. Adding a host means editing that file — an unknown host makes Better Auth reject the request. The deployed hosts other than `workers.dev` are also attached to their Worker as custom domains by `routes` in `wrangler.jsonc`, which keeps `workers_dev: true` for the deploy's live-site check, and a test beside `api.ts` fails until the two agree. No `www` host is attached; `APP_URL` is the bare domain. A deploy makes each Worker's custom domains match `routes`, so one attached by hand in the dashboard is detached, and the `martebizuteria.pl` zone has to be active in the deploying account; [Deploy a preview](content/docs/getting-started/deploy-preview.en-US.mdx) covers conflicting DNS records.

### Provider setup

- **Google OAuth.** Google is the only social sign-in. Its callback URL is `https://<host>/api/auth/callback/google`. A provider sign-in is linked to an existing account with the same e-mail address only when the provider reports that address as verified, and OAuth tokens are encrypted at rest.
- **Resend.** Configure the API key and a verified sender before testing sign-up, because `requireEmailVerification` blocks sign-in until the address is verified. Add the sender's domain at [resend.com/domains](https://resend.com/domains) and publish the DKIM (`resend._domainkey` TXT) and SPF (`send` MX and TXT) records it lists; locally, `onboarding@resend.dev` works but delivers only to the Resend account owner. `bun run email:verify <environment>` checks the key and sender, and the deploy scripts run the same check. Every e-mail carries `Reply-To: kontakt@martebizuteria.pl` (`BUSINESS.EMAIL` in [`src/presentation/branding/business.ts`](src/presentation/branding/business.ts)), so customer replies reach the shop whatever sender is configured. Each new order, each withdrawal sent online and each incident that needs the owner is also emailed to the shop at `RESEND_EMAIL_FROM`, in every environment. Templates live in [`src/presentation/emails/`](src/presentation/emails) and are previewable at `/dev/emails`.
- **Stripe.** Use test keys for development and preview and live keys for production; the deploy scripts refuse any other pairing. Create the webhook endpoint at `https://<host>/api/webhooks/stripe` in the same mode as the keys and store its signing secret; the route logs and ignores events from the other mode. Handlers live in [`src/integrations/stripe/stripe.webhooks.ts`](src/integrations/stripe/stripe.webhooks.ts) and cover payment success, failure, refund and `checkout.session.expired`.
- **Cloudflare Turnstile.** A new checkout, a sign-up, a password-reset request, a verification resend and a newsletter sign-up each need a Turnstile token for their own action, and the server refuses one siteverify does not confirm for the request's host. Development, preview and the test build use Cloudflare's always-passing testing keys from `.env.example`. Production needs a managed widget created in the Cloudflare dashboard for `martebizuteria.pl` and `martebizuteria.pjborowiecki.workers.dev`, its site key in `VITE_TURNSTILE_SITE_KEY` and its secret key in `TURNSTILE_SECRET_KEY`; the deploy refuses the testing keys there. See [Cloudflare Turnstile](content/docs/integrations/cloudflare-turnstile.en-US.mdx).
- **R2.** Admin media upload writes to the `IMAGES` binding with a one-year immutable `Cache-Control` and stores the object key. Reads go through the public `VITE_R2_URL`: the preview bucket's `r2.dev` address for development and preview, and the custom domain `images.martebizuteria.pl` for production, where the storefront resizes images with Cloudflare Image Transformations. Stored `r2.dev` URLs are moved onto `VITE_R2_URL` when they are read, so changing it needs no data rewrite. Pages are served with a Content-Security-Policy that allows images and video only from that host, its `/cdn-cgi/image/` resizes included, and the bundled `r2.dev` bucket, so the build-time and the Worker value of `VITE_R2_URL` must match. [Image delivery](content/docs/guides/image-delivery.en-US.mdx) lists the one-time setup.
- **InPost.** [`src/integrations/inpost/inpost.api.ts`](src/integrations/inpost/inpost.api.ts) calls the public points API, with no credentials, by city to power locker selection during checkout and by name to confirm the chosen locker when the payment session is opened: a locker InPost does not list is refused, and one InPost cannot confirm within three seconds goes ahead and is flagged "Locker not confirmed" on the admin order. [`src/integrations/inpost/inpost.shipx.server.ts`](src/integrations/inpost/inpost.shipx.server.ts) books shipments, downloads PDF labels and reads their status through ShipX from the admin order page. It needs the token and organisation id from the API section of InPost Manager as `INPOST_API_TOKEN` and `INPOST_ORGANIZATION_ID`, calls InPost's sandbox outside production, and is off while they are blank. Register `https://<host>/api/webhooks/inpost` as the webhook address in InPost Manager to have status changes read back without a refresh; the route reads each named shipment back from ShipX instead of trusting the call, and answers `429` to an address past 120 calls a minute.
- **Cloudflare Queues and Durable Object.** All are declared per environment in `wrangler.jsonc`. The audit log and newsletter queues and their `-dlq` dead-letter queues need to exist before deploying; `scripts/verify-bindings.ts` refuses a configuration where either producer queue has no consumer, or its consumer names no dead-letter queue that the Worker also consumes.

## Project structure and conventions

```text
content/
  docs/                       Localized MDX documentation (105 pages per locale) and meta.{locale}.json
messages/{locale}/            56 JSON namespace files per locale
public/                       Fonts, favicon, OG image, llms.txt, _headers, screenshots, video
scripts/                      verify-bindings, verify-stripe-keys, verify-turnstile-keys, verify-email-sender, verify-build, verify-deployment, prepare-deploy-secrets, sync-skills, commit-msg
src/
  server.ts                   Worker entry: sitemap, robots, WebSocket upgrades, locale redirect, security headers, queue consumer, retention clean-up
  router.tsx                  Per-request QueryClient, SSR integration, locale rewrite, default components
  routes.ts                   Route constants shared by links, guards and head metadata
  routes/                     69 locale-free file routes + 5 API handlers
  modules/{feature}/          42 domain modules — schema, Zod, types, constants, utils
    *.accessors.ts              unauthenticated data access (reads and writes), 25 files
    use-cases/*.ts              createServerFn + validation + authorization + query/mutation options, 149 files
  modules/_core/              Shared error codes, HTTP statuses, currency, pagination, CSV, column filters
  integrations/{vendor}/      15 vendors: better-auth, stripe, drizzle-orm, resend, cloudflare-r2, cloudflare-turnstile, inpost, use-intl,
                                fumadocs, mdxeditor, tanstack-query, realtime-invalidation, gsap, lenis, react-day-picker
  presentation/               1170 files — shadcn baseline (58), feature UI, data grid, emails, styles, theme, branding
  durable-objects/            RealtimeInvalidationHub
  providers/                  Theme and translation providers
  hooks/                      Shared React hooks
  lib/                        background (ALS + waitUntil), cookie, image, incident-alert, rate-limit, request, retention, security-headers, seo, sitemap, url
  data/                       Fixtures still backing unfinished admin screens, and the blog's article list
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

| File                            | Responsibility                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `auth.server.ts`                | Better Auth configuration only: adapter, providers, plugins, rate limits, and the hooks and email senders it names.     |
| `auth.constants.ts`             | Better Auth's limits, the auth paths it guards and audits, and its refusals.                                            |
| `auth.hooks.server.ts`          | The request gate, the database hooks and the password-reset, verification and deletion hooks.                           |
| `auth.audit.server.ts`          | The `signInAudit` and `accountSecurityAudit` plugins.                                                                   |
| `auth.email-delivery.server.ts` | `deliverAuthEmail`, `requireAuthEmailDelivery` and `recordAuthEmailFailure` for the account e-mails.                    |
| `auth.access.ts`                | Roles, the permission statement matrix, `hasAdminAccess`, `needsTwoFactorSetup` and `hasPermission`.                    |
| `auth.middleware.ts`            | `withRequest`, `authorized(permission?)`, `withRateLimit`, `assertWithinRateLimit` — trust boundary.                    |
| `auth.session.ts`               | Per-request session memoization, the client session query options and `clearCacheOnUserChange`.                         |
| `auth.routes.ts`                | `requireSignedIn`, `requireAdminRole`, `requireAdmin`, `requireCustomer`, `redirectIfSignedIn` and post-auth redirects. |
| `auth.client.ts`                | Browser auth client with the matching plugin set.                                                                       |
| `auth.constraints.ts`           | Password length bounds shared by the server config and the Zod schemas.                                                 |
| `auth.errors.ts`                | Maps Better Auth API error codes to translation keys.                                                                   |

## Problems worth talking about

### Consistency without transactions

D1 has no interactive transactions. `db.batch()` is atomic, but anything that must read, decide, then write cannot be one statement — so the usual "wrap it in a transaction" answer is unavailable.

**Inventory reservation puts the decision in the write.** The reserve path is an `UPDATE` guarded on `quantityAvailable >= qty`, which SQLite checks and applies in one statement, using `.returning()` length as the success signal. Overselling is prevented by that `gte` predicate rather than by locking, and two checkouts buying the same piece at once both succeed while the stock covers them. Multi-line carts reserve concurrently and compensate: if any line fails its guard, the already-succeeded reservations are released before the error propagates. Release itself is clamped in SQL — `min(quantityReserved, qty)` and `max(0, quantityReserved - qty)` — so a double release cannot create stock.

The compensation is **best-effort and deliberately documented as such**: its own failure is caught and logged, so a failed rollback leaves stock reserved. The honest description of this design is a saga with a known hole, not a distributed transaction.

**Checkout idempotency is layered, because the application guard alone cannot be atomic.** `resolvePendingCheckout` refuses to act unless the checkout row still reads `pending`, which collapses Stripe's _sequential_ retries. That read and the fulfil batch are separate round-trips, so two genuinely concurrent deliveries can both pass it — necessary, but not sufficient.

The constraint that actually holds is in the database. [`20260924120000_checkout_idempotency_constraints.sql`](src/integrations/drizzle-orm/migrations/20260924120000_checkout_idempotency_constraints.sql) creates `order_checkoutId_unique` on `order.checkout_id` and `payment_transactionId_unique` on `payment.transaction_id`. A batch is atomic on D1, so the losing delivery's `INSERT` violates the index and the whole batch rolls back, leaving exactly one order. The status flip additionally carries `WHERE status = 'pending'`. The integration suite drives two deliveries that both observe `pending` and asserts one order results; removing the unique index makes that test fail.

### Authorization lives at the RPC boundary

A server function is a public HTTP endpoint. It is reachable whether or not the route that normally calls it was ever loaded, so a route guard cannot protect it.

Route `beforeLoad` guards exist here and are honest about their job: `requireSignedIn`, `requireAdmin` and `requireCustomer` redirect, for navigation UX, and they also run client-side. The actual boundary is the `authorized()` middleware, applied to **96 server functions**. It resolves the session, throws `AppError(UNAUTHORIZED)` when there is none, and — for the 71 calls that pass a permission — throws `AppError(FORBIDDEN)` unless the role's compiled Better Auth access-control role authorizes that statement and the admin has two-factor authentication on. The remaining 25 require only an authenticated session. The statement matrix in `auth.access.ts` is the real authorization source, not decoration: `product` splits `create`/`read`/`update`/`delete`/`publish`, `order` splits `read`/`update`/`refund`, `content` splits `read`/`update`, `settings` has `manage`, and `user` inherits Better Auth's admin statements. Refunding an order asks for `order: ["refund"]` on top of `order: ["update"]`, and cancelling one checks `order: ["refund"]` in its handler once the order turns out to have a payment to refund.

Customer-facing reads take a different route: **ownership predicates compiled into the SQL**, `eq(order.userId, session.user.id)` in the `WHERE` clause rather than a fetch-then-filter. A foreign order id returns no row, which makes IDOR structurally absent rather than conventionally avoided.

The authorization tests compile the Drizzle condition with `SQLiteSyncDialect` and assert the exact generated SQL and bound parameters. A refactor that drops an ownership predicate fails the suite instead of silently widening access. Catalog read endpoints are table-driven to assert they reject _before_ their query mock is touched.

### Session freshness versus per-request cost

Better Auth is configured with a 300-second signed cookie cache, and every server-side session read then passes `disableCookieCache: true` and hits D1 anyway. That looks contradictory; it is a deliberate trade.

The cost is one D1 read per HTTP request. The benefit is that a banned or signed-out user cannot ride a cached cookie for five minutes. To stop that becoming N reads, `getRequestSession` memoizes the in-flight promise in a `WeakMap` keyed on the `Request` object — not a module global, which is what makes it safe in a Worker isolate serving many requests concurrently. Loaders, middleware and server functions within one request share a lookup; a new request always revalidates.

The browser's copy is revalidated the same way. Route guards and components share one TanStack Query entry, `getCurrentSessionQuery`, filled by the `getCurrentSession` server function through `getRequestSession` rather than by Better Auth's `useSession` and its `/api/auth/get-session` endpoint, and the server render of a guarded page dehydrates it into the HTML. What can lag is that cached copy: it stays fresh for 60 seconds and does not refetch on window focus or reconnect, so open storefront chrome can show a revoked session as signed-in until something refetches it. A navigation into `/account` or `/admin` always re-checks. A change of user is handled in one place: `clearCacheOnUserChange`, which `getRouter` installs in the browser only, watches the query cache and, whenever the session switches to a different user, removes every cached query except the session itself and the translation catalogues. Sign-out is a full page load, which discards the cache. What reaches the browser is projected — `toClientSession` destructures `session.token` away before returning.

D1 is the sole auth store: `storeSessionInDatabase`, `customStorage: authRateLimitStorage` for rate limiting, which counts Better Auth's requests with the application's own `withinRateLimit`, and `storeInDatabase` with hashed identifiers for verification tokens. Better Auth's `storage: "database"` is not used: whenever one of its counters started a new window it deleted every `rate_limit` row older than its longest window, 60 seconds, which would have wiped the hourly and daily caps on the e-mails visitors can request a minute after they began. No `secondaryStorage` is configured. KV was rejected for sessions, verification tokens and rate-limit counters because it is eventually consistent and cannot do the atomic consume-and-increment those need. That choice is pinned by a test asserting the option is absent.

Rate limiting is itself one atomic statement: an `INSERT … ON CONFLICT DO UPDATE` whose `set` resets or increments the counter depending on whether the window has elapsed, with `setWhere` admitting the request only while under the limit, and `.returning()` length as the verdict. If the storage throws, the request is **rejected** rather than admitted. Client identity comes from `cf-connecting-ip`, which Cloudflare sets and a client cannot forge.

### Background work on a runtime that kills floating promises

A promise still pending when a Worker returns its response is terminated. Better Auth's `advanced.backgroundTasks` hooks and the domain layer's audit recorders have no access to the `ExecutionContext`, and threading `ctx` through every call site would be invasive.

[`src/server.ts`](src/server.ts) enters an `AsyncLocalStorage` carrying `waitUntil` around the framework handler, and `scheduleBackgroundWork` pulls it back out at arbitrary depth. When no store exists — the queue consumer, unit tests, the paths that short-circuit before the ALS — it degrades to a fire-and-forget wrapped in a `catch`, so failures are logged rather than silently dropped.

Audit events are enqueued to `AUDIT_LOG_QUEUE` rather than written inline, with ids and timestamps minted at enqueue time so ordering survives batching (`max_batch_size: 50`, `max_batch_timeout: 5`, `max_retries: 3`). A batch that still fails moves to the queue's `-dlq` dead-letter queue, which the same Worker consumes one message at a time with five-minute retries, so one entry the insert rejects no longer takes the rest of its batch with it. 61 typed recorder functions cover a 61-entry action catalogue across all seven declared categories. Admin order actions resolve the signed-in admin as the actor, and Better Auth's password, e-mail, two-factor, session, role, ban and account deletion changes are recorded from the `accountSecurityAudit` plugin, `onPasswordReset` and `databaseHooks.user.delete.after`.

### Realtime cache invalidation

Admin dashboards go stale the moment a second person is working. Polling is the usual answer and it is wasteful.

A Durable Object acts as a connection fan-out hub — one object per audience, addressed by name (`admin`, `storefront`). The upgrade handshake reaches it via `fetch`, because a WebSocket upgrade has no choice, but invalidations use a **native RPC method**, `hub.notifyInvalidation(prefixes)`, avoiding Request/Response construction on the hot path. The hub holds no durable state; it is a broadcaster, not a store.

Matching is a **symmetric prefix overlap** — deliberately broader than TanStack Query's one-directional prefix match — so a narrowly-scoped publish still invalidates the coarser prefix a tab subscribed to. Clients subscribe to a fixed prefix list (14 admin keys, 11 storefront keys, both declared in `realtime-invalidation.subscriptions.ts` and `satisfies readonly QueryKey[]`); the hub broadcasts to the audience and each tab discards what does not overlap. A `BroadcastChannel` mirrors invalidations across tabs in the same browser without opening a second socket.

Admin upgrades are role-checked **in the Worker, before the Durable Object is addressed**. A DO `fetch` has no cookie or session context of its own, so checking after `getByName()` would already have let an unauthenticated client open the object.

### Catalog modelling

Products carry localized content as typed JSON maps — `titles` non-null, `subtitles`/`descriptions`/`tags` nullable — rather than a translations table, so a product reads in one query. Every change of a variant's `price` or `compare_at_price` is recorded in `price_history` by triggers on `product_variant`, inside the statement that makes it, and the storefront uses that history to show a reduction only when the price is below the lowest price of the 30 days before it, striking that lowest price through and naming it next to the reduced price, as Polish law requires. Storefront search runs against `storefront_search`, an FTS5 index of the Polish and English text that triggers on `product`, `product_category` and `product_collection` keep current, ranked by `bm25`. Admin product search is an `instr(lower(cast(column as text)), lower(?)) > 0` over each locale's `json_extract` from those JSON columns, which matches `%` and `_` literally and, unlike a `LIKE` pattern, has no 50-byte limit on D1.

Variants, options, attributes and the category/collection junctions are replaced as a **single `db.batch`** through `runDrizzleBatch`, so a product edit is atomic across nine tables. Point reads — by handle, by id, stats, the `json_each` aggregates — are prepared once at module load (eight prepared statements in the product accessors alone); list queries are built per request because the variant-stats join, filters and sort change shape and a prepared statement cannot.

Reordering is one `UPDATE` with a generated `CASE WHEN` over an `IN` list rather than N round-trips. The attribute path chunks at 30 rows against D1's bind limit; the product, category and collection paths do not yet.

### Locale-first routing

Route files carry no locale segment. The router rewrites instead — `rewrite.input` de-localizes the URL before matching and `rewrite.output` re-applies the prefix when generating links, so `_storefront.blog.$slug.tsx` serves both `/en-US/blog/x` and the bare Polish path. Locales are BCP-47 (`pl-PL` default, `en-US`); the default collapses to no prefix, and a redundant `/pl-PL/...` URL is 301'd to the bare path by `resolveLocale` in the Worker, before the router runs. Bare language aliases such as `/pl` and `/en` canonicalize to the full tag. `/api`, `/rpc`, `/_serverFn` and `/assets` are excluded from all of it.

One consequence worth knowing: because the router only ever sees the de-localized path, anything deriving locale from router location silently yields the default. `getCurrentLocale()` reads the real request URL and is the single derivation used everywhere — including by server functions, whose `/_serverFn` URLs carry no locale prefix at all.

Message catalogues are split into 56 namespaces per locale, so a page ships the always-on root namespaces plus what its route and layout ancestors declare in `staticData.namespaces` — not the whole catalogue. A test asserts file by file that Polish contains every key English does.

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
| `bun run test:e2e` / `test:e2e:pr` / `test:e2e:stripe`      | Browser tests: every project, Chromium only, or one payment through a Stripe sandbox. |
| `bun run build:preview` / `build:production`                | Clean `dist`, compile content, build the Worker for that mode, then verify it.        |
| `bun run start`                                             | Serve the last preview build at `127.0.0.1:3000`.                                     |
| `bun run deploy:preview` / `deploy:production`              | Check config and keys, build, migrate, deploy, then check the live site.              |
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
| Statements | 21 135 / 21 135 | 100%    | 100             |
| Branches   | 9 712 / 9 712   | 100%    | 100             |
| Functions  | 5 905 / 5 905   | 100%    | 100             |
| Lines      | 20 236 / 20 236 | 100%    | 100             |

1 109 test files — 435 unit, 98 integration and 576 component — hold 13 709 tests, many of them generated by 607 `it.each`, `test.each` and `describe.each` tables, across about 170 000 lines of test code. Coverage includes all of `src/**/*.{ts,tsx}`, excluding tests and fixtures, test infrastructure, the generated route tree, the migrations folder and declaration files, and the shadcn primitives.

Every configured threshold is 100%, so a change that leaves a statement, branch, function or line uncovered fails `bun run test:coverage` and CI. `autoUpdate` is off, so the thresholds never move on their own.

What the suite is aimed at, beyond the number:

- **Authorization** — assert the compiled SQL predicate and bound parameters, so dropping an ownership filter breaks the build.
- **Checkout idempotency** — drive two concurrent webhook deliveries that both observe `pending` and assert exactly one order.
- **Rate limiting** — fire concurrent sign-ins against the real Better Auth limiter over in-memory SQLite and assert the admitted/rejected split and the final counter.
- **Session cache** — shared pending lookup, revalidation on a new `Request`, anonymous/authenticated isolation, and that a rejection does not poison the next request.
- **i18n** — every English key exists in Polish, file by file.

Browser tests are separate: Playwright drives the built test Worker in Chromium and WebKit against a local D1 database, with Stripe and Resend emulated inside the Worker and InPost's point search answered in the browser, and the opt-in `stripe-test-mode` project pays one checkout through a Stripe sandbox when its keys are set. One honest limit: the integration transport emulates batch atomicity but not D1's parameter ceiling, so concurrency results are SQLite's, not proof against D1 under production load.

## Database and deployment

### Bindings per environment

| Binding                     | Type           | `development`                | `preview`                 | `production`                |
| --------------------------- | -------------- | ---------------------------- | ------------------------- | --------------------------- |
| `DB`                        | D1             | `martebizuteria-preview`     | `martebizuteria-preview`  | `martebizuteria`            |
| `CACHE`                     | KV             | `d6727c71…`                  | `d6727c71…`               | `4126270a…`                 |
| `IMAGES`                    | R2             | `martebizuteria-preview`     | `martebizuteria-preview`  | `martebizuteria`            |
| `AUDIT_LOG_QUEUE`           | Queue          | `…-audit-log-preview`        | `…-audit-log-preview`     | `martebizuteria-audit-log`  |
| `NEWSLETTER_QUEUE`          | Queue          | `…-newsletter-preview`       | `…-newsletter-preview`    | `martebizuteria-newsletter` |
| `REALTIME_INVALIDATION_HUB` | Durable Object | `RealtimeInvalidationHub`    | `RealtimeInvalidationHub` | `RealtimeInvalidationHub`   |
| `ASSETS`                    | Static assets  | `./public`                   | `./public`                | `./public`                  |
| Worker name                 |                | `martebizuteria-development` | `martebizuteria-preview`  | `martebizuteria`            |

**`development` and `preview` are the same D1 database, the same KV namespace, the same R2 bucket and the same queues.** Only the Worker name and `APP_ENV` differ. Production has its own bucket, so media uploaded while developing never reaches it. Treat the development environment as "preview with hot reload", not as a sandbox.

To get real isolation for local work, create your own resources and point the `development` environment at them:

```sh
bunx wrangler login
bunx wrangler d1 create martebizuteria-local
bunx wrangler kv namespace create CACHE --env development
bunx wrangler queues create martebizuteria-audit-log-local
bunx wrangler queues create martebizuteria-audit-log-local-dlq
bunx wrangler queues create martebizuteria-newsletter-local
bunx wrangler queues create martebizuteria-newsletter-local-dlq
```

Then replace `database_id`, the KV `id` and every queue name under `env.development` in `wrangler.jsonc`, in the producers, the consumers and their `dead_letter_queue`, keeping the binding names and `migrations_dir` unchanged, and run `bun run typegen`.

### Migrations

Module schemas are collected by [`drizzle.schemas.ts`](src/integrations/drizzle-orm/drizzle.schemas.ts): 41 tables from 38 modules, each exported with its relations where it has any. The FTS5 search index `storefront_search` is declared in its module but left out of that file, because a hand-written migration creates it. Generate a migration with:

```sh
bun run db:generate
```

Review and commit the SQL under `src/integrations/drizzle-orm/migrations/` together with the schema change. The deploy scripts apply pending migrations right before `wrangler deploy`, while the previous Worker is still serving, so a migration only adds what that Worker can live with; drops and renames wait for a later release. See [Roll back a deploy](content/docs/guides/roll-back-a-deploy.en-US.mdx).

Migrations are applied by `wrangler d1 migrations apply` in filename order, which is the authority here: there are currently **87 `.sql` files**, while Drizzle's `meta/_journal.json` lists 52, because several were hand-written rather than generated. Do not trust the journal count, and do not renumber existing files.

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
| [Production Deployment](.github/workflows/deploy-production.yml) | CI passing for a push to `main`; manual       | `deploy:production` for the tested tip of `main`, or for a SHA given by hand.    |

CI runs with a 25-minute timeout and cancels superseded runs on the same ref. Production deploys only after CI, including the Chromium end-to-end suite, has passed for a push to `main`: the workflow starts on `workflow_run` and deploys the commit CI tested only while it is still the tip of `main`, so re-running an older commit's CI deploys nothing. Started by hand, it takes the full SHA of a commit and refuses one without a passing CI run for a push to `main`, which is how a known-good commit is redeployed. Preview deployments are keyed on the PR number and cancel in progress; production deploy jobs queue on a single `production` group and never cancel, so a push cannot overtake the deploy before it.

Preview is a **shared environment**: each successful PR deployment replaces the previous one, on the same Worker, the same D1 database and the same KV namespace. There is no per-PR Worker or database.

Both deploy workflows use GitHub `environment: preview` / `environment: production`. Configure these in repository settings:

| Kind     | Name                                                                                                                                                                                                                           | Purpose                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Secret   | `CLOUDFLARE_ACCESS_TOKEN`                                                                                                                                                                                                      | Passed as `CLOUDFLARE_API_TOKEN`; needs Worker deploy, D1 edit, plus all the bindings it uses. |
| Secret   | `CLOUDFLARE_ACCOUNT_ID`                                                                                                                                                                                                        | Account holding the Worker, D1, KV, R2, queue and Durable Object.                              |
| Secret   | `AUTH_SECRET`, `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `INPOST_API_TOKEN`, `INPOST_ORGANIZATION_ID`, `RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY` | The Worker secrets that `prepare-deploy-secrets.ts` uploads.                                   |
| Variable | `VITE_APP_URL`, `VITE_R2_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`                                                                                                                                        | Browser-visible values baked into the client bundle at build time.                             |

`CLOUDFLARE_ACCESS_TOKEN` also needs the Workers Routes edit and Zone read permissions on the `martebizuteria.pl` zone, because each deploy attaches the custom domains listed under `routes` in `wrangler.jsonc`.

The Stripe test-mode job in `e2e-full.yml` reads two repository secrets, `E2E_STRIPE_SECRET_KEY` (`sk_test_`) and `E2E_STRIPE_PUBLISHABLE_KEY` (`pk_test_`), from a Stripe sandbox with no webhook endpoint; without them its spec is skipped. See [Testing](content/docs/tooling/testing.en-US.mdx).

The deploy jobs `touch .env.<environment>` and rely on the process environment, because `verify-stripe-keys.ts`, `verify-turnstile-keys.ts`, `verify-email-sender.ts` and `prepare-deploy-secrets.ts` prefer `process.env[name]` over the file. The deploy scripts apply the environment's pending D1 migrations themselves, so a pull request's migration reaches the shared preview database with its preview deploy, and keep schema changes backward compatible with the currently deployed Worker.

Use one deployment owner. If a Cloudflare Workers Builds trigger is also connected to this repository, disable it so a push does not deploy twice or bypass the CI gate.

### Manual preview and production deployment

```sh
cp .env.example .env.preview
# Fill in preview secrets and Stripe test keys, then:
bun run deploy:preview
```

```sh
cp .env.example .env.production
# Fill in production secrets, live Stripe keys and the Turnstile widget's keys, then:
bun run deploy:production
```

Each deploy script runs eight stages in order before it deploys, and each one fails the deploy rather than warning:

1. [`verify-bindings.ts`](scripts/verify-bindings.ts) reads the same JSONC Wrangler reads and rejects a missing or placeholder `DB` id, `CACHE` id, `IMAGES` bucket, `AUDIT_LOG_QUEUE` or `NEWSLETTER_QUEUE` producer without a matching consumer or with a consumer that names no consumed dead-letter queue, or a renamed Durable Object class, and refuses a production deploy whose `IMAGES` bucket is the preview one.
2. [`verify-stripe-keys.ts`](scripts/verify-stripe-keys.ts) reads the mode of `VITE_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` from their prefixes. Production needs `pk_live_` with `sk_live_` or a restricted `rk_live_`, preview needs `pk_test_` with `sk_test_` or `rk_test_`, and a missing key or a publishable key whose mode differs from the secret key's fails everywhere. It prints the mode, never a key.
3. [`verify-turnstile-keys.ts`](scripts/verify-turnstile-keys.ts) rejects a missing `VITE_TURNSTILE_SITE_KEY` or `TURNSTILE_SECRET_KEY`, a Cloudflare testing key paired with a widget's key, and Cloudflare's testing keys in production, which pass every visitor. It prints the kind of keys, never a key.
4. [`verify-email-sender.ts`](scripts/verify-email-sender.ts) asks Resend whether it would send as `RESEND_EMAIL_FROM` with `RESEND_API_KEY`, and rejects a display-name sender, `onboarding@resend.dev`, or a domain that is missing from the Resend account or not verified, printing the DNS records still to publish. With a sending-only key it reads the domain through the optional `RESEND_MANAGEMENT_API_KEY`, or else sends one test e-mail to `delivered@resend.dev`.
5. `build:preview` / `build:production` clears `dist`, compiles content, and builds with `CLOUDFLARE_ENV` and `--mode` both set to the target environment.
6. [`verify-build.ts`](scripts/verify-build.ts) checks that `.wrangler/deploy/config.json` points at `dist/server/wrangler.json`, that the built Worker's `APP_ENV` and name match the requested environment, that `main` and `dist/client` exist with fonts, CSS and JavaScript — and then transpile-scans every client chunk and **fails on any `cloudflare:workers` or `node:*` import** that leaked into the browser bundle.
7. [`prepare-deploy-secrets.ts`](scripts/prepare-deploy-secrets.ts) writes a `0600` secrets file containing only the keys declared in `secrets.required`, which is what keeps `CLOUDFLARE_*` management credentials out of the Worker.
8. `db:migrate:preview` / `db:migrate:production` applies the migrations the target database has not recorded yet. A failing migration is rolled back on its own, the ones before it stay applied, and nothing is deployed.

Only then does `wrangler deploy` run, against the generated `dist/server/wrangler.json` with `CLOUDFLARE_ENV` unset so the generated config is used verbatim. Builds alone deploy nothing and apply no migrations.

Last, [`verify-deployment.ts`](scripts/verify-deployment.ts) asks the environment's `workers.dev` host for `/`, `/products`, `/robots.txt`, `/api/webhooks/stripe` and `/api/health`, and fails the job unless the two pages answer `200` with HTML, `robots.txt` answers `200` as plain text, the webhook route refuses a `GET` with `405` and the health check answers `200`, which it does only when D1, KV and R2 answer. A failing page is asked up to three times, five seconds apart. The new version is live by then, so a failure is a signal to roll back: `vp exec wrangler rollback --env <environment>` puts the previous Worker version back, and [Roll back a deploy](content/docs/guides/roll-back-a-deploy.en-US.mdx) covers redeploying a known-good commit and what to do once a migration has run.

Before production takes real orders, work through the [go-live checklist](content/docs/guides/go-live-checklist.en-US.mdx). [Backup and restore](content/docs/guides/backup-and-restore.en-US.mdx) covers D1 Time Travel and what a restore erases, the regular export kept outside Cloudflare, which has to drop and recreate the `storefront_search` FTS5 table around `wrangler d1 export`, and the copy of the image bucket.

## Localization and content

Supported locales are `pl-PL` (default) and `en-US`, declared in [`i18n.config.ts`](src/integrations/use-intl/i18n.config.ts) together with the `marte_locale` cookie name and the `Europe/Warsaw` default time zone. The time zones customers pick from are `TIMEZONES` in [`timezone.ts`](src/modules/_core/constants/timezone.ts).

Polish uses unprefixed paths, because it is the default. English uses the full BCP-47 tag — `/en-US/products`. A redundant `/pl-PL/...` URL is 301'd to the bare path in the Worker, and bare language aliases (`/pl`, `/en`) canonicalize to the full tag.

- **UI messages** live in `messages/{locale}/` as 56 dotted-namespace JSON files, using the same keys, ICU arguments and rich-text tags across locales. A test asserts Polish parity with English file by file.
- **Route namespaces** are declared in `staticData.namespaces`; a page loads the always-on root namespaces plus what its route and layout ancestors ask for. Loaders fetch messages and data in one `Promise.all`.
- **Documentation** lives in `content/docs/` as `slug.{locale}.mdx` with `meta.{locale}.json` for navigation. It compiles through Fumadocs into `.source/`, which is generated — edit the MDX, never the output.
- **Legal pages** — `/terms-of-service`, `/privacy-policy` and `/exchanges-and-returns` — are rows in the D1 `content_page` table, with titles, descriptions and Markdown bodies as per-locale JSON maps. The [`20261002120000_content_pages.sql`](src/integrations/drizzle-orm/migrations/20261002120000_content_pages.sql) migration creates the table and seeds the privacy and returns pages, and [`20261005200000_terms_of_service_page.sql`](src/integrations/drizzle-orm/migrations/20261005200000_terms_of_service_page.sql) seeds the terms of service, both without overwriting existing rows. [`20261005210000_returns_and_complaints_page.sql`](src/integrations/drizzle-orm/migrations/20261005210000_returns_and_complaints_page.sql) replaces the seeded returns text, which contradicted Polish consumer law, only while both languages still match it, and [`20261010200000_privacy_policy_page.sql`](src/integrations/drizzle-orm/migrations/20261010200000_privacy_policy_page.sql) replaces the seeded privacy policy the same way with one that names the processors, the transfers to the US, the retention periods and every cookie and browser storage key the site sets. [`20261010210000_privacy_policy_account_deletion.sql`](src/integrations/drizzle-orm/migrations/20261010210000_privacy_policy_account_deletion.sql) then says in each language whose sentence is unedited that deleting the account ends the newsletter subscription. [`20261010232000_faq_page.sql`](src/integrations/drizzle-orm/migrations/20261010232000_faq_page.sql) adds the FAQ at `/faq` without overwriting an existing row: answers about ordering, payment, invoices, delivery, returns, complaints, the account and the newsletter taken from the checkout and the terms, and general advice on caring for silver and gold jewellery. The withdrawal and complaint forms the pages link are PDFs in `public/forms`, and the order confirmation email attaches the withdrawal form, read through the `ASSETS` binding, next to the seller's details, the longest fulfilment time of the ordered products, the withdrawal and complaint rules with the out-of-court routes, and links to the three pages. Admins edit them with MDXEditor at `/admin/content`, styled with the same prose class as the storefront page. A save publishes immediately, is refused if someone else saved the page after it was opened, and moves the "Last updated" date of each locale whose title or body changed. A new locale needs a migration that adds it to every row's maps before it can be translated in the editor.
- **Emails** load their `emails.*` namespace in the sending use case and pass `locale` and `messages` into the template. Email templates contain markup only, and never call a browser-side hook.
- **Links** use `LocalizedLink` or `ROUTES.*`; the router's `rewrite.output` adds the prefix. Raw URLs outside the router, such as email links and the email-verification and password-reset callbacks, are built with `buildLocalizedUrl`. The Google sign-in `callbackURL` is the current page's `location.publicHref`, which is already localized.
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
- Order emails have no outbox. A send is tried three times within one request's `waitUntil`, and one that still fails waits for the admin's Resend email on the order; the failed payment email belongs to no order and cannot be resent.
- `order.status` becomes `completed` only when an admin marks the order delivered through `mark-order-delivered`. The admin revenue and average-order-value cards filter on `eq(order.status, "completed")`, so paid orders that have not been marked delivered are left out of them.
- No refund restocks by itself. The admin returns an order's items with the Refund dialog's box or Return to stock, every line at once and only for a fully refunded order, so a partial return has no restock path.
- `isAdminPathname` uses `pathname.includes(ROUTES.ADMIN)`, so a storefront URL containing that substring is misclassified — which changes the theme, the pending component and the sidebar preference.

**Missing infrastructure**

- No reconciliation job. The only Cron Trigger runs the daily retention clean-up, which releases no stock, so stale inventory reservations are reclaimed only when Stripe emits `checkout.session.expired`, 32 minutes after a Checkout Session opens.
- An audit entry that still cannot be written after the dead-letter queue retries it on its own three times is dropped; its failures email `RESEND_EMAIL_FROM`. Better Auth's `/admin/revoke-user-session`, which names a session only by its token, and `/admin/impersonate-user` are not recorded in the audit log.
- The default browser suite never loads Stripe.js. Only the opt-in `stripe-test-mode` project pays in Stripe's real card form, and only where Stripe sandbox keys are configured.
- A newsletter batch that still fails on its third attempt stops its campaign, which cannot be resumed; the stop is audited and emails `RESEND_EMAIL_FROM`.

**Security hardening**

- `AppError` carries a typed code but no HTTP status, so a denial surfaces to the client as a generic RPC failure that the UI maps by code string rather than by status.
- Rate limiting is per-IP only, with no per-account lockout. A distributed credential-stuffing attempt is not slowed by it.
- A new checkout counts the open checkouts of its client address and email before it reserves stock, but the count and the reservation are separate statements, so simultaneous requests can each pass it. The per-address rate limit and the single-use Turnstile token bound how many get through.
- Once visitors have made the shop send 50 verification, password-reset and newsletter emails in a day, further ones are skipped until the day rolls over, so a flood that gets past the bot check can still delay real sign-ups for the rest of that day. Each skipped email is recorded in the audit log, and order emails are not affected.
- Editing an open checkout runs no bot check and gives it a fresh 32-minute session, so the server edits a checkout only during the first 32 minutes after it opened and then makes the browser open a new one behind a new token. One passed check can still hold stock for up to about an hour.
- Audit-log IP resolution falls back to `x-forwarded-for`, which a client can spoof. Rate limiting is unaffected — it reads only `cf-connecting-ip`.
- The browser's cached session stays fresh for 60 seconds and does not refetch on window focus or reconnect, so storefront chrome such as the navigation link and the wishlist can show a revoked or ended session, including a sign-out in another tab, until something refetches it. Navigating into `/account` or `/admin` re-checks, and every server-side read revalidates.

**Unfinished or fixture-backed**

- InPost's tracking status is shown on the order but does not move it: the admin still marks an InPost parcel shipped and delivered.
- `/admin/settings` renders from `src/data/`. The admin order list and detail page are fully database-backed, as are their fulfil, ship, mark-delivered, cancel and refund actions.
- The blog is hidden until it has real articles. `src/data/blog-posts.ts` lists none, so `/blog` and `/blog/$slug` answer 404 and neither the home page nor the sitemap mentions the blog. An article's page shows only its title and description, so the first article also needs a body.
- The `CACHE` KV binding is declared and verified at deploy time but never read.

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
- **Keep coverage at 100%.** Cover new code in the same change; never lower the thresholds in `vite.config.ts` to make a change pass.

Agent guidance is vendored: `bun run skills:sync` rebuilds `.agents/skills` from [`skills-lock.json`](skills-lock.json) and links it into `.claude/skills`, replacing whatever is in those directories. Keep custom guidance elsewhere. Project conventions for agents live in [`AGENTS.md`](AGENTS.md).

For documentation corrections, verify commands and file paths against the implementation before submitting. For behaviour changes, describe the resulting behaviour, the validation you ran, and any gap the change leaves open.

## Licensing

The source code is shared under **CC BY-NC 4.0** for educational purposes. See [`LICENSE.md`](LICENSE.md) for the full terms, including the attribution and non-commercial conditions.

No copyright, trademark or other intellectual property rights are claimed over the name "M'Arte" or over any names, logos or branding used here. Third-party assets and dependencies retain their own licences.
