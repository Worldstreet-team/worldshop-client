import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

type BackLinkProps = {
  /** Where to go when there is no history of ours to go back to. */
  fallbackTo: string;
  fallbackLabel: string;
  label?: string;
};

/**
 * Goes back to wherever the visitor came from — browse, a mall, the stores
 * directory — with that page's filters and scroll intact, which a fixed
 * breadcrumb cannot do.
 *
 * A location key of 'default' means this page is the first entry in the
 * history stack (opened in a new tab, or a shared link), so there is nothing
 * of ours behind it and the fallback is offered instead of a dead "Back".
 */
export default function BackLink({ fallbackTo, fallbackLabel, label = 'Back' }: BackLinkProps) {
  const navigate = useNavigate();
  const { key } = useLocation();

  if (key === 'default') {
    return (
      <Link to={fallbackTo} className="ws-backlink">
        <ChevronLeft size={16} aria-hidden />
        {fallbackLabel}
      </Link>
    );
  }

  return (
    <button type="button" className="ws-backlink" onClick={() => navigate(-1)}>
      <ChevronLeft size={16} aria-hidden />
      {label}
    </button>
  );
}
