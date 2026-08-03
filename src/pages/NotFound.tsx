import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/common';

export default function NotFoundPage() {
  return (
    <div className="ws-page">
      <EmptyState
        title="Page not found"
        description="The page you are looking for doesn't exist or has been moved."
        icon={<SearchX size={26} aria-hidden />}
        actionLabel="Browse the marketplace"
        actionLink="/listings"
      />
    </div>
  );
}
