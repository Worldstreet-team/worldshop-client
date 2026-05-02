import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCategoryStore } from '@/store/categoryStore';
import Breadcrumb from '@/components/common/Breadcrumb';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/common';

export default function CategoriesPage() {
  const categories = useCategoryStore((s) => s.categories);
  const isLoading = useCategoryStore((s) => s.isLoading);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Categories' },
  ];

  if (isLoading) {
    return (
      <div className="categories-page">
        <div className="container">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isLoading && categories.length === 0) {
    return (
      <div className="categories-page">
        <div className="container">
          <EmptyState
            icon="error"
            title="Unable to Load Categories"
            description="Failed to load categories"
            actionLabel="Try Again"
            onAction={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="categories-page">
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />

        <div className="page-header">
          <h1>Shop by Category</h1>
          <p className="page-subtitle">
            Browse our wide selection of products organized by category
          </p>
        </div>

        {categories.length === 0 ? (
          <EmptyState
            icon="category"
            title="No Categories Found"
            description="Check back soon for new product categories."
            actionLabel="Browse All Products"
            actionLink="/products"
          />
        ) : (
          <div className="categories-grid-page">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                className="category-card"
              >
                <div className="category-card-image">
                  <img
                    src={category.image || '/images/placeholder-category.jpg'}
                    alt={category.name}
                  />
                  <div className="category-card-overlay" />
                </div>

                <div className="category-card-content">
                  <h3 className="category-card-title">{category.name}</h3>
                  {category.description && (
                    <p className="category-card-description">{category.description}</p>
                  )}
                  {(category as { productCount?: number }).productCount !== undefined && (
                    <span className="category-card-count">
                      {(category as { productCount?: number }).productCount} Products
                    </span>
                  )}
                </div>

                <div className="category-card-arrow">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
