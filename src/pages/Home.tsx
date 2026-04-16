import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productService, categoryService } from '@/services/productService';
import type { Product, Category } from '@/types/product.types';
import { Skeleton, SkeletonProductCard } from '@/components/common';
import { ProductCard } from '@/components/product';

// Countdown timer hook
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, targetDate.getTime() - now);
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        secs: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

// Static promo banners data
const promoBanners = [
  { id: '1', image: '/images/190X150/img1.png', text: 'CATCH BIG <strong>DEALS</strong> ON THE CAMERAS', link: '/shop' },
  { id: '2', image: '/images/190X150/img2.jpg', text: 'CATCH BIG <strong>DEALS</strong> ON SMARTPHONES', link: '/shop' },
  { id: '3', image: '/images/190X150/img3.jpg', text: 'CATCH BIG <strong>DEALS</strong> ON HEADPHONES', link: '/shop' },
  { id: '4', image: '/images/190X150/img4.png', text: 'CATCH BIG <strong>DEALS</strong> ON GAMING', link: '/shop' },
];

// Hero slider data – static background, different product images per slide
const heroSlides = [
  {
    id: 'slide-1',
    title: 'THE NEW',
    titleBold: 'STANDARD',
    subtitle: 'UNDER FAVORABLE SMARTWATCHES',
    offer: 'FROM',
    price: '₦74,999',
    priceSup: '00',
    cta: 'Start Buying',
    link: '/products',
    productImage: '/images/416X420/img1.png',
  },
  {
    id: 'slide-2',
    title: 'New Season',
    titleBold: 'Arrivals',
    subtitle: 'CHECK OUT OUR LATEST COLLECTION WITH UP TO 40% OFF',
    offer: 'FROM',
    price: '₦49,999',
    priceSup: '00',
    cta: 'Shop Now',
    link: '/products?sale=true',
    productImage: '/images/416X420/img2.png',
  },
  {
    id: 'slide-3',
    title: 'Premium',
    titleBold: 'Electronics',
    subtitle: 'SAVE BIG ON PREMIUM ELECTRONICS. LIMITED TIME OFFER!',
    offer: 'FROM',
    price: '₦29,999',
    priceSup: '00',
    cta: 'Explore Deals',
    link: '/category/electronics',
    productImage: '/images/416X420/img3.png',
  },
];

export default function HomePage() {
  // State
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [activeTab, setActiveTab] = useState<'featured' | 'on-sale' | 'top-rated'>('featured');
  const sliderInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalSlides = heroSlides.length;

  // Deal countdown — 48 hours from now
  const [dealEndDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 48);
    return d;
  });
  const countdown = useCountdown(dealEndDate);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingProducts(true);
        const productsData = await productService.getFeaturedProducts();
        setFeaturedProducts(productsData);
        setIsLoadingProducts(false);

        setIsLoadingCategories(true);
        const categoriesData = await categoryService.getFeaturedCategories();
        setCategories(categoriesData);
        setIsLoadingCategories(false);
      } catch (error) {
        console.error('Error fetching home data:', error);
        setIsLoadingProducts(false);
        setIsLoadingCategories(false);
      }
    };

    fetchData();
  }, []);

  // Auto-rotate hero slides
  const startSlider = useCallback(() => {
    if (sliderInterval.current) clearInterval(sliderInterval.current);
    sliderInterval.current = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % totalSlides);
    }, 6000);
  }, [totalSlides]);

  useEffect(() => {
    if (totalSlides <= 1) return;
    startSlider();
    return () => { if (sliderInterval.current) clearInterval(sliderInterval.current); };
  }, [totalSlides, startSlider]);

  const goToBanner = (index: number) => { setCurrentBanner(index); startSlider(); };

  // Deal product
  const dealProduct = featuredProducts.find(p => p.salePrice && p.salePrice < p.basePrice) || featuredProducts[0];
  const dealSaving = dealProduct ? Math.round(dealProduct.basePrice - (dealProduct.salePrice || dealProduct.basePrice)) : 0;

  // Tab filtering
  const getTabProducts = () => {
    switch (activeTab) {
      case 'on-sale':
        return featuredProducts.filter(p => p.salePrice && p.salePrice < p.basePrice).slice(0, 8);
      case 'top-rated':
        return [...featuredProducts].sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)).slice(0, 8);
      default:
        return featuredProducts.slice(0, 8);
    }
  };
  const tabProducts = getTabProducts();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);

  return (
    <div className="home-page electro-home">
      {/* ====== HERO SLIDER ====== */}
      <section className="hero-section">
        <div className="hero-slider">
          <div className="container">
            <div className="slides-container">
              {heroSlides.map((slide, index) => (
                <div key={slide.id} className={`slide ${index === currentBanner ? 'active' : ''}`}>
                  <div className="slide-row">
                    <div className="slide-content">
                      <h1 className="slide-title">
                        {slide.title}<br />
                        <span className="slide-title-bold">{slide.titleBold}</span>
                      </h1>
                      <h6 className="slide-subtitle">{slide.subtitle}</h6>
                      <div className="slide-offer">
                        <span className="slide-offer-label">{slide.offer}</span>
                        <span className="slide-offer-price">
                          {slide.price}<sup>{slide.priceSup}</sup>
                        </span>
                      </div>
                      <Link to={slide.link} className="slide-cta">{slide.cta}</Link>
                    </div>
                    <div className="slide-image">
                      <img src={slide.productImage} alt={slide.title} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalSlides > 1 && (
              <div className="slider-pagination">
                {heroSlides.map((_, index) => (
                  <button key={index} className={`pagination-bar ${index === currentBanner ? 'active' : ''}`} onClick={() => goToBanner(index)} aria-label={`Slide ${index + 1}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ====== PROMO BANNER CARDS ====== */}
      <section className="promo-banners-section">
        <div className="container">
          <div className="promo-banners-grid">
            {promoBanners.map(promo => (
              <Link key={promo.id} to={promo.link} className="promo-banner-card">
                <div className="promo-banner-img">
                  <img src={promo.image} alt="" />
                </div>
                <div className="promo-banner-text">
                  <div className="promo-banner-headline" dangerouslySetInnerHTML={{ __html: promo.text }} />
                  <span className="promo-banner-link">
                    Shop now
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ====== DEALS + TABBED PRODUCTS ====== */}
      <section className="deals-tabs-section">
        <div className="container">
          <div className="deals-tabs-row">
            {/* Deal of the Day */}
            <div className="deal-card">
              <div className="deal-card-header">
                <h3 className="deal-card-title">Special Offer</h3>
                {dealSaving > 0 && (
                  <div className="deal-save-badge">
                    <span className="deal-save-label">Save</span>
                    <span className="deal-save-amount">{formatPrice(dealSaving)}</span>
                  </div>
                )}
              </div>
              {isLoadingProducts ? (
                <div style={{ padding: '1rem' }}>
                  <Skeleton width="100%" height={240} />
                  <div style={{ marginTop: '1rem' }}><Skeleton width="80%" height={16} /></div>
                  <div style={{ marginTop: '0.5rem' }}><Skeleton width={120} height={24} /></div>
                </div>
              ) : !dealProduct ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#999' }}>
                  <p>No special offers right now.</p>
                  <Link to="/products" style={{ color: '#007bff', marginTop: '0.5rem', display: 'inline-block' }}>Browse all products</Link>
                </div>
              ) : (
                <>
                  <Link to={`/products/${dealProduct.slug}`} className="deal-card-image">
                    <img src={dealProduct.images?.[0]?.url || '/images/320X300/img1.jpg'} alt={dealProduct.name} />
                  </Link>
                  <h5 className="deal-card-product-name">
                    <Link to={`/products/${dealProduct.slug}`}>{dealProduct.name}</Link>
                  </h5>
                  <div className="deal-card-pricing">
                    {dealProduct.salePrice ? (
                      <>
                        <del className="deal-card-original">{formatPrice(dealProduct.basePrice)}</del>
                        <ins className="deal-card-sale">{formatPrice(dealProduct.salePrice)}</ins>
                      </>
                    ) : (
                      <ins className="deal-card-sale">{formatPrice(dealProduct.basePrice)}</ins>
                    )}
                  </div>
                  <div className="deal-card-stock">
                    <div className="deal-card-stock-labels">
                      <span>Available: <strong>{dealProduct.stock}</strong></span>
                      <span>Already Sold: <strong>28</strong></span>
                    </div>
                    <div className="deal-card-progress">
                      <span className="deal-card-progress-fill" style={{ width: '30%' }} />
                    </div>
                  </div>
                  <div className="deal-card-countdown">
                    <p className="deal-card-countdown-label">Hurry Up! Offer ends in:</p>
                    <div className="countdown-boxes">
                      <div className="countdown-box">
                        <span className="countdown-num">{String(countdown.hours).padStart(2, '0')}</span>
                        <span className="countdown-unit">HOURS</span>
                      </div>
                      <span className="countdown-sep">:</span>
                      <div className="countdown-box">
                        <span className="countdown-num">{String(countdown.mins).padStart(2, '0')}</span>
                        <span className="countdown-unit">MINS</span>
                      </div>
                      <span className="countdown-sep">:</span>
                      <div className="countdown-box">
                        <span className="countdown-num">{String(countdown.secs).padStart(2, '0')}</span>
                        <span className="countdown-unit">SECS</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Tabbed Products */}
            <div className="tabbed-products">
              <div className="tabs-nav">
                <button className={`tab-btn ${activeTab === 'featured' ? 'active' : ''}`} onClick={() => setActiveTab('featured')}>Featured</button>
                <button className={`tab-btn ${activeTab === 'on-sale' ? 'active' : ''}`} onClick={() => setActiveTab('on-sale')}>On Sale</button>
                <button className={`tab-btn ${activeTab === 'top-rated' ? 'active' : ''}`} onClick={() => setActiveTab('top-rated')}>Top Rated</button>
              </div>
              <div className="tab-products-grid">
                {isLoadingProducts
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonProductCard key={i} />)
                  : tabProducts.map(product => <ProductCard key={product.id} product={product} />)}
                {!isLoadingProducts && tabProducts.length === 0 && (
                  <p className="no-products-msg">No products found in this category.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== CATEGORIES ====== */}
      <section className="categories-section">
        <div className="container">
          <div className="section-header">
            <h2>Shop by Category</h2>
            <Link to="/categories" className="view-all-link">
              View All Categories
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
          <div className="categories-grid">
            {isLoadingCategories
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="category-card-skeleton">
                  <Skeleton width="100%" height={140} />
                  <div style={{ padding: '0.75rem', textAlign: 'center' }}><Skeleton width={100} height={18} /></div>
                </div>
              ))
              : categories.map(category => (
                <Link key={category.id} to={`/category/${category.slug}`} className="category-card">
                  <div className="category-image"><img src={category.image} alt={category.name} /></div>
                  <div className="category-info">
                    <h3>{category.name}</h3>
                    <span className="product-count">{(category as { productCount?: number }).productCount || 0} Products</span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* ====== FULL-WIDTH PROMO BANNER ====== */}
      <section className="full-promo-section">
        <Link to="/shop" className="full-promo-banner">
          <img src="/images/1400X206/img1.jpg" alt="Shop and save big" />
          <div className="full-promo-overlay">
            <div className="container">
              <div className="full-promo-content">
                <span className="full-promo-text">SHOP AND SAVE BIG ON HOTTEST PRODUCTS</span>
                <span className="full-promo-price">STARTING AT <strong>₦7,999</strong></span>
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* ====== FEATURED PRODUCTS GRID ====== */}
      <section className="featured-section">
        <div className="container">
          <div className="section-header">
            <h2>Featured Products</h2>
            <Link to="/shop?featured=true" className="view-all-link">
              View All
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
          <div className="products-grid">
            {isLoadingProducts
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonProductCard key={i} />)
              : featuredProducts.slice(0, 8).map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* ====== FEATURES / PERKS ====== */}
      <section className="features-section">
        <div className="container">
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                  <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div><strong>Free Shipping</strong><span>On orders over ₦50,000</span></div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div><strong>24/7 Support</strong><span>Dedicated support team</span></div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div><strong>Secure Payments</strong><span>100% secure checkout</span></div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div><strong>Easy Returns</strong><span>30-day return policy</span></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
