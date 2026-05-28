/** Worker secrets — names must match `wrangler secret put` and `.env.local` exactly. */
declare namespace Cloudflare {
  interface Env {
    readonly AUTH_GITHUB_CLIENT_ID: string;
    readonly AUTH_GITHUB_CLIENT_SECRET: string;
    readonly AUTH_GOOGLE_CLIENT_ID: string;
    readonly AUTH_GOOGLE_CLIENT_SECRET: string;
    readonly AUTH_SECRET: string;
    readonly CLOUDFLARE_ACCESS_TOKEN: string;
    readonly CLOUDFLARE_ACCOUNT_ID: string;
    readonly RESEND_API_KEY: string;
    readonly RESEND_EMAIL_FROM: string;
    readonly SENTRY_AUTH_TOKEN: string;
    readonly STRIPE_SECRET_KEY: string;
    readonly STRIPE_WEBHOOK_SECRET: string;
    readonly VITE_APP_URL: string;
  }
}
