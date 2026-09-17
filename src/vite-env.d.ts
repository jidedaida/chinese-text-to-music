/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  readonly VITE_RELEASE_CHANNEL?: 'preview' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
