import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type Crumb = { label: string; to?: string };

/**
 * Breadcrumb plus the eyebrow / title / strapline block that heads both
 * category pages. The trail reuses the listing page's `ws-ldcrumbs`, so the
 * three pages that sit on the category tree draw it identically.
 */
export default function CategoryHead({
  crumbs,
  eyebrow,
  title,
  children,
}: {
  crumbs: Crumb[];
  eyebrow: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const trail: Crumb[] = [{ label: 'Home', to: '/' }, ...crumbs];

  return (
    <>
      <nav aria-label="Breadcrumb" className="ws-ldcrumbs">
        <ol>
          {trail.map((c, i) => (
            <li key={`${c.label}-${i}`}>
              {i < trail.length - 1 && c.to ? (
                <Fragment>
                  <Link to={c.to}>{c.label}</Link>
                  <span aria-hidden>/</span>
                </Fragment>
              ) : (
                <span aria-current="page">{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header className="ws-cxhead">
        <p className="ws-cxhead__eyebrow">{eyebrow}</p>
        <h1 className="ws-cxhead__title">{title}</h1>
        <p className="ws-cxhead__lede">{children}</p>
      </header>
    </>
  );
}
