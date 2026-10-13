import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Points the page's canonical link at the current path, without its query.
 * Browse keeps every filter in the query string, so without this a search
 * engine could index each filter combination as a separate copy of the page.
 * index.html carries a homepage default for crawlers that run no JavaScript.
 */
export function useCanonical() {
  const { pathname } = useLocation();

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = `${window.location.origin}${pathname}`;
  }, [pathname]);
}
