/**
 * Dark/light switch. Dark ("platform") is the brand default; light
 * ("platform-light") is a user preference persisted in localStorage. An inline
 * script in index.html applies the stored choice before first paint — this
 * module only handles toggling at runtime. Keep the storage key and attribute
 * values in sync with that script.
 */
const KEY = 'ws:theme';
const DARK = 'platform';
const LIGHT = 'platform-light';

// Keep the browser chrome (mobile address bar) matched to the page.
const THEME_COLOR: Record<string, string> = { [DARK]: '#0B0B0F', [LIGHT]: '#FAFAFA' };

export function currentTheme(): string {
  return document.documentElement.getAttribute('data-ws-theme') ?? DARK;
}

export function isLight(): boolean {
  return currentTheme() === LIGHT;
}

export function toggleTheme(): string {
  const next = isLight() ? DARK : LIGHT;
  document.documentElement.setAttribute('data-ws-theme', next);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[next]);
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Private mode: the toggle still works for this session.
  }
  return next;
}
