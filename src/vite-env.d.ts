/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_ENABLE_GUEST_CHECKOUT: string;
  readonly VITE_ENABLE_WISHLIST: string;
  readonly VITE_DEFAULT_PAGE_SIZE: string;
  readonly VITE_PLACEHOLDER_IMAGE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
