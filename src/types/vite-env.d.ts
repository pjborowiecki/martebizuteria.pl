/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BUILD_ID: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
