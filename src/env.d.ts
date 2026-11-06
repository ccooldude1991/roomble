/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Canonical site URL, injected by the deploy workflow. */
  readonly SITE_URL?: string;
  /** Base path for the site ("/" or "/<repo>/"), injected by the deploy workflow. */
  readonly BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
