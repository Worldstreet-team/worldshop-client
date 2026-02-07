import { EmptyState } from '@/components/common';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="container" style={{ padding: '6rem 0' }}>
        <EmptyState
          title="Page not found"
          description="The page you are looking for doesn't exist or has been moved."
          icon={
            <div style={{ fontSize: '6rem', fontWeight: 'bold', lineHeight: 1, marginBottom: '1rem', color: '#e5e7eb' }}>
              404
            </div>
          }
          actionLabel="Go to Homepage"
          actionLink="/"
        />
      </div>
    </div>
  );
}
