/*
 * The few types the WorldStore UI takes from Next. Metadata keeps only what the page
 * wrapper reads (the title); the rest of Next's metadata has no browser equivalent.
 */
declare module "next" {
  export type Metadata = {
    title?: string | { default?: string; template?: string; absolute?: string } | null;
    description?: string | null;
    robots?: unknown;
    alternates?: unknown;
    openGraph?: unknown;
    twitter?: unknown;
    metadataBase?: URL;
    [key: string]: unknown;
  };
  export type Viewport = Record<string, unknown>;
}
