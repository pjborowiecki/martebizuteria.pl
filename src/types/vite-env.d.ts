/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string | undefined;
  readonly VITE_TURNSTILE_SITE_KEY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
