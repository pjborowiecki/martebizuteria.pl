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

| Area                     | Current implementation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storefront catalog       | Products, variants, options, categories, collections and attributes from D1. Localized search, faceted filtering, sorting and pagination. Product, category and collection detail pages by handle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Cart                     | Kept in the browser: a Zustand store persisted to `localStorage` as `marte-cart`. Every storefront page with a non-empty basket re-checks availability and prices against live inventory and the catalogue through `checkCartAvailability`, keeps the basket's prices current and shows a store-wide banner while a line is unavailable. The `cart` and `cart_item` tables are declared in the schema, but nothing reads or writes them.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Checkout                 | Four steps (contact, billing address, delivery, payment) with lazily loaded step components, a persisted draft, a discount code field, free delivery above a threshold the owner sets, Stripe Payment Element, and webhook-driven fulfilment. Open checkouts are capped at five per client address and three per email, and an order holds at most ten of one piece.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Payments and fulfilment  | Stripe Checkout Sessions, `/api/webhooks/stripe` with signature and live/test mode verification and a check that a test event belongs to this deployment, idempotent order placement, inventory reservation with compensation, refunds that restock only when the admin says the goods came back, never twice per order.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Customer accounts        | Better Auth email/password with required verification, Google sign-in, two-factor auth with backup codes, password change and recovery, a password added with **Set** to an account created with Google, a change of email address confirmed from both addresses that keeps every address the account has used, multi-session, order history, addresses, saved cards, a wishlist, active sessions and login history. A guest order paid with the email of a verified account is filed under that account, and an account that verifies its email takes over the earlier guest orders placed with any of its addresses while it held them, or with that address while no account held it. Each user can choose a time zone and a format locale for dates, prices and numbers; without a saved choice both are detected per request.                                               |
| Admin sign-in            | Password plus two-factor authentication: the admin panel, admin permissions, the admin socket and Better Auth's admin endpoints wait until it is on, and `/admin/security` is where a new admin turns it on. That requirement applies only in production and in the end-to-end test build; in development and preview two-factor authentication is optional. Google sign-in also works for admins and skips the shop's code, so the Google account's own 2-Step Verification stands in for it.                                                                                                                                                                                                                                                                                                                                                                                   |
| Transactional email      | Resend with React Email templates: verify, change and reset emails, the notice of a changed address to the old one, password changed, account deleted, order confirmation, in progress (fulfilment started), shipped, a new or changed tracking number, delivered, cancelled, refunded, failed payment, withdrawal acknowledgement, and the shop's notices of new orders, withdrawals and incidents. Order emails are retried twice under Resend idempotency keys. Previewable at `/dev/emails`. Emails any visitor can ask for (verification, password reset, newsletter, and the acknowledgement of a withdrawal sent by order number) are capped at three per address and kind an hour and 50 a day for the shop; the other order emails are never held back.                                                                                                                 |
| Newsletter               | Double opt-in sign-up, and a composer at `/admin/marketing/new` that sends a Polish and English letter to every confirmed subscriber in their language, in batches of 100 through a Cloudflare Queue with a dead-letter queue, with one-click unsubscribe headers, a test send, an audit entry, an alert if a campaign stops part way, and no second send of the same campaign. `/admin/marketing/subscribers` lists the subscribers by status (pending, confirmed, unsubscribed) and can unsubscribe one or erase one together with its newsletter audit entries.                                                                                                                                                                                                                                                                                                               |
| Admin catalog            | Products, variants, categories, collections and attributes: permission-checked CRUD, reordering, localized content editing, R2 image upload, stats cards, and an export of every list as CSV, JSON, XML or plain text.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Admin orders             | Database-backed list and detail page with tabs, filters, stats and an export as CSV, JSON, XML or plain text that can include the buyer's company and NIP, a printable order summary that is not a VAT invoice, plus fulfil, ship with tracking, mark delivered, cancel, refund and return-to-stock actions, webhook-flagged disputes, audit trail, customer and shop emails, and Resend email for one that still failed. **Back to previous step** undoes one fulfilment step at a time without emailing the customer, a shipped order's tracking number can be added or corrected (the customer is emailed the new number), an InPost order can be shipped by hand in InPost Manager when ShipX is not connected, and an order whose carrier is not InPost is shipped by hand with the tracking number and link the admin enters. VAT shows under the total as included in it. |
| Discounts                | Percentage, fixed-amount and free-shipping codes with date, usage, per-customer and minimum-order limits, applied to the Stripe Checkout Session as a one-off coupon and managed at `/admin/coupons`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Admin customers          | Database-backed customer list and detail, order counts and spend aggregates, the same export as the other admin lists, and a change of a customer's email address that customer care starts after the customer names an order placed while signed in and its delivery postal code, confirmed from the new address.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Admin settings           | `/admin/settings`: the admin's own profile, panel language, time zone and date format, password, two-factor authentication, sign-in methods, signed-in devices and sign-in history, a Store details tab for the seller's legal name, address, NIP, REGON, contact email and phone, which the storefront, the emails and the legal pages show, a Delivery tab for the delivery methods (names in Polish and English, carrier, price, offered or hidden, archived, checkout order) and the free delivery threshold, and a Team tab that gives verified customer accounts admin access and takes it away, never your own and never the last admin's, after a recent sign-in.                                                                                                                                                                                                        |
| Audit log                | Cloudflare Queue producer/consumer with a dead-letter queue, 75 typed recorder functions over an 83-entry action catalogue in seven categories, admin order actions and account security changes credited to whoever made them, email verifications and guest-order claims recorded, admin list with category and date filters.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Realtime invalidation    | Durable Object fan-out hub per audience, WebSocket subscriptions for 23 admin and 15 storefront query prefixes, 3 of them followed by the checkout, `BroadcastChannel` mirroring across tabs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Monitoring               | Workers Logs and Issues, `/api/health` reading D1, KV and R2 for an uptime monitor, and e-mails to `RESEND_EMAIL_FROM` when a paid checkout creates no order, a Stripe event fails, an audit batch fails, a newsletter stops part way, an order email still fails after its retries or a refund fails after Stripe reported it, at most once per incident.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Data retention           | A daily Cron Trigger in preview and production deletes or anonymises ended checkouts, old activity, sign-in and audit entries, lapsed newsletter sign-ups and expired sessions, tokens and rate-limit rows; orders, payments and withdrawals stay.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Documentation and legal  | Fumadocs-backed `/docs` with 105 pages per locale. The terms of service, privacy policy, exchanges-and-returns and FAQ pages are Markdown in the D1 `content_page` table, edited with MDXEditor at `/admin/content`. Customers withdraw from a contract online at `/withdraw-from-contract` or on the order's page in their account.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Scaffolded, not finished | InPost shipments are booked, labelled and tracked from the admin order page through ShipX, but InPost's status does not move the order: the admin still marks it shipped and delivered.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Hidden until written     | The blog is hidden until `src/data/blog-posts.ts` lists an article.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Not present              | A stock reconciliation job.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

The built-in roles are `admin` and `customer`; new accounts receive `customer`. See [Known gaps](#known-gaps) for the specifics behind the last three rows.

## Documentation

The application serves its own documentation at `/docs`, in English (`en-US`) and Polish (`pl-PL`). Source MDX lives in [`content/docs/`](content/docs) as `slug.{locale}.mdx` with `meta.{locale}.json` navigation, and is compiled by Fumadocs through `bun run content`.

| Section           | Covers                                                                                                                                                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project`         | What the project is, its roadmap, how to contribute, and the licence.                                                                                                                                                                                                               |
| `getting-started` | Prerequisites, installation, environment variables, first run, project scripts, preview deployment.                                                                                                                                                                                 |
| `architecture`    | Directory structure, layering, dependency rules, modules and use cases, the presentation, integrations and platform layers, request lifecycle, caching and SSR, i18n, security model, realtime, testing.                                                                            |
| `features`        | One page per area: landing page, catalog and search, product page, cart, checkout, payments, orders, inventory, shipping and delivery, discounts, account, the admin dashboard, catalog and customers, audit log, legal pages, email, internationalization.                         |
| `guides`          | Task recipes — a module, a use case, server functions, forms, an admin page, a data table, URL state, messages, theming, a migration, seeding, tests — and operations: security checklist, local debugging, rollback, monitoring, image delivery, backups, data retention, go-live. |
| `integrations`    | Per-vendor notes for TanStack Start and Query, Drizzle/D1, Better Auth, Stripe, InPost, Resend, R2, use-intl, Fumadocs, realtime invalidation, GSAP and Lenis.                                                                                                                      |
| `ui`              | Theme, fonts and branding, the shadcn components, the data table, composition patterns.                                                                                                                                                                                             |
| `tooling`         | Vite+, scripts, lint and format, testing, the database, CI/CD, conventional commits, agent skills.                                                                                                                                                                                  |
| `reference`       | Conventions, file naming, modules, routes, environment, permissions, glossary, troubleshooting, FAQ.                                                                                                                                                                                |

This README is the operational summary. The docs site is the reference; when the two disagree, the code wins and both should be corrected.

## Technology

| Responsibility           | Implementation                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Application and routing  | React 19, TypeScript, TanStack Start and Router with locale URL rewriting                                                 |
| Toolchain                | Bun 1.4.0 and Vite+ 1.1.0 — dev server, build, format, lint, type check and tests from one `vite.config.ts`               |
| Hosting                  | Cloudflare Workers with smart placement, Workers Logs and Workers Issues enabled                                          |
| Storage                  | D1 (SQLite) for all application data, R2 for media, KV (`CACHE`) for short-lived flags, static assets binding             |
| Coordination             | Durable Object (`RealtimeInvalidationHub`) and Cloudflare Queues for the audit log and the newsletter                     |
| Database access          | Drizzle ORM and checked-in SQLite migrations applied by Wrangler; Zod schemas are written by hand, without the tables     |
| Auth and authorization   | Better Auth (admin, multi-session, two-factor plugins) with D1 as the sole store                                          |
| Data and forms           | TanStack Query and Table, React Hook Form with Zod resolvers, `nuqs` for URL state, Zustand                               |
| UI                       | Tailwind CSS 4, shadcn-styled components over Base UI, Lucide icons, Recharts, Embla, Vaul, Sonner                        |
| Motion and scrolling     | GSAP and Lenis loaded on demand; Lenis smooth scroll for mouse and trackpad, synchronized with the router                 |
| Localization and content | `use-intl` with ICU messages split by namespace, Fumadocs and MDX for docs, MDXEditor for legal pages                     |
| External services        | Stripe for payments, Resend for email, InPost for parcel-locker lookup and shipments, MapLibre for locker maps            |
| Verification             | Vite+/Vitest with node, integration and jsdom component projects; Testing Library; Playwright against a local test Worker |

[`package.json`](package.json) and [`bun.lock`](bun.lock) define the toolchain. `overrides` resolves Vite to `@voidzero-dev/vite-plus-core@1.1.0` and pins Vitest at 5.0.3, the versions Vite+ 1.1.0 ships with, so use the repository scripts rather than globally installed binaries.

## Getting started

### Prerequisites

- **Bun 1.4.0**, matching `packageManager` and the CI setup action.
- **Node.js 24**, matching `voidzero-dev/setup-vp` in CI. Node's `node:sqlite` also backs the integration test harness.
- The `vp` CLI from Vite+. `bun install` runs `vp config --no-agent` during `prepare`.
- A Cloudflare account with access to the project's D1, R2, KV, Queue and Durable Object bindings, plus Stripe and Resend credentials. The development server talks to **remote** resources; only the `test` environment of the end-to-end suite runs entirely on local ones (see [Run the end-to-end suite](#run-the-end-to-end-suite)).

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

`.env.test` is committed and contains dummy values. It is what CI copies over `.env.development` and `.env.preview` so that checks and builds can run without real credentials, what the Vitest projects load, and what `vp build --mode test` bakes into the end-to-end test Worker.

### Apply migrations and run the dev server

```sh
bun run db:migrate:development
bun run dev
```

The server listens on <http://localhost:3000> with `strictPort` enabled. The `dev` script sets `CLOUDFLARE_ENV=development` before `vp dev --mode development`, and the Cloudflare Vite plugin enables `remoteBindings` **only** when that variable equals `development` — so local development reads and writes the real remote D1, R2, KV and Queue.

> **The `development` and `preview` Wrangler environments bind the same D1 database.**
>
> Both declare `database_name: "martebizuteria-preview"` and `database_id: 1660d0df-fff9-463b-bbc6-dec65f754302`, the same `CACHE` KV namespace `d6727c712d3443cc9e79be1bf42a6f0c`, the same `martebizuteria-preview` R2 bucket, and the same `martebizuteria-audit-log-preview` and `martebizuteria-newsletter-preview` queues with their `-dlq` dead-letter queues. Only `production` has its own remote D1 database (`2bf4f35e-0a01-43c0-8a10-df5cc84ceb89`), KV namespace and R2 bucket (`martebizuteria`); `test` uses local ones. The preview bucket has to exist before `bun run dev` can reach `IMAGES`; [Image delivery](content/docs/guides/image-delivery.en-US.mdx) creates and fills it.
>
> Consequences: local development writes land in the preview database that the deployed preview Worker serves. `db:migrate:development` and `db:migrate:preview` apply to the same database. Anything you delete while developing is deleted from preview. If you need isolation, create your own D1 database and point the `development` environment at it.

To exercise the Stripe webhook locally, forward events to the running server:

```sh
bun run stripe:listen
```

`STRIPE_WEBHOOK_SECRET` must match the secret the Stripe CLI prints, otherwise `/api/webhooks/stripe` rejects the delivery.

### Bootstrap an admin account

The remote databases have no admin seed. Sign up through `/auth/sign-up`, verify the email (Resend must be configured, because `requireEmailVerification` is enabled), then set that row's `user.role` to `admin` in the target database with Drizzle Studio or `wrangler d1 execute`:

```sh
bun run db:studio:development
```

After sign-in, the `/auth` route guard sends an `admin` user to `/admin` and a `customer` to `/account/overview`, unless the sign-in URL carries a same-site `?redirect` path.

In production and the end-to-end test build the admin panel requires two-factor authentication, so there the first visit lands on `/admin/security`: turn it on there with an authenticator app and keep the recovery codes. The requirement comes from `isAdminTwoFactorRequired` in `auth.access.ts`, which holds only when the build's mode is `production` or `test`; in development and preview two-factor authentication is optional and the panel opens without it. Admins sign in with their password and a code, or with Google: Better Auth's `twoFactor` plugin never asks for the code on that path, so the Google account's own 2-Step Verification takes its place. An account created with Google has no password, and turning two-factor authentication on asks for one, so it first adds one with **Set** (`setAccountPassword`), which accepts only a session signed in within the last 24 hours. See [Better Auth](content/docs/integrations/better-auth.en-US.mdx#two-factor-authentication-for-admins).

After that, **Settings** in the admin sidebar holds the admin's own account: name and phone, email address, panel language, time zone and date format, password, two-factor authentication, connected sign-in methods, signed-in devices and sign-in history. Its **Store details** tab holds the seller's details that the footer, product pages, emails and legal pages show, its **Delivery** tab holds the delivery methods the checkout offers and the free delivery threshold, and its **Team** tab gives further accounts admin access and takes it away, so only the first admin is made in the database. See [Admin settings](content/docs/features/admin-settings.en-US.mdx).

### Run the end-to-end suite

The Playwright suite never touches the shared remote resources. It runs against the fourth Wrangler environment, `test`: the Worker `martebizuteria-test`, whose entry [`src/platform/testing/worker.ts`](src/platform/testing/worker.ts) installs emulators for Stripe, Resend and InPost ShipX before serving the application, with a local D1 database persisted under `.wrangler/test` and local R2, KV and queues.

```sh
bun run test:e2e:install   # Chromium and WebKit for Playwright, once
bun run test:e2e:pr        # the Chromium projects CI runs
```

Outside CI, Playwright's web server prepares everything itself unless a server already answers on port 3000: `db:reset:test` deletes `.wrangler/test`, applies the migrations and runs [`scripts/seed-test.ts`](scripts/seed-test.ts), which loads the catalogue seeds and the test accounts of `e2e/data/accounts.ts` (the admin with two-factor authentication already on); `build:test` builds with `--mode test`, so admin two-factor authentication is enforced as in production; and `start:test` serves the build at `127.0.0.1:3000`. `bun run test:e2e:stripe` runs the `stripe-test-mode` project, which pays by card, BLIK and Przelewy24 in Stripe's real Payment Element when `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` hold the test keys of a Stripe sandbox, and is skipped otherwise. See [Testing](content/docs/tooling/testing.en-US.mdx).

## Configuration and integrations

### Environment files

Use `.env.development`, `.env.preview` and `.env.production`, matching the Wrangler environments and Vite modes of the same names. They are gitignored; [`.env.example`](.env.example) lists every key. Only `VITE_`-prefixed values reach browser code — never prefix a credential.

| Variable                                                                     | Purpose                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_R2_URL`                                                                | Public base URL of the environment's R2 bucket. Browser-visible and also declared as a Worker secret.                                                                                                                                                                |
| `VITE_STRIPE_PUBLISHABLE_KEY`                                                | Stripe publishable key used by the Payment Element: `pk_live_` in production, `pk_test_` elsewhere.                                                                                                                                                                  |
| `AUTH_SECRET`                                                                | Better Auth signing secret. Generate a distinct value per environment.                                                                                                                                                                                               |
| `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`                         | Google OAuth application credentials.                                                                                                                                                                                                                                |
| `RESEND_API_KEY`, `RESEND_EMAIL_FROM`                                        | Resend API key and a bare sender address on a domain verified in Resend, which also receives the shop's notices and alerts: the shop's address in production only, `hello@pjborowiecki.com` in preview and development (`onboarding@resend.dev` also works locally). |
| `RESEND_MANAGEMENT_API_KEY`                                                  | Optional Resend Full access key the deploy check uses to read the sender domain's DNS records. **Never uploaded to the Worker.**                                                                                                                                     |
| `STRIPE_SECRET_KEY`                                                          | Stripe server key for intents, refunds and customers: `sk_live_` or `rk_live_` in production, test keys elsewhere.                                                                                                                                                   |
| `STRIPE_WEBHOOK_SECRET`                                                      | Secret used to verify `/api/webhooks/stripe` deliveries.                                                                                                                                                                                                             |
| `INPOST_API_TOKEN`, `INPOST_ORGANIZATION_ID`                                 | InPost ShipX token and organisation id for shipments from the admin; blank turns them off. InPost's sandbox outside production.                                                                                                                                      |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, `CLOUDFLARE_ACCESS_TOKEN` | Drizzle Kit credentials for Studio, introspect and push over the D1 HTTP API. **Never uploaded to the Worker.**                                                                                                                                                      |

Server code reads secrets through `env` from `cloudflare:workers`. The ten keys listed in `secrets.required` for each environment in [`wrangler.jsonc`](wrangler.jsonc) are the authoritative deployment list: `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `INPOST_API_TOKEN`, `INPOST_ORGANIZATION_ID`, `RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `VITE_R2_URL`. [`scripts/prepare-deploy-secrets.ts`](scripts/prepare-deploy-secrets.ts) uploads exactly those and fails if one is missing or blank, except the two InPost keys, which may be blank, which keeps the Cloudflare management credentials out of the Worker.

### Domains and branding

The canonical URL is configured in source, not in an environment file. Rebuild after changing any of these.

| Location                                                                       | What to configure                                                                                                                |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| [`src/presentation/branding/app.ts`](src/presentation/branding/app.ts)         | `APP_DOMAIN` (`martebizuteria.pl`), the derived `APP_URL`, `APP_NAME`, icon, OG image dimensions, theme colour, R2 fallback URL. |
| [`src/presentation/branding/socials.ts`](src/presentation/branding/socials.ts) | Social profile links.                                                                                                            |
| [`src/modules/_core/constants/api.ts`](src/modules/_core/constants/api.ts)     | `appHostsForMode` — the hosts Better Auth accepts per mode, and `isLocalMode`, which also controls secure cookies.               |
| [`wrangler.jsonc`](wrangler.jsonc)                                             | Worker names and custom domains per environment, and every binding id.                                                           |
| [`src/presentation/styles/`](src/presentation/styles)                          | Theme tokens, typography, font declarations, and the storefront/admin stylesheet split.                                          |
| [`public/`](public)                                                            | `favicon.svg`, `og.png`, `llms.txt`, `_headers`, self-hosted fonts, screenshots and video.                                       |

The seller's legal name, NIP, REGON, postal address, contact email and phone are not in source. They are stored in D1 and edited under **Settings → Store details** (`/admin/settings/store`) without a rebuild; the footer, the about page, every product page, the checkout's pickup step, the emails, the structured data and the legal pages read them from there. See [Admin settings](content/docs/features/admin-settings.en-US.mdx).

`appHostsForMode` currently allows `preview.martebizuteria.pl` plus `martebizuteria-preview.pjborowiecki.workers.dev` for preview, `martebizuteria.pl` plus `martebizuteria.pjborowiecki.workers.dev` for production, and `localhost:3000`/`127.0.0.1:3000` for development and test. Adding a host means editing that file — an unknown host makes Better Auth reject the request. `preview.martebizuteria.pl` is also attached to the preview Worker as a custom domain by `routes` in `wrangler.jsonc`. Production keeps `routes: []` until the shop goes live, so for now it is served only at `martebizuteria.pjborowiecki.workers.dev`. Both keep `workers_dev: true` for the deploy's live-site check, and a test beside `api.ts` asserts that preview's `routes` match its hosts and that production has none. No `www` host is attached; `APP_URL` is the bare domain. A deploy makes each Worker's custom domains match `routes`, so one attached by hand in the dashboard is detached, and the `martebizuteria.pl` zone has to be active in the deploying account; [Deploy a preview](content/docs/getting-started/deploy-preview.en-US.mdx) covers conflicting DNS records.

### Provider setup

- **Google OAuth.** Google is the only social sign-in. Its callback URL is `https://<host>/api/auth/callback/google`. A provider sign-in is linked to an existing account with the same e-mail address only when the provider reports that address as verified, and OAuth tokens are encrypted at rest.
- **Resend.** Configure the API key and a verified sender before testing sign-up, because `requireEmailVerification` blocks sign-in until the address is verified. Add the sender's domain at [resend.com/domains](https://resend.com/domains) and publish the DKIM (`resend._domainkey` TXT) and SPF (`send` MX and TXT) records it lists; locally, `onboarding@resend.dev` works but delivers only to the Resend account owner. `bun run email:verify <environment>` checks the key and sender, and the deploy scripts run the same check. Every e-mail carries the contact email saved under **Settings → Store details** as its `Reply-To` (`kontakt@martebizuteria.pl` as the migration filled it in), so customer replies reach the shop whatever sender is configured; when the details cannot be read, the e-mail still goes out without a `Reply-To`. Each new order, each withdrawal sent online and each incident that needs the owner is also emailed to the shop at `RESEND_EMAIL_FROM`, in every environment. Templates live in [`src/presentation/emails/`](src/presentation/emails) and are previewable at `/dev/emails`.
- **Stripe.** Use test keys for development and preview and live keys for production; the deploy scripts refuse any other pairing. Create the webhook endpoint at `https://<host>/api/webhooks/stripe` in the same mode as the keys, on the API version the SDK uses (`STRIPE_API_VERSION`, `2026-09-30.endive`), and store its signing secret. The route logs and acknowledges without acting on events from the other mode, and test-mode events whose checkout's `deployment` metadata names another deployment, so one Stripe sandbox can serve several deployments without one fulfilling another's checkouts. Handlers live in [`src/integrations/stripe/stripe.webhooks.ts`](src/integrations/stripe/stripe.webhooks.ts) and cover ten events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`, `refund.failed` and `refund.updated`.
- **R2.** Admin media upload writes to the `IMAGES` binding with a one-year immutable `Cache-Control` and stores the object key. Reads go through the public `VITE_R2_URL`: the preview bucket's `r2.dev` address for development and preview, and the custom domain `images.martebizuteria.pl` for production, where the storefront resizes images with Cloudflare Image Transformations. Stored `r2.dev` URLs are moved onto `VITE_R2_URL` when they are read, so changing it needs no data rewrite. Pages are served with a Content-Security-Policy that allows images and video only from that host, its `/cdn-cgi/image/` resizes included, and the bundled `r2.dev` bucket, so the build-time and the Worker value of `VITE_R2_URL` must match. [Image delivery](content/docs/guides/image-delivery.en-US.mdx) lists the one-time setup.
- **InPost.** [`src/integrations/inpost/inpost.api.ts`](src/integrations/inpost/inpost.api.ts) calls the public points API, with no credentials, by city to power locker selection during checkout and by name to confirm the chosen locker when the payment session is opened: a locker InPost does not list is refused, and one InPost cannot confirm within three seconds goes ahead and is flagged "Locker not confirmed" on the admin order. [`src/integrations/inpost/inpost.shipx.server.ts`](src/integrations/inpost/inpost.shipx.server.ts) books shipments, downloads PDF labels and reads their status through ShipX from the admin order page. It needs the token and organisation id from the API section of InPost Manager as `INPOST_API_TOKEN` and `INPOST_ORGANIZATION_ID`, calls InPost's sandbox outside production, and is off while they are blank: the order page then explains how to ship by hand — create the parcel in InPost Manager, then mark the order shipped with its tracking number — and the customer's email, the account's order page and the admin's order page link that number to InPost's tracking page through `resolveOrderTrackingUrl`. Register `https://<host>/api/webhooks/inpost` as the webhook address in InPost Manager to have status changes read back without a refresh; the route reads each named shipment back from ShipX instead of trusting the call, and answers `429` to an address past 120 calls a minute.
- **Cloudflare Queues and Durable Object.** All are declared per environment in `wrangler.jsonc`. The audit log and newsletter queues and their `-dlq` dead-letter queues need to exist before deploying; `scripts/verify-bindings.ts` refuses a configuration where either producer queue has no consumer, or its consumer names no dead-letter queue that the Worker also consumes.

## Project structure and conventions

```text
content/
  docs/                       Localized MDX documentation (105 pages per locale) and meta.{locale}.json
messages/{locale}/            61 JSON namespace files per locale
public/                       Fonts, favicon, OG image, llms.txt, _headers, screenshots, video
scripts/                      verify-bindings, verify-stripe-keys, verify-email-sender, verify-build, verify-deployment, prepare-deploy-secrets, seed-test, sync-skills, commit-msg
src/
  server.ts                   Worker entry: sitemap, robots, WebSocket upgrades, locale redirect, security headers, queue consumer, retention clean-up
  router.tsx                  Per-request QueryClient, SSR integration, locale rewrite, default components
  routes.ts                   Route constants shared by links, guards and head metadata
  routes/                     78 locale-free route files (including __root and the two PDF form routes) + 5 API handlers
  modules/{feature}/          40 modules, one per database table of the same name — schema, Zod, types, constants, utils, accessors and use cases, nothing else
    *.accessors.ts              unauthenticated data access (reads and writes), 30 files
    use-cases/*.ts              createServerFn + validation + authorization + query/mutation options, 219 files
                                (139 server functions; 80 server-side operations — e-mail senders, webhook steps, queue consumers, audit recorders, retention clean-ups, product save and list steps)
  modules/_core/              Shared error codes, HTTP statuses, currency, pagination, column filters
  integrations/{vendor}/      14 vendors: better-auth, stripe, drizzle-orm, resend, cloudflare-r2, inpost, use-intl,
                                fumadocs, mdxeditor, tanstack-query, realtime-invalidation, gsap, lenis, react-day-picker
  presentation/               1,503 files (834 outside tests) — shadcn baseline (57), feature UI, data grid, emails, styles, theme, branding
  durable-objects/            RealtimeInvalidationHub
  providers/                  Theme and translation providers
  hooks/                      Shared React hooks, including the cart's persisted Zustand store
  lib/                        background (ALS + waitUntil), catalog-debug-log, cookie, deployment (live-site check), image, incident-alert,
                                rate-limit, request, retention, security-headers, seo, sitemap, url
  data/                       The blog's article list, the landing page's media paths and the sitemap's static pages
  platform/testing/           D1-shaped transport over node:sqlite, server-function driver, render and message helpers,
                                and worker.ts, the end-to-end test Worker with its provider emulators
  types/                      Generated Worker declarations, router and Vite ambient types
```

Routes coordinate loading and rendering. Business operations live in modules. The split that does the most work is **`accessors` vs `use-cases`**: accessors are plain data access with no notion of who is asking; use cases wrap them in `createServerFn`, attach the `authorized()` middleware, validate input with the module's Zod schema, and export the TanStack Query `queryOptions`/`mutationOptions` next to the operation they fetch.

That has two consequences worth stating. A loader and the component that later refetches share one query key and one fetcher by construction, because both import the same exported options. And there is exactly one layer where authorization can be forgotten — which is the layer the tests target.

Conventions that are enforced rather than suggested:

- **Import from the defining file.** There are no barrel files and no constant bags. The formatter's 17 custom import groups give every file a layer-named import order automatically, so a misplaced dependency is visible in the diff.
- **Query and mutation keys are readonly tuples** owned by the feature's `*.constants.ts`. Inputs that change the result belong in the key. Invalidate only what a mutation changes.
- **Server-only code is marked.** Files that must never reach the client import `@tanstack/react-start/server-only` or are named `*.server.ts`. `scripts/verify-build.ts` fails the build if a client asset still imports `cloudflare:workers` or a `node:*` module, or carries Drizzle ORM.
- **Tests sit beside their owner** in `__test__/` directories, which the router's `routeFileIgnorePattern` excludes from route generation.

Authentication and authorization entry points are in [`src/integrations/better-auth/`](src/integrations/better-auth):

| File                            | Responsibility                                                                                                                                                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.server.ts`                | Better Auth configuration only: adapter, providers, plugins, rate limits, and the hooks and email senders it names.                                                                                                                                                    |
| `auth.constants.ts`             | Better Auth's limits, the auth paths it guards and audits, and its refusals.                                                                                                                                                                                           |
| `auth.hooks.server.ts`          | The request gate, the database hooks and the password-reset, verification and deletion hooks.                                                                                                                                                                          |
| `auth.audit.server.ts`          | The `signInAudit` and `accountSecurityAudit` plugins.                                                                                                                                                                                                                  |
| `auth.email-delivery.server.ts` | `deliverAuthEmail`, `requireAuthEmailDelivery` and `recordAuthEmailFailure` for the account e-mails.                                                                                                                                                                   |
| `auth.email-link.server.ts`     | `refuseSupersededEmailLink`, which the request gate runs on every `/verify-email` link to refuse one the address history has superseded.                                                                                                                               |
| `auth.email-change.server.ts`   | `confirmEmailChangeOwner`, which the request gate runs on `/change-email` to check the password or a recent sign-in, and `finishEmailChange`, the after hook that completes a change of address for the newsletter, links, other sessions, Stripe and the old address. |
| `auth.access.ts`                | Roles, the permission statement matrix, `hasAdminAccess`, `isAdminTwoFactorRequired`, `needsTwoFactorSetup` and `hasPermission`.                                                                                                                                       |
| `auth.middleware.ts`            | `withRequest`, `authorized(permission?)`, `withRateLimit`, `assertWithinRateLimit` — trust boundary.                                                                                                                                                                   |
| `auth.session.ts`               | Per-request session memoization, the client session query options and `clearCacheOnUserChange`.                                                                                                                                                                        |
| `auth.routes.ts`                | `requireSignedIn`, `requireAdminRole`, `requireAdmin`, `requireCustomer`, `redirectIfSignedIn` and post-auth redirects.                                                                                                                                                |
| `auth.client.ts`                | Browser auth client with the matching plugin set.                                                                                                                                                                                                                      |
| `auth.constraints.ts`           | Email, name and password limits shared by the server config and the Zod schemas.                                                                                                                                                                                       |
| `auth.zod.ts`                   | Zod schemas of the sign-in, sign-up, password, email-change and two-factor forms.                                                                                                                                                                                      |
| `auth.errors.ts`                | Maps Better Auth API error codes to translation keys.                                                                                                                                                                                                                  |

## Problems worth talking about

### Consistency without transactions

D1 has no interactive transactions. `db.batch()` is atomic, but anything that must read, decide, then write cannot be one statement — so the usual "wrap it in a transaction" answer is unavailable.

**Inventory reservation puts the decision in the write.** The reserve path is an `UPDATE` guarded on `quantityAvailable >= qty`, which SQLite checks and applies in one statement, using `.returning()` length as the success signal. Overselling is prevented by that `gte` predicate rather than by locking, and two checkouts buying the same piece at once both succeed while the stock covers them. A multi-line cart sends one guarded `UPDATE` per line in a single `db.batch`. The batch is atomic, but a guard that matches no row is not an error, so the lines that passed are committed; if any line failed its guard, a second batch releases those lines before the error propagates. Release itself is clamped in SQL — `min(quantityReserved, qty)` and `max(0, quantityReserved - qty)` — so a double release cannot create stock.

The compensation is **best-effort and deliberately documented as such**: its own failure is caught and logged, so a failed rollback leaves stock reserved. The honest description of this design is a saga with a known hole, not a distributed transaction.

**Checkout idempotency is layered, because the application guard alone cannot be atomic.** `resolvePendingCheckout` refuses to act unless the checkout row still reads `pending`, which collapses Stripe's _sequential_ retries. That read and the fulfil batch are separate round-trips, so two genuinely concurrent deliveries can both pass it — necessary, but not sufficient.

The constraint that actually holds is in the database. [`20260924120000_checkout_idempotency_constraints.sql`](src/integrations/drizzle-orm/migrations/20260924120000_checkout_idempotency_constraints.sql) creates `order_checkoutId_unique` on `order.checkout_id` and `payment_transactionId_unique` on `payment.transaction_id`. A batch is atomic on D1, so the losing delivery's `INSERT` violates the index and the whole batch rolls back, leaving exactly one order. The status flip additionally carries `WHERE status = 'pending'`. The integration suite drives two deliveries that both observe `pending` and asserts one order results; removing the unique index makes that test fail.

### Authorization lives at the RPC boundary

A server function is a public HTTP endpoint. It is reachable whether or not the route that normally calls it was ever loaded, so a route guard cannot protect it.

Route `beforeLoad` guards exist here and are honest about their job: `requireSignedIn`, `requireAdmin` and `requireCustomer` redirect, for navigation UX, and they also run client-side. The actual boundary is the `authorized()` middleware, applied to **115 server functions**. It resolves the session, throws `AppError(UNAUTHORIZED)` when there is none, and — for the 88 calls that pass a permission — throws `AppError(FORBIDDEN)` unless the role's compiled Better Auth access-control role authorizes that statement and, in production and the end-to-end test build, the admin has two-factor authentication on. The remaining 27 require only an authenticated session. The statement matrix in `auth.access.ts` is the real authorization source, not decoration: `product` splits `create`/`read`/`update`/`delete`/`publish`, `order` splits `read`/`update`/`refund`, `content` splits `read`/`update`, `settings` has `manage`, and `user` inherits Better Auth's admin statements. Giving or removing admin access asks for `user: ["set-role"]` and a sign-in from the last 24 hours (`recentSignIn`), and Better Auth's own role endpoints refuse every role change, so the Team rules cannot be skipped with a direct request. Refunding an order asks for `order: ["refund"]` on top of `order: ["update"]`, and cancelling one checks `order: ["refund"]` in its handler once the order turns out to have a payment to refund.

Customer-facing reads take a different route: **ownership predicates compiled into the SQL**, `eq(order.userId, session.user.id)` in the `WHERE` clause rather than a fetch-then-filter. A foreign order id returns no row, which makes IDOR structurally absent rather than conventionally avoided.

The authorization tests compile the Drizzle condition with `SQLiteSyncDialect` and assert the exact generated SQL and bound parameters. A refactor that drops an ownership predicate fails the suite instead of silently widening access. Catalog read endpoints are table-driven to assert they reject _before_ their query mock is touched.

### Session freshness versus per-request cost

Better Auth's signed session cookie cache is turned off (`session.cookieCache: { enabled: false }` in `auth.server.ts`), and every server-side session read also passes `disableCookieCache: true`, so each one hits D1. The 300 seconds in the configuration are `updateAge`, how often a used session's expiry is extended, not a cache lifetime.

The cost is one D1 read per HTTP request. The benefit is that a banned or signed-out user cannot ride a cached cookie for five minutes. To stop that becoming N reads, `getRequestSession` memoizes the in-flight promise in a `WeakMap` keyed on the `Request` object — not a module global, which is what makes it safe in a Worker isolate serving many requests concurrently. Loaders, middleware and server functions within one request share a lookup; a new request always revalidates.

The browser's copy is revalidated the same way. Route guards and components share one TanStack Query entry, `getCurrentSessionQuery`, filled by the `getCurrentSession` server function through `getRequestSession` rather than by Better Auth's `useSession` and its `/api/auth/get-session` endpoint, and the server render of a guarded page dehydrates it into the HTML. What can lag is that cached copy: it stays fresh for 60 seconds and does not refetch on window focus or reconnect, so open storefront chrome can show a revoked session as signed-in until something refetches it. A navigation into `/account` or `/admin` always re-checks. A change of user is handled in one place: `clearCacheOnUserChange`, which `getRouter` installs in the browser only, watches the query cache and, whenever the session switches to a different user, removes every cached query except the session itself, the display preferences and the translation catalogues, then refetches the display preferences so the new user's saved time zone and format locale apply. Sign-out is a full page load, which discards the cache. What reaches the browser is projected — `toClientSession` destructures `session.token` away before returning.

D1 is the sole auth store: `storeSessionInDatabase`, `customStorage: authRateLimitStorage` for rate limiting, which counts Better Auth's requests with the application's own `withinRateLimit`, and `storeInDatabase` with hashed identifiers for verification tokens. Better Auth's `storage: "database"` is not used: whenever one of its counters starts a new window it deletes every `rate_limit` row older than its longest window, 60 seconds, which would wipe the hourly and daily caps on the e-mails visitors can request a minute after they begin. No `secondaryStorage` is configured. KV is not used for sessions, verification tokens and rate-limit counters because it is eventually consistent and cannot do the atomic consume-and-increment those need. That choice is pinned by a test asserting the option is absent.

Rate limiting is itself one atomic statement: an `INSERT … ON CONFLICT DO UPDATE` whose `set` resets or increments the counter depending on whether the window has elapsed, with `setWhere` admitting the request only while under the limit, and `.returning()` length as the verdict. If the storage throws, the request is **rejected** rather than admitted. Client identity comes from `cf-connecting-ip`, which Cloudflare sets and a client cannot forge.

### Background work on a runtime that kills floating promises

A promise still pending when a Worker returns its response is terminated. Better Auth's `advanced.backgroundTasks` hooks and the domain layer's audit recorders have no access to the `ExecutionContext`, and threading `ctx` through every call site would be invasive.

[`src/server.ts`](src/server.ts) enters an `AsyncLocalStorage` carrying `waitUntil` around the framework handler, and `scheduleBackgroundWork` pulls it back out at arbitrary depth. When no store exists — the queue consumer, unit tests, the paths that short-circuit before the ALS — it degrades to a fire-and-forget wrapped in a `catch`, so failures are logged rather than silently dropped.

Audit events are enqueued to `AUDIT_LOG_QUEUE` rather than written inline, with ids and timestamps minted at enqueue time so ordering survives batching (`max_batch_size: 50`, `max_batch_timeout: 5`, `max_retries: 3`). A batch that still fails moves to the queue's `-dlq` dead-letter queue, which the same Worker consumes one message at a time with five-minute retries, so one entry the insert rejects does not take the rest of its batch with it. 75 typed recorder functions in the seven `record-*-audit.server.ts` use cases of `audit-log` cover an 83-entry action catalogue across all seven declared categories. Admin order actions resolve the signed-in admin as the actor, and Better Auth's password, e-mail, two-factor, session, role, ban and account deletion changes are recorded from the `accountSecurityAudit` plugin, the `finishEmailChange` hook, `onPasswordReset`, `afterEmailVerification` and `databaseHooks.user.delete.after`, together with the guest orders a newly verified account takes over (`customer.orders_claimed`).

### Realtime cache invalidation

Admin dashboards go stale the moment a second person is working. Polling is the usual answer and it is wasteful.

A Durable Object acts as a connection fan-out hub — one object per audience, addressed by name (`admin`, `storefront`). The upgrade handshake reaches it via `fetch`, because a WebSocket upgrade has no choice, but invalidations use a **native RPC method**, `hub.notifyInvalidation(prefixes)`, avoiding Request/Response construction on the hot path. The hub holds no durable state; it is a broadcaster, not a store.

Matching is a **symmetric prefix overlap** — deliberately broader than TanStack Query's one-directional prefix match — so a narrowly-scoped publish still invalidates the coarser prefix a tab subscribed to. Clients subscribe to a fixed prefix list (23 admin keys, 15 storefront keys and the checkout's 3 keys for delivery and the seller's details, all declared in `realtime-invalidation.subscriptions.ts` and `satisfies readonly QueryKey[]`); the hub broadcasts to the audience and each tab discards what does not overlap. A `BroadcastChannel` mirrors invalidations across tabs in the same browser without opening a second socket.

Admin upgrades are role-checked **in the Worker, before the Durable Object is addressed**. A DO `fetch` has no cookie or session context of its own, so checking after `getByName()` would already have let an unauthenticated client open the object.

### Catalog modelling

Products carry localized content as typed JSON maps — `titles` non-null, `subtitles`/`descriptions`/`tags` nullable — rather than a translations table, so a product reads in one query. Every change of a variant's `price` or `compare_at_price` is recorded in `price_history` by triggers on `product_variant`, inside the statement that makes it, and the storefront uses that history to show a reduction only when the price is below the lowest price of the 30 days before it, striking that lowest price through and naming it next to the reduced price, as Polish law requires. Storefront search runs against `storefront_search`, an FTS5 index of the Polish and English text that triggers on `product`, `product_category` and `product_collection` keep current, ranked by `bm25`. Admin product search is an `instr(lower(cast(column as text)), lower(?)) > 0` over each locale's `json_extract` from those JSON columns, which matches `%` and `_` literally and, unlike a `LIKE` pattern, has no 50-byte limit on D1.

Variants, options, attributes and the category/collection junctions are replaced as a **single `db.batch`** through `runDrizzleBatch`, so a product edit is atomic across nine tables. Point reads — by handle, by id, stats, the `json_each` aggregates — are prepared once at module load (nine prepared statements in the product accessors alone); list queries are built per request because the variant-stats join, filters and sort change shape and a prepared statement cannot.

Reordering is a handful of `UPDATE` statements rather than N round-trips. `chunkRankUpdates` in `drizzle.batch.ts` splits the new order into chunks of at most 49 rows, each one `UPDATE` with a generated `CASE WHEN` that binds two parameters per row and passes the chunk's ids as one JSON parameter through `json_each` (`inJsonList`), so no statement exceeds D1's 100 bound parameters; the chunks run in one `db.batch`. Products, categories, collections and attributes all reorder this way.

### Locale-first routing

Route files carry no locale segment. The router rewrites instead — `rewrite.input` de-localizes the URL before matching and `rewrite.output` re-applies the prefix when generating links, so `_storefront.blog.$slug.tsx` serves both `/en-US/blog/x` and the bare Polish path. Locales are BCP-47 (`pl-PL` default, `en-US`); the default collapses to no prefix, and a redundant `/pl-PL/...` URL is 301'd to the bare path by `resolveLocale` in the Worker, before the router runs. Bare language aliases such as `/pl` and `/en` canonicalize to the full tag. `/api`, `/rpc`, `/_serverFn`, `/assets` and `/forms` are excluded from all of it.

One consequence worth knowing: because the router only ever sees the de-localized path, anything deriving locale from router location silently yields the default. `getCurrentLocale()` reads the real request URL and is the single derivation used everywhere — including by server functions, whose `/_serverFn` URLs carry no locale prefix at all.

Message catalogues are split into 61 namespaces per locale, so a page ships the always-on root namespaces plus what its route and layout ancestors declare in `staticData.namespaces` — not the whole catalogue. A test asserts file by file that Polish contains every key English does.

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

Across roughly **111,300 hand-written lines** of application source, there are **no inline lint suppressions** outside generated declaration files. Exceptions are narrow, file-scoped overrides declared in `vite.config.ts` — relaxed magic numbers and loop awaits in tests, `consistent-return` off in presentation and hooks, unsafe assertions allowed only in `src/platform/testing/mocks/**`, key ordering off in `src/routes/**`, and `max-lines` off for `vite.config.ts` itself — rather than repo-wide rule removals.

Formatting, linting, testing and the dev/build pipeline are one toolchain (Vite+), configured in a single [`vite.config.ts`](vite.config.ts). The formatter runs at 140 columns without semicolons, sorts Tailwind classes against `globals.css` for `cn`/`cva`/`tw`, and applies the 17 custom import groups. Git hooks in [`.vite-hooks/`](.vite-hooks) run `vp check --fix` on staged files and validate commit messages.

## Commands and verification

Use `bun run test`, not `bun test` — the latter bypasses the configured Vitest projects.

| Command                                                      | Purpose                                                                                |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `bun run dev`                                                | Compile content, then start the dev server with **remote** development bindings.       |
| `bun run typegen`                                            | Regenerate `worker-configuration.d.ts` and Fumadocs `.source/`. Neither is committed.  |
| `bun run content`                                            | Compile the `content/docs` MDX only.                                                   |
| `bun run check`                                              | Format, lint and type check — the gate CI runs.                                        |
| `bun run check:fix`                                          | The same, applying supported fixes.                                                    |
| `bun run check:staged`                                       | Lint and type check staged files without reformatting.                                 |
| `bun run format` / `format:check` / `lint`                   | Run one stage of the gate on its own.                                                  |
| `bun run test`                                               | Run the node, integration and component projects.                                      |
| `bun run test:unit` / `test:integration` / `test:component`  | Run one project.                                                                       |
| `bun run test:watch` / `test:changed`                        | Watch, or run only what changed.                                                       |
| `bun run test:coverage`                                      | Run with the configured coverage gate and write `coverage/`.                           |
| `bun run test:e2e` / `test:e2e:pr` / `test:e2e:stripe`       | Browser tests: every project, Chromium only, or card, BLIK, P24 in a Stripe sandbox.   |
| `bun run test:e2e:smoke` / `test:all`                        | The smoke spec in Chromium, or the Vitest projects followed by the smoke spec.         |
| `bun run build:preview` / `build:production`                 | Clean `dist`, compile content, build the Worker for that mode, then verify it.         |
| `bun run build:test` / `start:test`                          | Build the end-to-end test Worker with `--mode test`, or serve it at `127.0.0.1:3000`.  |
| `bun run db:migrate:test` / `db:seed:test` / `db:reset:test` | Migrate or seed the local test database in `.wrangler/test`, or delete it and do both. |
| `bun run start`                                              | Serve the last preview build at `127.0.0.1:3000`.                                      |
| `bun run deploy:preview` / `deploy:production`               | Check config and keys, build, migrate, deploy, then check the live site.               |
| `bun run db:generate`                                        | Generate a migration from the collected schemas.                                       |
| `bun run db:migrate:{local,development,preview,production}`  | Apply migrations to that database.                                                     |
| `bun run db:migrations:{development,preview,production}`     | List applied and pending migrations.                                                   |
| `bun run db:studio:{development,preview,production}`         | Open Drizzle Studio against that environment's `.env` file.                            |
| `bun run db:introspect:*` / `db:push:*`                      | Introspect or push the schema over the D1 HTTP API. Prefer generated migrations.       |
| `bun run stripe:listen`                                      | Forward Stripe CLI events to the local webhook route.                                  |
| `bun run clean` / `clean:deep` / `clean:hardcore`            | Remove build output, then `node_modules`, then the lockfile and `opensrc`.             |
| `bun run skills:sync` / `skills:update`                      | Restore or update the vendored agent skill directories from `skills-lock.json`.        |

`vp <name>` runs a Vite+ built-in and `vp run <name>` runs a package script, so `vp dev` and `vp run dev` are not the same thing. Prefer `bun run <script>` to pick the repository's tool versions.

### Test architecture and coverage

Three Vitest projects share one configuration:

| Project       | Environment | Matches                              | Purpose                                                        |
| ------------- | ----------- | ------------------------------------ | -------------------------------------------------------------- |
| `node`        | node        | `*.test.ts(x)`, excluding the others | Pure logic, SQL predicate assertions, server-function drivers. |
| `integration` | node        | `*.integration.test.ts(x)`           | Real SQL against `node:sqlite` behind a D1-shaped transport.   |
| `component`   | jsdom       | `*.component.test.ts(x)`             | Rendering with Testing Library and the project's providers.    |

Tests are colocated in `src/**/__test__/`. Shared infrastructure lives in [`src/platform/testing/`](src/platform/testing): a hand-written `D1Database` implementation over `node:sqlite` that can also observe every query, a driver that invokes a `createServerFn` through its real validators and middleware, message loading for translated assertions, and a render helper.

Coverage thresholds, from `test.coverage.thresholds` in `vite.config.ts`; `bun run test:coverage` writes the measured totals to `coverage/coverage-summary.json`:

| Metric     | Configured gate |
| ---------- | --------------- |
| Statements | 100%            |
| Branches   | 100%            |
| Functions  | 100%            |
| Lines      | 100%            |

1,242 test files — 482 unit, 136 integration and 624 component, in 224 `__test__` folders — use 703 `it.each`, `test.each` and `describe.each` tables across about 195,500 lines of test code. Coverage includes all of `src/**/*.{ts,tsx}`, excluding tests and fixtures, test infrastructure, the generated route tree, the migrations folder and declaration files, and the shadcn primitives.

Every configured threshold is 100%, so a change that leaves a statement, branch, function or line uncovered fails `bun run test:coverage` and CI. `autoUpdate` is off, so the thresholds never move on their own.

What the suite is aimed at, beyond the number:

- **Authorization** — assert the compiled SQL predicate and bound parameters, so dropping an ownership filter breaks the build.
- **Checkout idempotency** — drive two concurrent webhook deliveries that both observe `pending` and assert exactly one order.
- **Rate limiting** — fire concurrent sign-ins against the real Better Auth limiter over in-memory SQLite and assert the admitted/rejected split and the final counter.
- **Session cache** — shared pending lookup, revalidation on a new `Request`, anonymous/authenticated isolation, and that a rejection does not poison the next request.
- **i18n** — every English key exists in Polish, file by file.

Browser tests are separate: Playwright drives the built test Worker in Chromium and WebKit against a local D1 database, with Stripe, Resend and InPost ShipX emulated inside the Worker and InPost's point search answered in the browser. CI runs the Chromium projects on every pull request and push; the **E2E (full)** workflow adds WebKit on pushes to `main`, weekly and by hand, together with the `stripe-test-mode` project, which pays through a Stripe sandbox by card (declines and 3D Secure included), BLIK and Przelewy24 with the repository's sandbox keys. One honest limit: the integration transport emulates batch atomicity, D1's 100 bound parameters and its 50-byte `LIKE` pattern limit, but concurrency results are SQLite's, not proof against D1 under production load.

## Database and deployment

### Bindings per environment

| Binding                     | Type           | `development`                | `preview`                 | `test` (local only)       | `production`                |
| --------------------------- | -------------- | ---------------------------- | ------------------------- | ------------------------- | --------------------------- |
| `DB`                        | D1             | `martebizuteria-preview`     | `martebizuteria-preview`  | `martebizuteria-test`     | `martebizuteria`            |
| `CACHE`                     | KV             | `d6727c71…`                  | `d6727c71…`               | local namespace           | `4126270a…`                 |
| `IMAGES`                    | R2             | `martebizuteria-preview`     | `martebizuteria-preview`  | `martebizuteria-test`     | `martebizuteria`            |
| `AUDIT_LOG_QUEUE`           | Queue          | `…-audit-log-preview`        | `…-audit-log-preview`     | `…-audit-log-test`        | `martebizuteria-audit-log`  |
| `NEWSLETTER_QUEUE`          | Queue          | `…-newsletter-preview`       | `…-newsletter-preview`    | `…-newsletter-test`       | `martebizuteria-newsletter` |
| `REALTIME_INVALIDATION_HUB` | Durable Object | `RealtimeInvalidationHub`    | `RealtimeInvalidationHub` | `RealtimeInvalidationHub` | `RealtimeInvalidationHub`   |
| `ASSETS`                    | Static assets  | `./public`                   | `./public`                | `./public`                | `./public`                  |
| Worker name                 |                | `martebizuteria-development` | `martebizuteria-preview`  | `martebizuteria-test`     | `martebizuteria`            |

**`development` and `preview` are the same D1 database, the same KV namespace, the same R2 bucket and the same queues.** Only the Worker name and `APP_ENV` differ. Production has its own bucket, so media uploaded while developing never reaches it. Treat the development environment as "preview with hot reload", not as a sandbox. The `test` environment is the only isolated one: its bindings are local (`remote: false`, persisted under `.wrangler/test`), its entry point is `src/platform/testing/worker.ts`, and no script deploys it. Only preview and production run the daily `0 3 * * *` retention Cron Trigger.

`CACHE` holds short-lived keys only: the flag `resend.availability.server.ts` sets while the e-mail sender is unusable, the keys `incident-alert.server.ts` uses to send one alert per incident, and the key `/api/health` reads to prove KV answers.

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

Module schemas are collected by [`drizzle.schemas.ts`](src/integrations/drizzle-orm/drizzle.schemas.ts): 42 tables from 39 modules, each exported with its relations where it has any. The FTS5 search index `storefront_search` is declared in its module but left out of that file, because a hand-written migration creates it. Generate a migration with:

```sh
bun run db:generate
```

Review and commit the SQL under `src/integrations/drizzle-orm/migrations/` together with the schema change. The deploy scripts apply pending migrations right before `wrangler deploy`, while the previous Worker is still serving, so a migration only adds what that Worker can live with; drops and renames wait for a later release. See [Roll back a deploy](content/docs/guides/roll-back-a-deploy.en-US.mdx).

Migrations are applied by `wrangler d1 migrations apply` in filename order, which is the authority here: there are currently **108 `.sql` files**, while Drizzle's `meta/_journal.json` lists 52, because several were hand-written rather than generated. Do not trust the journal count, and do not renumber existing files.

| Command                          | Database affected                                                             |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `bun run db:migrate:local`       | Local `.wrangler` copy of the development database.                           |
| `bun run db:migrate:development` | Remote `martebizuteria-preview` — **the same one as preview**.                |
| `bun run db:migrate:preview`     | Remote `martebizuteria-preview`.                                              |
| `bun run db:migrate:production`  | Remote `martebizuteria`.                                                      |
| `bun run db:migrate:test`        | Local `martebizuteria-test` under `.wrangler/test`, for the end-to-end suite. |

`db:studio:*`, `db:introspect:*` and `db:push:*` use Drizzle Kit over the D1 HTTP API and need `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID` and `CLOUDFLARE_ACCESS_TOKEN` in the selected `.env` file. `db:push` bypasses migration history; prefer generated migrations for anything that will be deployed.

### Seeds — do not run them

[`src/integrations/drizzle-orm/seeds/`](src/integrations/drizzle-orm/seeds) holds eleven SQL files wired into `db:seed:preview` and `db:seed:production`. `db:seed:test` ([`scripts/seed-test.ts`](scripts/seed-test.ts)) loads the same files into the local end-to-end database, where that is safe.

> **The seed files are stale against the live preview database, and running them there overwrites data.**
>
> `delivery-methods.sql` only inserts what is missing (`INSERT OR IGNORE`). The other ten first `DELETE` the rows that would collide with the fixtures — a category, collection, attribute or product that reuses a seed handle under another id, a variant that reuses a seed SKU, and the images, inventory rows and attribute values of the two seed products that the fixtures do not list, together with every category and collection link of those products — and then upsert the fixtures with `ON CONFLICT(id) DO UPDATE` or `INSERT OR REPLACE`. Rows the admin created under other handles survive, but every admin edit to a seeded category, collection, attribute, product, variant, image or stock level is replaced by the fixture's old value. Several of the files have not been touched since early June.
>
> Do not run `db:seed:preview`, `db:seed:production` or the bare `db:seed`. If the fixtures ever need to be refreshed, regenerate them from the current database first and re-verify the id lists.

### Automatic GitHub deployments

All five workflows share the composite action at [`.github/actions/setup`](.github/actions/setup), which installs Bun 1.4.0 and, through `voidzero-dev/setup-vp`, Vite+ on Node 24, runs `bun install --frozen-lockfile --ignore-scripts`, optionally copies `.env.test` over `.env.development` and `.env.preview`, and then runs `bun run typegen`.

| Workflow                                                         | Trigger                                       | What it does                                                                                                       |
| ---------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [CI](.github/workflows/ci.yml)                                   | Pull requests and pushes to `main`            | `check` → `test:coverage` → `build:preview`, then uploads `coverage/`; in parallel, the Chromium end-to-end suite. |
| [E2E (full)](.github/workflows/e2e-full.yml)                     | Pushes to `main`, Mondays 03:15 UTC, manual   | WebKit end-to-end suite (Chromium too on the schedule and by hand), plus the Stripe test-mode job.                 |
| [E2E (reusable)](.github/workflows/e2e-reusable.yml)             | Called by CI and E2E (full)                   | `db:reset:test` → `build:test` → Playwright for one browser and its shop-wide project.                             |
| [Preview Deployment](.github/workflows/deploy-preview.yml)       | PRs to `main` (opened, synchronize, reopened) | Re-runs `check`, then `deploy:preview`, then comments the preview URL on the PR.                                   |
| [Production Deployment](.github/workflows/deploy-production.yml) | CI passing for a push to `main`; manual       | `deploy:production` for the tested tip of `main`, or for a SHA given by hand.                                      |

CI runs with a 25-minute timeout and cancels superseded runs on the same ref. Production deploys only after CI, including the Chromium end-to-end suite, has passed for a push to `main`: the workflow starts on `workflow_run` and deploys the commit CI tested only while it is still the tip of `main`, so re-running an older commit's CI deploys nothing. Started by hand, it takes the full SHA of a commit and refuses one without a passing CI run for a push to `main`, which is how a known-good commit is redeployed. Preview deployments are keyed on the PR number and cancel in progress; production deploy jobs queue on a single `production` group and never cancel, so a push cannot overtake the deploy before it.

Preview is a **shared environment**: each successful PR deployment replaces the previous one, on the same Worker, the same D1 database and the same KV namespace. There is no per-PR Worker or database.

Both deploy workflows use GitHub `environment: preview` / `environment: production`. Configure these in repository settings:

| Kind     | Name                                                                                                                                                                                                   | Purpose                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Secret   | `CLOUDFLARE_ACCESS_TOKEN`                                                                                                                                                                              | Passed as `CLOUDFLARE_API_TOKEN`; needs Worker deploy, D1 edit, plus all the bindings it uses. |
| Secret   | `CLOUDFLARE_ACCOUNT_ID`                                                                                                                                                                                | Account holding the Worker, D1, KV, R2, queue and Durable Object.                              |
| Secret   | `AUTH_SECRET`, `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `INPOST_API_TOKEN`, `INPOST_ORGANIZATION_ID`, `RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | The Worker secrets that `prepare-deploy-secrets.ts` uploads.                                   |
| Secret   | `RESEND_MANAGEMENT_API_KEY` (optional)                                                                                                                                                                 | Lets `verify-email-sender.ts` read the sender domain's DNS records; never uploaded.            |
| Variable | `VITE_R2_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`                                                                                                                                                           | Browser-visible values baked into the client bundle at build time.                             |

`CLOUDFLARE_ACCESS_TOKEN` also needs the Workers Routes edit and Zone read permissions on the `martebizuteria.pl` zone, because each deploy attaches the custom domains listed under `routes` in `wrangler.jsonc`.

The Stripe test-mode job in `e2e-full.yml` reads two repository secrets, `E2E_STRIPE_SECRET_KEY` (`sk_test_`) and `E2E_STRIPE_PUBLISHABLE_KEY` (`pk_test_`), from a Stripe sandbox with no webhook endpoint and with Cards, BLIK and Przelewy24 turned on. Both are set, so every E2E (full) run pays through the sandbox; without them its specs would be skipped and the job would warn that no payment reached Stripe. See [Testing](content/docs/tooling/testing.en-US.mdx).

The deploy jobs `touch .env.<environment>` and rely on the process environment, because `verify-stripe-keys.ts`, `verify-email-sender.ts` and `prepare-deploy-secrets.ts` prefer `process.env[name]` over the file. The deploy scripts apply the environment's pending D1 migrations themselves, so a pull request's migration reaches the shared preview database with its preview deploy, and keep schema changes backward compatible with the currently deployed Worker.

Use one deployment owner. If a Cloudflare Workers Builds trigger is also connected to this repository, disable it so a push does not deploy twice or bypass the CI gate.

### Manual preview and production deployment

```sh
cp .env.example .env.preview
# Fill in preview secrets and Stripe test keys, then:
bun run deploy:preview
```

```sh
cp .env.example .env.production
# Fill in production secrets and live Stripe keys, then:
bun run deploy:production
```

Each deploy script runs seven stages in order before it deploys, and each one fails the deploy rather than warning:

1. [`verify-bindings.ts`](scripts/verify-bindings.ts) reads the same JSONC Wrangler reads and rejects a missing or placeholder `DB` id, `CACHE` id, `IMAGES` bucket, `AUDIT_LOG_QUEUE` or `NEWSLETTER_QUEUE` producer without a matching consumer or with a consumer that names no consumed dead-letter queue, or a renamed Durable Object class, and refuses a production deploy whose `IMAGES` bucket is the preview one.
2. [`verify-stripe-keys.ts`](scripts/verify-stripe-keys.ts) reads the mode of `VITE_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` from their prefixes. Production needs `pk_live_` with `sk_live_` or a restricted `rk_live_`, preview needs `pk_test_` with `sk_test_` or `rk_test_`, and a missing key or a publishable key whose mode differs from the secret key's fails everywhere. It prints the mode, never a key.
3. [`verify-email-sender.ts`](scripts/verify-email-sender.ts) asks Resend whether it would send as `RESEND_EMAIL_FROM` with `RESEND_API_KEY`, and rejects a display-name sender, `onboarding@resend.dev`, an address at `martebizuteria.pl` outside production (test orders would mail the shop), or a domain that is missing from the Resend account or not verified, printing the DNS records still to publish. With a sending-only key it reads the domain through the optional `RESEND_MANAGEMENT_API_KEY`, or else sends one test e-mail to `delivered@resend.dev`.
4. `build:preview` / `build:production` clears `dist`, compiles content, and builds with `CLOUDFLARE_ENV` and `--mode` both set to the target environment.
5. [`verify-build.ts`](scripts/verify-build.ts) checks that `.wrangler/deploy/config.json` points at `dist/server/wrangler.json`, that the built Worker's `APP_ENV` and name match the requested environment, that `main` and `dist/client` exist with fonts, CSS and JavaScript — and then transpile-scans every client chunk and **fails on any `cloudflare:workers` or `node:*` import** that leaked into the browser bundle, and on any chunk that carries Drizzle ORM (the `Symbol.for` call that registers its `drizzle:entityKind` symbol).
6. [`prepare-deploy-secrets.ts`](scripts/prepare-deploy-secrets.ts) writes a `0600` secrets file containing only the keys declared in `secrets.required`, which is what keeps `CLOUDFLARE_*` management credentials out of the Worker.
7. `db:migrate:preview` / `db:migrate:production` applies the migrations the target database has not recorded yet. A failing migration is rolled back on its own, the ones before it stay applied, and nothing is deployed.

Only then does `wrangler deploy` run, against the generated `dist/server/wrangler.json` with `CLOUDFLARE_ENV` unset so the generated config is used verbatim. Builds alone deploy nothing and apply no migrations.

Last, [`verify-deployment.ts`](scripts/verify-deployment.ts) asks the environment's `workers.dev` host for `/`, `/products`, `/robots.txt`, `/api/webhooks/stripe` and `/api/health`, and fails the job unless the two pages answer `200` with HTML, `robots.txt` answers `200` as plain text, the webhook route refuses a `GET` with `405` and the health check answers `200`, which it does only when D1, KV and R2 answer. A failing page is asked up to three times, five seconds apart. The new version is live by then, so a failure is a signal to roll back: `vp exec wrangler rollback --env <environment>` puts the previous Worker version back, and [Roll back a deploy](content/docs/guides/roll-back-a-deploy.en-US.mdx) covers redeploying a known-good commit and what to do once a migration has run.

Before production takes real orders, work through the [go-live checklist](content/docs/guides/go-live-checklist.en-US.mdx). [Backup and restore](content/docs/guides/backup-and-restore.en-US.mdx) covers D1 Time Travel and what a restore erases, the regular export kept outside Cloudflare, which has to drop and recreate the `storefront_search` FTS5 table around `wrangler d1 export`, and the copy of the image bucket.

## Localization and content

Supported locales are `pl-PL` (default) and `en-US`, declared in [`i18n.config.ts`](src/integrations/use-intl/i18n.config.ts) together with the `marte_locale` cookie name and the `Europe/Warsaw` default time zone.

The page language and the way dates, prices and numbers are written are separate. [`i18n.display-preferences.ts`](src/integrations/use-intl/i18n.display-preferences.ts) resolves each viewer's display preferences on every request, and the root `TranslationsProvider` passes them to `IntlProvider` and to the shop's formatting hooks:

- **Time zone:** the signed-in user's saved choice (`user.timezone`), else the `marte_time_zone` cookie the browser writes from `Intl.DateTimeFormat().resolvedOptions().timeZone` after its first page, else Cloudflare's guess for the request (`request.cf.timezone`), else `UTC`.
- **Format locale:** the saved `user.format_locale` (added by `20261016120000_user_format_locale.sql`), else the first supported entry of `Accept-Language`, else `en-US`.

Signed-in users choose both under Preferences on their profile, from `TIMEZONES` in [`timezone.ts`](src/modules/_core/constants/timezone.ts) and the 18 `FORMAT_LOCALES` in [`i18n.display.ts`](src/integrations/use-intl/i18n.display.ts); **Automatic** clears the saved value and returns to detection. `Europe/Warsaw` stays the shop's own zone where the law or the books need one: it fixes the year in order numbers and the Polish legal deadlines.

Polish uses unprefixed paths, because it is the default. English uses the full BCP-47 tag — `/en-US/products`. A redundant `/pl-PL/...` URL is 301'd to the bare path in the Worker, and bare language aliases (`/pl`, `/en`) canonicalize to the full tag.

- **UI messages** live in `messages/{locale}/` as 60 dotted-namespace JSON files, using the same keys, ICU arguments and rich-text tags across locales. A test asserts Polish parity with English file by file.
- **Route namespaces** are declared in `staticData.namespaces`; a page loads the always-on root namespaces plus what its route and layout ancestors ask for. Loaders fetch messages and data in one `Promise.all`.
- **Documentation** lives in `content/docs/` as `slug.{locale}.mdx` with `meta.{locale}.json` for navigation. It compiles through Fumadocs into `.source/`, which is generated — edit the MDX, never the output.
- **Legal pages** — `/terms-of-service`, `/privacy-policy` and `/exchanges-and-returns` — are rows in the D1 `content_page` table, with titles, descriptions and Markdown bodies as per-locale JSON maps. The [`20261002120000_content_pages.sql`](src/integrations/drizzle-orm/migrations/20261002120000_content_pages.sql) migration creates the table and seeds the privacy and returns pages, and [`20261005200000_terms_of_service_page.sql`](src/integrations/drizzle-orm/migrations/20261005200000_terms_of_service_page.sql) seeds the terms of service, both without overwriting existing rows. [`20261005210000_returns_and_complaints_page.sql`](src/integrations/drizzle-orm/migrations/20261005210000_returns_and_complaints_page.sql) replaces the seeded returns text, which contradicted Polish consumer law, only while both languages still match it, and [`20261010200000_privacy_policy_page.sql`](src/integrations/drizzle-orm/migrations/20261010200000_privacy_policy_page.sql) replaces the seeded privacy policy the same way with one that names the processors, the transfers to the US, the retention periods and every cookie and browser storage key the site sets. [`20261010210000_privacy_policy_account_deletion.sql`](src/integrations/drizzle-orm/migrations/20261010210000_privacy_policy_account_deletion.sql) then says in each language whose sentence is unedited that deleting the account ends the newsletter subscription. [`20261012100000_privacy_policy_without_bot_check.sql`](src/integrations/drizzle-orm/migrations/20261012100000_privacy_policy_without_bot_check.sql) then removes the bot check from the policy in each language that still describes it. [`20261010232000_faq_page.sql`](src/integrations/drizzle-orm/migrations/20261010232000_faq_page.sql) adds the FAQ at `/faq` without overwriting an existing row: answers about ordering, payment, invoices, delivery, returns, complaints, the account and the newsletter taken from the checkout and the terms, and general advice on caring for silver and gold jewellery. [`20261018100000_about_page.sql`](src/integrations/drizzle-orm/migrations/20261018100000_about_page.sql) moves the About page at `/about` into the table the same way, with the title, lead and story it had in the message files; its route keeps its own layout, shows the description as the lead and no "Last updated" date, and renders the body through the same Markdown renderer. The pages name the seller through store detail placeholders such as `:seller[nip]`, which show what **Settings → Store details** holds; [`20261016161000_seller_placeholders.sql`](src/integrations/drizzle-orm/migrations/20261016161000_seller_placeholders.sql) put them in the seeded pages without changing what they read. The withdrawal and complaint forms the pages link, `/forms/formularz_zwrotu.pdf` and `/forms/formularz_reklamacji.pdf`, are PDFs the Worker makes with `pdf-lib` from the same details each time they are opened, and the order confirmation email attaches the withdrawal form, made the same way, and embeds the ordered products' images read from R2, next to the seller's details, the longest fulfilment time of the ordered products, the withdrawal and complaint rules with the out-of-court routes, and links to the three pages. Admins edit them with MDXEditor at `/admin/content`, styled with the same prose class as the storefront page. A save publishes immediately, is refused if someone else saved the page after it was opened, and moves the "Last updated" date of each locale whose title or body changed. A new locale needs a migration that adds it to every row's maps before it can be translated in the editor.
- **Emails** load their `emails.*` namespace in the sending use case and pass `locale` and `messages` into the template. Email templates contain markup only, and never call a browser-side hook.
- **Links** use `LocalizedLink` or `ROUTES.*`; the router's `rewrite.output` adds the prefix. Raw URLs outside the router, such as email links and the email-verification and password-reset callbacks, are built with `buildLocalizedUrl`. The Google sign-in `callbackURL` is the current page's `location.publicHref`, which is already localized.
- **Locale derivation** is `getCurrentLocale()`, which reads the real request URL. Do not derive it from router location — the router only ever sees the de-localized path.
- `localeLinks` emits the canonical link plus one `alternate` per locale and an `x-default`, used by `pageHead`.

## Performance and first paint

Fonts are 12 self-hosted `woff2` files under `public/fonts` — Cormorant Garamond in latin and latin-ext subsets, Manrope as a variable font in both — served with a one-year immutable `Cache-Control` from [`public/_headers`](public/_headers). Critical `@font-face` rules, including `local()` fallbacks whose `size-adjust`, `ascent-override` and `descent-override` are computed from the font files, are inlined into `<head>` ahead of `<HeadContent />` on storefront routes. `getCriticalFontPreloads` preloads the sans and serif files the first paint draws: `pl-PL` gets the latin and latin-ext files, `en-US` the latin ones, and the home page adds the italic of its heading. The PDF forms embed static TrueType faces of the same families from `public/fonts/forms`, under the SIL Open Font License 1.1.

The admin shell skips that entirely and inlines its own critical chrome CSS instead — different route, different critical path. Stylesheets are split by route: `globals.css` at the root and `admin.css` from the admin layout. The storefront adds no stylesheet of its own, so nothing on a storefront page waits for one, and its reveal animations hide only what starts below the fold.

A page hints only its client entry. TanStack Start would add a `modulepreload` hint for every JavaScript chunk of the matched routes, over a hundred on the home page, which the browser fetches ahead of the stylesheet, the fonts and the hero image. [`src/server.ts`](src/server.ts) keeps the first one, the client entry, at `fetchpriority="low"` and removes the rest with `HTMLRewriter` as the page streams, and its `Link` header lists only the stylesheets and the font preloads, which Cloudflare can send ahead of the page as 103 Early Hints. The router still loads a route's chunks when the visitor navigates to it.

The admin data grid emits `width: max(var(--marte-dg-<slug>-<column>, <default>px), <min>px)` in SSR'd markup, and a blocking head script reads `localStorage` and fills those custom properties before first paint — so a resized column paints at its saved width on the first frame, with no React render and no layout shift.

Four request paths short-circuit in [`src/server.ts`](src/server.ts) before the React framework is reached — `/sitemap.xml`, `/robots.txt`, and both WebSocket upgrades — because none of them need an SSR render. The locale redirect returns before the handler too. Route code splitting is configured per concern (`component`, `loader`, `errorComponent`, `notFoundComponent`), checkout steps are lazily imported per step, and the router preloads on intent with a 1000px proximity radius.

## Known gaps

Kept here rather than hidden, because an accurate map is more useful than a flattering one. Each item below was re-verified against the current source.

**Correctness**

- Inventory compensation is best-effort. A failed rollback leaves stock reserved, and nothing alerts.
- Order emails have no outbox. A send is tried three times within one request's `waitUntil`, and one that still fails waits for the admin's Resend email on the order; the failed payment email belongs to no order and cannot be resent.
- No refund restocks by itself. The admin returns an order's items with the Refund dialog's box or Return to stock, every line at once and only for a fully refunded order, so a partial return has no restock path.
- `isAdminPathname` uses `pathname.includes(ROUTES.ADMIN)`, so a storefront URL containing that substring is misclassified — which gives it the admin shell (no storefront critical fonts or smooth scrolling, the admin toasts, background and light theme), the admin sidebar preference, and the admin pending and not-found components.

**Missing infrastructure**

- No reconciliation job. The only Cron Trigger runs the daily retention clean-up, which releases no stock, so stale inventory reservations are reclaimed only when Stripe emits `checkout.session.expired`, 32 minutes after a Checkout Session opens.
- An audit entry that still cannot be written after the dead-letter queue retries it on its own three times is dropped; its failures email `RESEND_EMAIL_FROM`. Better Auth's `/admin/revoke-user-session`, which names a session only by its token, and `/admin/impersonate-user` are not recorded in the audit log.
- The default browser suite never loads Stripe.js. Only the `stripe-test-mode` project pays in Stripe's real payment form, by card, BLIK and Przelewy24, and it runs in the **E2E (full)** workflow — on pushes to `main`, weekly and by hand — not on pull requests.
- A newsletter batch that still fails on its third attempt stops its campaign, which cannot be resumed; the stop is audited and emails `RESEND_EMAIL_FROM`.

**Security hardening**

- `AppError` carries a typed code but no HTTP status, so a denial surfaces to the client as a generic RPC failure that the UI maps by code string rather than by status.
- Rate limiting is per-IP only, with no per-account lockout. A distributed credential-stuffing attempt is not slowed by it.
- Nothing tells a person from a script, so a script can hold stock up to the open-checkout caps from every client address it uses.
- A new checkout counts the open checkouts of its client address and email before it reserves stock, but the count and the reservation are separate statements, so simultaneous requests can each pass it. The per-address rate limit bounds how many get through.
- Once visitors have made the shop send 50 verification, password-reset and newsletter emails in a day, further ones are skipped until the day rolls over, so a flood of requests can delay real sign-ups for the rest of that day. Each skipped email is recorded in the audit log, and order emails are not affected.
- Editing an open checkout gives it a fresh 32-minute session, so the server edits a checkout only during the first 32 minutes after it opened and then makes the browser open a fresh checkout, which the open-checkout caps count again. One checkout can therefore hold stock for up to about an hour.
- The browser's cached session stays fresh for 60 seconds and does not refetch on window focus or reconnect, so storefront chrome such as the navigation link and the wishlist can show a revoked or ended session, including a sign-out in another tab, until something refetches it. Navigating into `/account` or `/admin` re-checks, and every server-side read revalidates.

**Unfinished or hidden**

- InPost's tracking status is shown on the order but does not move it: the admin still marks an InPost parcel shipped and delivered.
- `/admin/settings` holds the admin's own account, the seller's details, the shop's delivery methods and free delivery threshold, and the team of admins: the carriers themselves are not editable there yet. Only InPost parcels are booked from the order page; a method with another carrier is shipped by hand, with its tracking number and link saved on the order. The admin order list and detail page are fully database-backed, as are their fulfil, ship, mark-delivered, cancel and refund actions.
- The blog is hidden until it has real articles. `src/data/blog-posts.ts` lists none, so `/blog` and `/blog/$slug` answer 404 and neither the home page nor the sitemap mentions the blog. An article's page shows only its title and description, so the first article also needs a body.

## Contributing

Read the [architecture docs](content/docs/architecture) before the first change — `layering`, `dependency-rules` and `security-model` in particular. Follow the existing theme and typography definitions in [`src/presentation/styles/`](src/presentation/styles) rather than introducing new values.

Before opening a pull request:

```sh
bun run check
bun run test:coverage
bun run build:preview
```

That is CI's `verify` job, in order. CI also runs the Chromium end-to-end suite, which `bun run test:e2e:pr` reproduces locally (see [Run the end-to-end suite](#run-the-end-to-end-suite)). The pre-commit hook already runs `vp check --fix` on staged files, but it does not run the tests or the build.

House rules, in addition to what the linter enforces:

- **No comments in TypeScript or TSX.** Express intent through names and types; prose belongs in `content/docs`. No lint rule checks this, so review does.
- **Never run a regex or `sed` rename across multiple files.** Edit each site individually.
- **Do not run `db:seed:preview`, `db:seed:production`, or any other remote database mutation** as part of development. The seeds are stale and destructive; see [above](#seeds--do-not-run-them).
- **Do not commit generated output.** `src/types/worker-configuration.d.ts` and `.source/` are regenerated by `bun run typegen` and ignored by git. `src/routeTree.gen.ts` is the exception: TanStack Start's Vite plugin rewrites it whenever `dev` or a build runs, and it is tracked, so it is committed with the route change that altered it.
- **Update the documentation with the behaviour.** A user-facing change needs its `content/docs` page updated in **both** `en-US` and `pl-PL`, and a new message key needs both message catalogues.
- **Keep coverage at 100%.** Cover new code in the same change; never lower the thresholds in `vite.config.ts` to make a change pass.

Agent guidance is vendored: `bun run skills:sync` rebuilds `.agents/skills` from [`skills-lock.json`](skills-lock.json) and links it into `.claude/skills`, replacing whatever is in those directories. Keep custom guidance elsewhere. Project conventions for agents live in [`AGENTS.md`](AGENTS.md).

For documentation corrections, verify commands and file paths against the implementation before submitting. For behaviour changes, describe the resulting behaviour, the validation you ran, and any gap the change leaves open.

## Licensing

The source code is shared under **CC BY-NC 4.0** for educational purposes. See [`LICENSE.md`](LICENSE.md) for the full terms, including the attribution and non-commercial conditions.

No copyright, trademark or other intellectual property rights are claimed over the name "M'Arte" or over any names, logos or branding used here. Third-party assets and dependencies retain their own licences.
