import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bannerApi } from '@/services/mockApi';
import { productService, categoryService } from '@/services/productService';
import type { Product, Category } from '@/types/product.types';
import { Button, Skeleton, SkeletonProductCard } from '@/components/common';
import { ProductCard } from '@/components/product';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  buttonText: string;
  isActive: boolean;
}

export default function HomePage() {
  // State
  const [banners, setBanners] = useState<Banner[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch banners
        setIsLoadingBanners(true);
        const bannersData = await bannerApi.getActive();
        setBanners(bannersData);
        setIsLoadingBanners(false);

        // Fetch featured products
        setIsLoadingProducts(true);
        const productsData = await productService.getFeaturedProducts();
        setFeaturedProducts(productsData);
        setIsLoadingProducts(false);

        // Fetch categories
        setIsLoadingCategories(true);
        const categoriesData = await categoryService.getFeaturedCategories();
        setCategories(categoriesData);
        setIsLoadingCategories(false);
      } catch (error) {
        console.error('Error fetching home data:', error);
        setIsLoadingBanners(false);
        setIsLoadingProducts(false);
        setIsLoadingCategories(false);
      }
    };

    fetchData();
  }, []);

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  // Handle banner navigation
  const goToBanner = (index: number) => {
    setCurrentBanner(index);
  };

  const nextBanner = () => {
    setCurrentBanner(prev => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length);
  };

  return (
    <div className="home-page">
      {/* Hero Section with Banner Slider */}
      <section className="hero-section">
        {isLoadingBanners ? (
          <Skeleton width="100%" height={450} />
        ) : banners.length > 0 ? (
          <div className="hero-slider">
            <div className="slides-container">
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`slide ${index === currentBanner ? 'active' : ''}`}
                  style={{
                    backgroundImage: `url(${banner.image})`,
                  }}
                >
                  <div className="slide-content">
                    <div className="container">
                      <h1>{banner.title}</h1>
                      <p>{banner.subtitle}</p>
                      <Link to={banner.link}>
                        <Button variant="primary" size="lg">
                          {banner.buttonText}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Slider Controls */}
            {banners.length > 1 && (
              <>
                <button className="slider-btn prev" onClick={prevBanner}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="slider-btn next" onClick={nextBanner}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="slider-dots">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      className={`dot ${index === currentBanner ? 'active' : ''}`}
                      onClick={() => goToBanner(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="hero-fallback">
            <div className="container">
              <h1>Welcome to WorldStreet</h1>
              <p>Discover amazing products at great prices</p>
              <Link to="/shop">
                <Button variant="primary" size="lg">
                  Shop Now
                </Button>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="container">
          <div className="section-header">
            <h2>Shop by Category</h2>
            <Link to="/categories" className="view-all-link">
              View All Categories →
            </Link>
          </div>

          <div className="categories-grid">
            {isLoadingCategories
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="category-card-skeleton">
                  <Skeleton width="100%" height={180} />
                  <div style={{ marginTop: '1rem' }}>
                    <Skeleton width={120} height={24} />
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <Skeleton width={80} height={16} />
                  </div>
                </div>
              ))
              : categories.map(category => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="category-card"
                >
                  <div className="category-image">
                    <img src={category.image} alt={category.name} />
                  </div>
                  <div className="category-info">
                    <h3>{category.name}</h3>
                    <span className="product-count">{(category as { productCount?: number }).productCount || 0} Products</span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="featured-section">
        <div className="container">
          <div className="section-header">
            <h2>Featured Products</h2>
            <Link to="/shop?featured=true" className="view-all-link">
              View All →
            </Link>
          </div>

          <div className="products-grid">
            {isLoadingProducts
              ? Array.from({ length: 4 }).map((_, i) => (
                <SkeletonProductCard key={i} />
              ))
              : featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
        </div>
      </section>

      {/* Promo Banners */}
      <section className="promo-section">
        <div className="container">
          <div className="promo-grid">
            <div className="promo-card">
              <div className="promo-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
              <h3>Free Shipping</h3>
              <p>On orders over $50</p>
            </div>
            <div className="promo-card">
              <div className="promo-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h3>24/7 Support</h3>
              <p>Dedicated support team</p>
            </div>
            <div className="promo-card">
              <div className="promo-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              </div>
              <h3>Secure Payments</h3>
              <p>100% secure checkout</p>
            </div>
            <div className="promo-card">
              <div className="promo-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
              </div>
              <h3>Easy Returns</h3>
              <p>30-day return policy</p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="newsletter-section">
        <div className="container">
          <div className="newsletter-content">
            <h2>Stay Updated</h2>
            <p>Subscribe to our newsletter for exclusive offers and updates</p>
            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email address"
                className="newsletter-input"
              />
              <Button type="submit" variant="primary">
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
