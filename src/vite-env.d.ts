/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: "fixture" | "remote";
  readonly VITE_API_URL?: string;
  readonly VITE_REQUEST_TIMEOUT_MS?: string;
  readonly VITE_MEDIA_HOST?: string;
  readonly VITE_APP_ENV?: "development" | "staging" | "production" | "test";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
