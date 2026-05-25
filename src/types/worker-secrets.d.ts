declare namespace Cloudflare {
  interface Env {
    readonly AUTH_GITHUB_CLIENT_ID: string;
    readonly AUTH_GITHUB_CLIENT_SECRET: string;
    readonly AUTH_GOOGLE_CLIENT_ID: string;
    readonly AUTH_GOOGLE_CLIENT_SECRET: string;
    readonly AUTH_SECRET: string;
    readonly EMAIL_FROM: string;
    readonly VITE_APP_URL: string;
  }
}
