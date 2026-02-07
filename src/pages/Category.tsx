import { useParams } from 'react-router-dom';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="category-page">
      <div className="container">
        <div className="category-header">
          <h1>Category: {slug}</h1>
          <p>Browse products in this category</p>
        </div>

        <div className="category-layout">
          <aside className="filters-sidebar">
            {/* Filters will be added here */}
          </aside>

          <main className="products-grid">
            {/* ProductGrid component will be added here */}
            <p>Products in {slug} coming soon...</p>
          </main>
        </div>
      </div>
    </div>
  );
}
