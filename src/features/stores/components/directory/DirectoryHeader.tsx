import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

type DirectoryHeaderProps = {
  id: string;
  title: string;
  place: string;
};

export default function DirectoryHeader({ id, title, place }: DirectoryHeaderProps) {
  return (
    <div className="ws-browsehead">
      <nav className="ws-crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={14} aria-hidden />
        <span aria-current="page">{title}</span>
      </nav>

      <div className="ws-browsehead__row">
        <h1 className="ws-browsehead__title" id={id}>
          {place ? `${title} in ${place}` : title}
        </h1>
      </div>
    </div>
  );
}
