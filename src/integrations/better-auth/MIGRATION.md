Better Auth 1.7 uses the built-in Drizzle database storage for sessions, verification records, and rate limits. Cloudflare KV cannot provide the atomic consume and increment operations required by the new secondary-storage contract.

Apply `20260920212415_auth_database_storage.sql` before deploying this auth configuration. The migration only adds the rate-limit table and the two-factor attempt counter and lockout timestamp. Existing two-factor records receive a zero counter and no lockout. Existing rate-limit thresholds and authentication providers remain configured.

Sessions and pending verification records previously stored only in KV are not copied to D1. Users must sign in again; pending password resets, OAuth sign-ins, and two-factor challenges must be restarted. Ordinary email-verification links are signed tokens and remain valid until their normal expiry. Cookie cache version `2` invalidates the old cached sessions on the next authentication request after deployment.

The migration and concurrent rate-limit/token-consumption tests run against local SQLite. No remote database migration or deployment is performed by the test suite.

References: [Better Auth 1.7 upgrade guide](https://better-auth.com/docs/guides/1-7-upgrade-guide), [Cloudflare KV consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/#consistency).
