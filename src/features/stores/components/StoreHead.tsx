import type { ReactNode } from 'react';

export type StoreHeadStat = { label: string; value: ReactNode; muted?: boolean };

type StoreHeadProps = {
  name: string;
  logo: string | null;
  banner: string | null;
  fallback?: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
  stats: StoreHeadStat[];
  actions?: ReactNode;
};

export default function StoreHead({
  name,
  logo,
  banner,
  fallback,
  badge,
  meta,
  stats,
  actions,
}: StoreHeadProps) {
  return (
    <section className="ws-storehead" aria-labelledby="storehead-name">
      <div className="ws-storehead__banner" aria-hidden>
        {banner && <img src={banner} alt="" />}
      </div>

      <div className="ws-storehead__body">
        <span className="ws-storehead__logo" aria-hidden>
          {logo ? <img src={logo} alt="" /> : (fallback ?? name.charAt(0).toUpperCase())}
        </span>

        <div className="ws-storehead__id">
          <div className="ws-storehead__titlerow">
            <h1 className="ws-storehead__name" id="storehead-name">
              {name}
            </h1>
            {badge}
          </div>
          {meta && <div className="ws-storehead__meta">{meta}</div>}
        </div>

        {actions && <div className="ws-storehead__actions">{actions}</div>}
      </div>

      {stats.length > 0 && (
        <dl className="ws-storehead__stats">
          {stats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd className={s.muted ? 'ws-storehead__muted' : 'ws-num'}>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
