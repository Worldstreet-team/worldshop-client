/* SkipLinks (spec §3.1): the first things a keyboard user meets on every page. */
export function SkipLinks() {
  return (
    <nav aria-label="Skip links" className="ws-skip">
      <a href="#main" className="cx-skip">
        Skip to main content
      </a>
      <a href="#site-search" className="cx-skip">
        Skip to search
      </a>
      <a href="#footer" className="cx-skip">
        Skip to footer
      </a>
    </nav>
  );
}
