/**
 * Seed data for the local mock API.
 *
 * Shapes are copied from the client's own types (`src/services/storeService.ts`,
 * `src/types/product.types.ts`, `src/services/chatService.ts`), so anything the
 * pages destructure exists here. Values are invented; nothing is real.
 */

// Anchored to startup, not a fixed date: "renews in 12 days" and "replied 2
// hours ago" are only true relative to today, and a frozen anchor turns every
// active subscription into an expired one a few weeks later.
const NOW = Date.now();
const iso = (daysAgo = 0) => new Date(NOW - daysAgo * 86_400_000).toISOString();

/**
 * Images are served by the mock itself, so this works offline. Absolute,
 * because the client fetches them from Vite's origin (5173) — a relative
 * `/images/...` would resolve there and 404.
 */
const ORIGIN = process.env.MOCK_PUBLIC_URL ?? `http://localhost:${process.env.PORT || 8787}`;

/**
 * A real photo from `mock-api/images/`. Sourced from Wikimedia Commons and
 * Openverse (CC-licensed) and checked by eye against the product it is
 * attached to — a keyword photo service returned a shopfront for "iPhone".
 */
const photo = (file) => ({ url: `${ORIGIN}/images/${file}`, key: `images/${file}` });

/** Generated SVG, for records that have no photo of their own. */
const img = (label, seed) => ({ url: `${ORIGIN}/img/${seed}.svg?label=${encodeURIComponent(label)}` });

// ─── Categories ─────────────────────────────────────────────────

const cat = (id, name, slug, parentId, sortOrder) => ({
  id,
  name,
  slug,
  description: `${name} on WorldShop`,
  parentId,
  productCount: 0, // recomputed below from listings
  isActive: true,
  sortOrder,
  createdAt: iso(400),
  updatedAt: iso(30),
});

// The sandbox's taxonomy (worldstreet-sandbox /categories), twelve
// departments. Sections that already hold seeded listings keep their old ids,
// so listings, attributes and the vendor form did not have to move.
export const categories = [
  cat('cat-vehicles', 'Vehicles', 'vehicles', undefined, 1),
  cat('cat-electronics', 'Electronics', 'electronics', undefined, 2),
  cat('cat-fashion', 'Fashion', 'fashion', undefined, 3),
  cat('cat-home', 'Home & living', 'home', undefined, 4),
  cat('cat-sports', 'Sports & fitness', 'sports', undefined, 5),
  cat('cat-appliances', 'Home appliances', 'appliances', undefined, 6),
  cat('cat-property', 'Property', 'property', undefined, 7),
  cat('cat-jewellery', 'Jewellery & watches', 'jewellery', undefined, 8),
  cat('cat-baby', 'Baby & kids', 'baby', undefined, 9),
  cat('cat-books', 'Books & media', 'books', undefined, 10),
  cat('cat-instruments', 'Musical instruments', 'instruments', undefined, 11),
  cat('cat-services', 'Services', 'services', undefined, 12),

  cat('cat-cars', 'Cars & SUVs', 'cars-suvs', 'cat-vehicles', 1),
  cat('cat-luxury-cars', 'Luxury cars', 'luxury-cars', 'cat-vehicles', 2),
  cat('cat-electric', 'Electric vehicles', 'electric', 'cat-vehicles', 3),
  cat('cat-vans', 'Vans & buses', 'vans', 'cat-vehicles', 4),
  cat('cat-bikes', 'Motorcycles', 'motorcycles', 'cat-vehicles', 5),
  cat('cat-trucks', 'Trucks', 'trucks', 'cat-vehicles', 6),
  cat('cat-vehicle-parts', 'Parts & accessories', 'vehicle-parts', 'cat-vehicles', 7),

  cat('cat-phones', 'Phones & tablets', 'phones', 'cat-electronics', 1),
  cat('cat-laptops', 'Laptops', 'laptops', 'cat-electronics', 2),
  cat('cat-audio', 'Audio & headphones', 'audio', 'cat-electronics', 3),
  cat('cat-cameras', 'Cameras', 'cameras', 'cat-electronics', 4),
  cat('cat-wearables', 'Wearables', 'wearables', 'cat-electronics', 5),
  cat('cat-gaming', 'Gaming', 'gaming', 'cat-electronics', 6),
  cat('cat-tvs', 'TVs & projectors', 'tvs', 'cat-electronics', 7),

  cat('cat-womenswear', "Women's clothing", 'womens', 'cat-fashion', 1),
  cat('cat-menswear', "Men's clothing", 'mens', 'cat-fashion', 2),
  cat('cat-shoes', 'Shoes', 'shoes', 'cat-fashion', 3),
  cat('cat-bags', 'Bags', 'bags', 'cat-fashion', 4),
  cat('cat-eyewear', 'Eyewear', 'eyewear', 'cat-fashion', 5),
  cat('cat-fashion-accessories', 'Accessories', 'accessories', 'cat-fashion', 6),

  cat('cat-furniture', 'Furniture', 'furniture', 'cat-home', 1),
  cat('cat-kitchen', 'Kitchen & dining', 'kitchen', 'cat-home', 2),
  cat('cat-decor', 'Decor', 'decor', 'cat-home', 3),
  cat('cat-lighting', 'Lighting', 'lighting', 'cat-home', 4),
  cat('cat-bedding', 'Bedding', 'bedding', 'cat-home', 5),
  cat('cat-garden', 'Garden & outdoor', 'garden', 'cat-home', 6),

  cat('cat-fitness', 'Fitness equipment', 'fitness', 'cat-sports', 1),
  cat('cat-cycling', 'Cycling', 'cycling', 'cat-sports', 2),
  cat('cat-football', 'Football', 'football', 'cat-sports', 3),
  cat('cat-outdoor', 'Outdoor & camping', 'outdoor', 'cat-sports', 4),
  cat('cat-sportswear', 'Sportswear', 'sportswear', 'cat-sports', 5),

  cat('cat-fridges', 'Fridges & freezers', 'fridges', 'cat-appliances', 1),
  cat('cat-washing', 'Washing machines', 'washing', 'cat-appliances', 2),
  cat('cat-ac', 'Air conditioners', 'ac', 'cat-appliances', 3),
  cat('cat-generators', 'Generators & inverters', 'generators', 'cat-appliances', 4),
  cat('cat-microwaves', 'Microwaves & ovens', 'microwaves', 'cat-appliances', 5),

  cat('cat-apartments', 'Flats to rent', 'rent', 'cat-property', 1),
  cat('cat-houses', 'Houses for sale', 'sale', 'cat-property', 2),
  cat('cat-shortlets', 'Shortlets', 'shortlets', 'cat-property', 3),
  cat('cat-land', 'Land', 'land', 'cat-property', 4),
  cat('cat-office', 'Office space', 'office', 'cat-property', 5),

  cat('cat-watches', 'Watches', 'watches', 'cat-jewellery', 1),
  cat('cat-rings', 'Rings', 'rings', 'cat-jewellery', 2),
  cat('cat-necklaces', 'Necklaces', 'necklaces', 'cat-jewellery', 3),
  cat('cat-earrings', 'Earrings', 'earrings', 'cat-jewellery', 4),

  cat('cat-toys', 'Toys & games', 'toys', 'cat-baby', 1),
  cat('cat-prams', 'Prams & car seats', 'prams', 'cat-baby', 2),
  cat('cat-kids-clothing', "Kids' clothing", 'kids-clothing', 'cat-baby', 3),
  cat('cat-nursery', 'Nursery furniture', 'nursery', 'cat-baby', 4),

  cat('cat-textbooks', 'Textbooks', 'textbooks', 'cat-books', 1),
  cat('cat-fiction', 'Fiction', 'fiction', 'cat-books', 2),
  cat('cat-vinyl', 'Vinyl & CDs', 'vinyl', 'cat-books', 3),
  cat('cat-comics', 'Comics', 'comics', 'cat-books', 4),

  cat('cat-guitars', 'Guitars', 'guitars', 'cat-instruments', 1),
  cat('cat-keyboards', 'Keyboards & pianos', 'keyboards', 'cat-instruments', 2),
  cat('cat-drums', 'Drums & percussion', 'drums', 'cat-instruments', 3),
  cat('cat-dj', 'DJ & studio gear', 'dj', 'cat-instruments', 4),

  cat('cat-repairs', 'Repairs', 'repairs', 'cat-services', 1),
  cat('cat-cleaning', 'Cleaning', 'cleaning', 'cat-services', 2),
  cat('cat-moving', 'Moving & haulage', 'moving', 'cat-services', 3),
  cat('cat-tutoring', 'Tutoring', 'tutoring', 'cat-services', 4),
  cat('cat-events', 'Events', 'events', 'cat-services', 5),
];

const attr = (categoryId, name, type, options, opts = {}) => ({
  id: `attr-${categoryId}-${name.toLowerCase().replace(/\s+/g, '-')}`,
  categoryId,
  name,
  type,
  options,
  isRequired: opts.isRequired ?? false,
  appliesTo: opts.appliesTo ?? 'PRODUCT',
  sortOrder: opts.sortOrder ?? 0,
  isFilterable: opts.isFilterable ?? type === 'SELECT',
});

/** Only leaf categories carry attributes — that is what gates browse facets. */
export const categoryAttributes = [
  attr('cat-phones', 'Brand', 'SELECT', ['Apple', 'Samsung', 'Tecno', 'Infinix', 'Xiaomi', 'Google'], { isRequired: true, sortOrder: 1 }),
  attr('cat-phones', 'Storage', 'SELECT', ['64GB', '128GB', '256GB', '512GB', '1TB'], { isRequired: true, sortOrder: 2 }),
  attr('cat-phones', 'RAM', 'SELECT', ['4GB', '6GB', '8GB', '12GB', '16GB'], { sortOrder: 3 }),
  attr('cat-phones', 'Colour', 'SELECT', ['Black', 'White', 'Blue', 'Titanium', 'Green'], { sortOrder: 4 }),
  attr('cat-phones', 'IMEI', 'TEXT', [], { isFilterable: false, sortOrder: 5 }),

  attr('cat-laptops', 'Brand', 'SELECT', ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS'], { isRequired: true, sortOrder: 1 }),
  attr('cat-laptops', 'Processor', 'SELECT', ['Apple M3', 'Intel Core i5', 'Intel Core i7', 'AMD Ryzen 7'], { sortOrder: 2 }),
  attr('cat-laptops', 'RAM', 'SELECT', ['8GB', '16GB', '32GB', '64GB'], { sortOrder: 3 }),
  attr('cat-laptops', 'Storage', 'SELECT', ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'], { sortOrder: 4 }),

  attr('cat-audio', 'Brand', 'SELECT', ['Sony', 'JBL', 'Bose', 'Anker'], { sortOrder: 1 }),
  attr('cat-audio', 'Type', 'SELECT', ['Over-ear', 'In-ear', 'Speaker', 'Soundbar'], { sortOrder: 2 }),

  attr('cat-cars', 'Make', 'SELECT', ['Toyota', 'Honda', 'Mercedes-Benz', 'Lexus', 'Kia'], { isRequired: true, sortOrder: 1 }),
  attr('cat-cars', 'Transmission', 'SELECT', ['Automatic', 'Manual'], { isRequired: true, sortOrder: 2 }),
  attr('cat-cars', 'Fuel', 'SELECT', ['Petrol', 'Diesel', 'Hybrid', 'Electric'], { sortOrder: 3 }),
  attr('cat-cars', 'Year', 'NUMBER', [], { isFilterable: false, sortOrder: 4 }),

  attr('cat-bikes', 'Make', 'SELECT', ['Bajaj', 'Honda', 'Yamaha', 'TVS'], { sortOrder: 1 }),
  attr('cat-bikes', 'Engine', 'SELECT', ['125cc', '150cc', '200cc', '250cc'], { sortOrder: 2 }),

  attr('cat-menswear', 'Size', 'SELECT', ['S', 'M', 'L', 'XL', 'XXL'], { isRequired: true, sortOrder: 1 }),
  attr('cat-womenswear', 'Size', 'SELECT', ['XS', 'S', 'M', 'L', 'XL'], { isRequired: true, sortOrder: 1 }),
  attr('cat-furniture', 'Material', 'SELECT', ['Wood', 'Leather', 'Fabric', 'Metal'], { sortOrder: 1 }),
  attr('cat-apartments', 'Bedrooms', 'SELECT', ['1', '2', '3', '4', '5+'], { isRequired: true, sortOrder: 1 }),
];

// ─── Stores ─────────────────────────────────────────────────────

const store = ({ photoFile, ...o }) => ({
  description: null,
  logo: photoFile ? photo(photoFile).url : img(o.name, `store-${o.slug}`).url,
  banner: photoFile ? photo(photoFile).url : img(o.name, `banner-${o.slug}`).url,
  phone: '+2348012345678',
  whatsapp: '+2348012345678',
  email: `hello@${o.slug}.ng`,
  website: null,
  address: null,
  country: 'NG',
  status: 'ACTIVE',
  verificationTier: 'VERIFIED',
  responseRate: 0.92,
  avgResponseMins: 42,
  kind: 'PERSONAL',
  mallId: null,
  // The seller card reads these three. The live API does not send them yet.
  badges: [],
  itemsSold: 40,
  lastActiveAt: iso(0.2),
  createdAt: iso(300),
  ...o,
});

export const stores = [
  store({
    id: 'store-1',
    name: 'Lagos Tech Hub',
    slug: 'lagos-tech-hub',
    photoFile: 'store-tech.jpg',
    description: 'Phones, laptops and audio gear. Ikeja Computer Village, since 2019.',
    state: 'Lagos',
    city: 'Ikeja',
    address: '12 Otigba Street, Computer Village',
    avgRating: 4.6,
    reviewCount: 38,
    website: 'https://lagostechhub.example',
    badges: ['TOP_RATED', 'FAST_SHIPPER'],
    itemsSold: 3412,
    lastActiveAt: iso(12 / 1440),
    createdAt: iso(5 * 365 + 40),
  }),
  store({
    id: 'store-2',
    name: 'Abuja Auto Mart',
    slug: 'abuja-auto-mart',
    photoFile: 'store-auto.jpg',
    description: 'Clean registered and foreign-used vehicles. Inspection welcome.',
    state: 'FCT',
    city: 'Wuse',
    avgRating: 4.3,
    reviewCount: 21,
    verificationTier: 'PREMIUM',
    badges: ['TOP_RATED'],
    itemsSold: 186,
    lastActiveAt: iso(3 / 24),
    createdAt: iso(2 * 365 + 10),
  }),
  store({
    id: 'store-3',
    name: 'Naija Threads',
    slug: 'naija-threads',
    photoFile: 'store-fashion.jpg',
    description: 'Ready-to-wear and bespoke. Lekki Phase 1.',
    state: 'Lagos',
    city: 'Lekki',
    avgRating: 4.8,
    reviewCount: 64,
    badges: ['FAST_SHIPPER'],
    itemsSold: 912,
    lastActiveAt: iso(40 / 1440),
  }),
  store({
    id: 'store-4',
    name: 'PH Home & Living',
    slug: 'ph-home-living',
    photoFile: 'store-home.jpg',
    description: 'Furniture and short-let apartments in Port Harcourt.',
    state: 'Rivers',
    city: 'Port Harcourt',
    avgRating: 4.1,
    reviewCount: 12,
    verificationTier: 'BASIC',
    kind: 'MALL_SUBSTORE',
    mallId: 'mall-2',
  }),
  // Substores of the signed-in user's mall. No storefront photo of their own,
  // so they take the generated logo.
  store({
    id: 'store-5',
    name: 'Arcade Mobile',
    slug: 'arcade-mobile',
    description: 'Budget and mid-range phones, sealed and UK-used.',
    state: 'Lagos',
    city: 'Ikeja',
    avgRating: 4.4,
    reviewCount: 9,
    kind: 'MALL_SUBSTORE',
    mallId: 'mall-1',
  }),
  store({
    id: 'store-6',
    name: 'Arcade Audio',
    slug: 'arcade-audio',
    description: 'Speakers and headphones, with a counter to test them at.',
    state: 'Lagos',
    city: 'Ikeja',
    avgRating: 4.7,
    reviewCount: 5,
    kind: 'MALL_SUBSTORE',
    mallId: 'mall-1',
  }),
];

/** The store owned by the signed-in mock user — what /stores/me resolves to. */
export const MY_STORE_ID = 'store-1';

// ─── Listings ───────────────────────────────────────────────────

// Things that go in a van. Cars, bikes and flats are collected or viewed.
const SHIPS = (categoryId) => !['cat-cars', 'cat-bikes', 'cat-apartments'].includes(categoryId);

const deliveryFor = ({ state, city }) => ({
  label: 'Free delivery',
  note: `Arrives in 1–2 days within ${city}`,
  summary: `Free to ${state}`,
  zones: [
    { label: city, value: 'Free · 1–2 days' },
    { label: `Rest of ${state}`, value: 'Free · 2–3 days' },
    { label: 'Other states', value: '₦3,500 · 3–5 days' },
    { label: 'Pickup', value: `${city}, by appointment` },
  ],
});

// Spread so some listings are nearly gone and most are not.
const STOCK = [2, 14, 6, 3, 25, 1, 9, 12];

let listingSeq = 0;
const listing = ({ photoFile, ...o }) => {
  listingSeq += 1;
  const ships = SHIPS(o.categoryId);
  // Every third priced listing is marked down by about a quarter.
  const marked = ships && o.basePrice != null && o.priceType == null && listingSeq % 3 === 2;
  const slug = o.slug ?? o.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const category = categories.find((c) => c.id === o.categoryId) ?? null;
  return {
    id: `lst-${String(listingSeq).padStart(3, '0')}`,
    slug,
    description: o.description ?? `${o.name}. Clean, tested and ready. Message the seller to arrange inspection.`,
    shortDesc: o.shortDesc ?? null,
    category: category ? { id: category.id, name: category.name, slug: category.slug, parentId: category.parentId ?? null } : null,
    priceType: 'FIXED',
    basePrice: null,
    maxPrice: null,
    isNegotiable: true,
    condition: 'USED',
    brand: null,
    material: null,
    tags: [],
    // One real photo per listing. Padding the gallery with stand-ins would mean
    // showing a different product under the same title.
    images: photoFile ? [photo(photoFile)] : [img(o.name, `lst-${listingSeq}`)],
    attributes: {},
    customFields: [],
    variants: [],
    status: 'PUBLISHED',
    country: 'NG',
    compareAtPrice: marked ? Math.round(o.basePrice / 0.77 / 1000) * 1000 : null,
    stockLeft: ships ? STOCK[listingSeq % STOCK.length] : null,
    delivery: ships ? deliveryFor(o) : null,
    publishedAt: iso(listingSeq * 2),
    viewCount: 40 + listingSeq * 37,
    inquiryCount: listingSeq % 7,
    updatedAt: iso(listingSeq),
    ...o,
  };
};

export const listings = [
  listing({
    name: 'iPhone 15 Pro Max 256GB', photoFile: 'iphone-15-pro.jpg', categoryId: 'cat-phones', storeId: 'store-1',
    basePrice: 1_450_000, condition: 'USED', brand: 'Apple', state: 'Lagos', city: 'Ikeja',
    shortDesc: 'Titanium, 89% battery health, box and cable included.',
    attributes: { Brand: 'Apple', Storage: '256GB', RAM: '8GB', Colour: 'Titanium' },
    tags: ['iphone', 'apple', 'ios'],
    customFields: [{ label: 'Battery health', value: '89%' }, { label: 'Warranty', value: 'None — out of Apple care' }],
  }),
  listing({
    name: 'Samsung Galaxy S24 Ultra 512GB', photoFile: 'galaxy-s24.jpg', categoryId: 'cat-phones', storeId: 'store-1',
    basePrice: 1_180_000, condition: 'NEW', brand: 'Samsung', state: 'Lagos', city: 'Ikeja',
    shortDesc: 'Sealed, one year Samsung Nigeria warranty.',
    attributes: { Brand: 'Samsung', Storage: '512GB', RAM: '12GB', Colour: 'Black' },
    tags: ['samsung', 'android'],
  }),
  listing({
    name: 'Tecno Camon 30 128GB', photoFile: 'tecno-camon.jpg', categoryId: 'cat-phones', storeId: 'store-5',
    basePrice: 265_000, condition: 'NEW', brand: 'Tecno', state: 'Lagos', city: 'Ikeja',
    attributes: { Brand: 'Tecno', Storage: '128GB', RAM: '8GB', Colour: 'Green' },
  }),
  listing({
    name: 'Google Pixel 8 128GB', photoFile: 'pixel-8.jpg', categoryId: 'cat-phones', storeId: 'store-5',
    basePrice: 610_000, condition: 'REFURBISHED', brand: 'Google', state: 'Lagos', city: 'Ikeja',
    attributes: { Brand: 'Google', Storage: '128GB', RAM: '8GB', Colour: 'White' },
  }),
  listing({
    name: 'MacBook Pro 14" M3 512GB', photoFile: 'macbook-pro.jpg', categoryId: 'cat-laptops', storeId: 'store-1',
    basePrice: 2_350_000, condition: 'USED', brand: 'Apple', state: 'Lagos', city: 'Ikeja',
    shortDesc: '32 cycles, AppleCare until 2027.',
    attributes: { Brand: 'Apple', Processor: 'Apple M3', RAM: '16GB', Storage: '512GB SSD' },
    customFields: [{ label: 'Cycle count', value: '32' }],
  }),
  listing({
    name: 'Dell XPS 15 i7 1TB', photoFile: 'dell-xps.jpg', categoryId: 'cat-laptops', storeId: 'store-1',
    basePrice: 1_290_000, condition: 'USED', brand: 'Dell', state: 'Lagos', city: 'Ikeja',
    attributes: { Brand: 'Dell', Processor: 'Intel Core i7', RAM: '32GB', Storage: '1TB SSD' },
  }),
  listing({
    name: 'Lenovo ThinkPad X1 Carbon', photoFile: 'thinkpad-x1.jpg', categoryId: 'cat-laptops', storeId: 'store-1',
    priceType: 'RANGE', basePrice: 720_000, maxPrice: 890_000, condition: 'REFURBISHED',
    brand: 'Lenovo', state: 'Lagos', city: 'Ikeja',
    shortDesc: 'Price depends on RAM/SSD configuration — several units in stock.',
    attributes: { Brand: 'Lenovo', Processor: 'Intel Core i5', RAM: '16GB', Storage: '512GB SSD' },
  }),
  listing({
    name: 'Sony WH-1000XM5 Headphones', photoFile: 'sony-xm5.jpg', categoryId: 'cat-audio', storeId: 'store-1',
    basePrice: 385_000, condition: 'NEW', brand: 'Sony', state: 'Lagos', city: 'Ikeja',
    attributes: { Brand: 'Sony', Type: 'Over-ear' },
  }),
  listing({
    name: 'JBL Flip 6 Bluetooth Speaker', photoFile: 'jbl-flip.jpg', categoryId: 'cat-audio', storeId: 'store-6',
    basePrice: 92_000, condition: 'NEW', brand: 'JBL', state: 'Lagos', city: 'Ikeja',
    attributes: { Brand: 'JBL', Type: 'Speaker' },
  }),

  listing({
    name: 'Toyota Corolla 2019 Foreign Used', photoFile: 'toyota-corolla.jpg', categoryId: 'cat-cars', storeId: 'store-2',
    basePrice: 18_500_000, condition: 'USED', brand: 'Toyota', state: 'FCT', city: 'Wuse',
    shortDesc: 'Duty paid, accident free, 61,000 km.',
    attributes: { Make: 'Toyota', Transmission: 'Automatic', Fuel: 'Petrol', Year: '2019' },
    customFields: [{ label: 'Mileage', value: '61,000 km' }, { label: 'Registration', value: 'Duty paid' }],
  }),
  listing({
    name: 'Mercedes-Benz GLE 450 2021', photoFile: 'mercedes-gle.jpg', categoryId: 'cat-cars', storeId: 'store-2',
    priceType: 'ON_REQUEST', condition: 'USED', brand: 'Mercedes-Benz', state: 'FCT', city: 'Maitama',
    shortDesc: 'Serious buyers only — price on request.',
    attributes: { Make: 'Mercedes-Benz', Transmission: 'Automatic', Fuel: 'Petrol', Year: '2021' },
  }),
  listing({
    name: 'Honda Accord 2016', photoFile: 'honda-accord.jpg', categoryId: 'cat-cars', storeId: 'store-2',
    basePrice: 11_200_000, condition: 'USED', brand: 'Honda', state: 'FCT', city: 'Wuse',
    attributes: { Make: 'Honda', Transmission: 'Automatic', Fuel: 'Petrol', Year: '2016' },
  }),
  listing({
    name: 'Bajaj Boxer 150cc', photoFile: 'bajaj-boxer.jpg', categoryId: 'cat-bikes', storeId: 'store-2',
    basePrice: 1_150_000, condition: 'NEW', brand: 'Bajaj', state: 'FCT', city: 'Kubwa',
    attributes: { Make: 'Bajaj', Engine: '150cc' },
  }),

  listing({
    name: 'Bespoke Agbada Set', photoFile: 'agbada-set.jpg', categoryId: 'cat-menswear', storeId: 'store-3',
    priceType: 'RANGE', basePrice: 85_000, maxPrice: 240_000, condition: 'NEW',
    material: 'Cashmere blend', state: 'Lagos', city: 'Lekki',
    shortDesc: 'Made to measure, 10–14 working days.',
    attributes: { Size: 'L' },
    customFields: [{ label: 'Lead time', value: '10–14 working days' }],
  }),
  listing({
    name: 'Ankara Midi Dress', photoFile: 'ankara-dress.jpg', categoryId: 'cat-womenswear', storeId: 'store-3',
    basePrice: 42_000, condition: 'NEW', material: 'Ankara cotton', state: 'Lagos', city: 'Lekki',
    attributes: { Size: 'M' },
  }),
  listing({
    name: 'Chambray Linen Shirt', photoFile: 'linen-set.jpg', categoryId: 'cat-womenswear', storeId: 'store-3',
    basePrice: 58_000, condition: 'NEW', material: 'Linen', state: 'Lagos', city: 'Lekki',
    attributes: { Size: 'M' },
  }),

  listing({
    name: '6-Seater Leather Sofa', photoFile: 'leather-sofa.jpg', categoryId: 'cat-furniture', storeId: 'store-4',
    basePrice: 780_000, condition: 'NEW', material: 'Leather', state: 'Rivers', city: 'Port Harcourt',
    attributes: { Material: 'Leather' },
  }),
  listing({
    name: 'Solid Oak Dining Table', photoFile: 'oak-table.jpg', categoryId: 'cat-furniture', storeId: 'store-4',
    basePrice: 410_000, condition: 'USED', material: 'Wood', state: 'Rivers', city: 'Port Harcourt',
    attributes: { Material: 'Wood' },
  }),
  listing({
    name: '3 Bedroom Serviced Apartment', photoFile: 'serviced-apt.jpg', categoryId: 'cat-apartments', storeId: 'store-4',
    priceType: 'ON_REQUEST', condition: null, state: 'Rivers', city: 'Port Harcourt',
    shortDesc: 'Short-let, 24/7 power. Rates depend on duration.',
    attributes: { Bedrooms: '3' },
  }),
  listing({
    name: '2 Bedroom Flat, GRA Phase 2', photoFile: 'gra-flat.jpg', categoryId: 'cat-apartments', storeId: 'store-4',
    basePrice: 4_500_000, condition: null, state: 'Rivers', city: 'Port Harcourt',
    shortDesc: 'Annual rent, 1 year upfront.',
    attributes: { Bedrooms: '2' },
  }),
];

/** Vendor-side drafts/hidden units — so the vendor dashboard is not all-published. */
export const vendorOnlyListings = [
  listing({
    name: 'iPad Air 11" M2 (draft)', photoFile: 'ipad-air.jpg', categoryId: 'cat-phones', storeId: MY_STORE_ID,
    basePrice: 690_000, condition: 'NEW', brand: 'Apple', state: 'Lagos', city: 'Ikeja',
    status: 'DRAFT', publishedAt: null,
    attributes: { Brand: 'Apple', Storage: '128GB' },
    compliance: { compliant: false, problems: ['Attribute "RAM" is required for Phones & Tablets', 'At least 3 photos are required to publish'] },
  }),
  listing({
    name: 'Anker Soundcore Motion+', photoFile: 'anker-speaker.jpg', categoryId: 'cat-audio', storeId: MY_STORE_ID,
    basePrice: 74_000, condition: 'NEW', brand: 'Anker', state: 'Lagos', city: 'Ikeja',
    status: 'HIDDEN', publishedAt: iso(40),
    attributes: { Brand: 'Anker', Type: 'Speaker' },
    compliance: { compliant: true, problems: [] },
  }),
];

// Recompute category counts from the published set.
for (const c of categories) {
  // Own listings only, as the real API reports them: departments come out at 0
  // and the client sums the subtree (categoryTree.subtreeCount), so rolling the
  // children up here as well doubled every department's count.
  c.productCount = listings.filter((l) => l.categoryId === c.id).length;
}

// ─── Reviews ────────────────────────────────────────────────────

const REVIEW_BODIES = [
  ['Exactly as described', 'Seller replied fast and the item matched the photos. Met at their shop in Ikeja, tested everything on the counter and it all worked. They packed it properly for the trip home and answered a follow-up question the next day.'],
  ['Good but slow to reply', 'Took about a day to get a response, item itself was fine.'],
  ['Very smooth', 'Answered every question before I came down. No surprises on arrival.'],
  ['Would buy again', 'Second time buying from this seller. Consistent.'],
  ['Fair pricing', 'Negotiated a little, landed somewhere reasonable for both of us.'],
];
const REVIEWERS = ['Chidi O.', 'Amaka N.', 'Tunde A.', 'Fatima B.', 'Emeka U.', 'Zainab K.', 'Segun A.'];

let reviewSeq = 0;
const makeReview = (storeId, listingId, i) => {
  reviewSeq += 1;
  const [title, comment] = REVIEW_BODIES[i % REVIEW_BODIES.length];
  const replied = i % 3 !== 0;
  const l = [...listings, ...vendorOnlyListings].find((x) => x.id === listingId);
  return {
    id: `rev-${String(reviewSeq).padStart(3, '0')}`,
    storeId,
    listingId,
    rating: [5, 4, 5, 3, 4, 5, 2][i % 7],
    title,
    comment,
    userName: REVIEWERS[i % REVIEWERS.length],
    userId: `user-${i % REVIEWERS.length}`,
    isVerified: i % 2 === 0,
    vendorReply: replied ? 'Thank you for the feedback — always a pleasure.' : null,
    vendorRepliedAt: replied ? iso(i) : null,
    status: 'PUBLISHED',
    createdAt: iso(i + 2),
    updatedAt: iso(i + 2),
    product: l ? { id: l.id, name: l.name, slug: l.slug } : undefined,
    helpfulCount: [24, 11, 7, 3, 0, 15][i % 6],
    // The buyer's own picture of what they bought, which is the listing's.
    photos: i % 5 === 0 && l?.images[0]?.url ? [l.images[0].url] : [],
  };
};

export const reviews = listings.flatMap((l, idx) =>
  Array.from({ length: (idx % 3) + 1 }, (_, k) => makeReview(l.storeId, l.id, idx + k)),
);

// ─── Conversations ──────────────────────────────────────────────

let convSeq = 0;
const makeConversation = ({ listingId, storeId, buyerId, buyerName, unreadFor, messages }) => {
  convSeq += 1;
  const id = `conv-${String(convSeq).padStart(3, '0')}`;
  const l = listings.find((x) => x.id === listingId) ?? null;
  const s = stores.find((x) => x.id === storeId);
  const msgs = messages.map((m, i) => ({
    id: `msg-${id}-${i + 1}`,
    conversationId: id,
    senderId: m.role === 'BUYER' ? buyerId : 'vendor-me',
    senderRole: m.role,
    body: m.body,
    readAt: i < messages.length - 1 ? iso(1) : null,
    createdAt: iso(messages.length - i),
  }));
  const last = msgs[msgs.length - 1] ?? null;
  return {
    id,
    listingId,
    storeId,
    buyerId,
    status: 'OPEN',
    lastMessageAt: last?.createdAt ?? iso(1),
    buyerUnread: unreadFor === 'buyer' ? 1 : 0,
    vendorUnread: unreadFor === 'vendor' ? 1 : 0,
    vendorFirstReplyAt: msgs.find((m) => m.senderRole === 'VENDOR')?.createdAt ?? null,
    buyer: { id: buyerId, name: buyerName },
    lastMessage: last,
    listing: l ? { id: l.id, name: l.name, slug: l.slug, images: l.images, basePrice: l.basePrice, priceType: l.priceType } : null,
    store: { id: s.id, name: s.name, slug: s.slug, logo: s.logo, verificationTier: s.verificationTier },
    messages: msgs,
  };
};

export const conversations = [
  // Selling side — people asking MY_STORE_ID about its stock.
  makeConversation({
    listingId: 'lst-001', storeId: MY_STORE_ID, buyerId: 'user-chidi', buyerName: 'Chidi O.', unreadFor: 'vendor',
    messages: [
      { role: 'BUYER', body: 'Good afternoon, is the iPhone 15 Pro Max still available?' },
      { role: 'VENDOR', body: 'Yes it is. Battery health 89%, comes with box and cable.' },
      { role: 'BUYER', body: 'Can I come and see it tomorrow around 2pm?' },
    ],
  }),
  makeConversation({
    listingId: 'lst-005', storeId: MY_STORE_ID, buyerId: 'user-amaka', buyerName: 'Amaka N.', unreadFor: 'vendor',
    messages: [
      { role: 'BUYER', body: 'Is the MacBook M3 negotiable? I can pay today.' },
      { role: 'VENDOR', body: 'Slight discount possible. What is your offer?' },
      { role: 'BUYER', body: 'I was thinking 2.2m.' },
    ],
  }),
  makeConversation({
    listingId: 'lst-008', storeId: MY_STORE_ID, buyerId: 'user-tunde', buyerName: 'Tunde A.', unreadFor: null,
    messages: [
      { role: 'BUYER', body: 'Do the Sony XM5 come with warranty?' },
      { role: 'VENDOR', body: 'Yes — 12 months from our shop.' },
    ],
  }),
  // Buying side — me asking other stores.
  makeConversation({
    listingId: 'lst-010', storeId: 'store-2', buyerId: 'me', buyerName: 'You', unreadFor: 'buyer',
    messages: [
      { role: 'BUYER', body: 'Hello, is the 2019 Corolla still available for inspection?' },
      { role: 'VENDOR', body: 'Yes. We are at Wuse, any day before 5pm works.' },
    ],
  }),
  makeConversation({
    listingId: 'lst-017', storeId: 'store-4', buyerId: 'me', buyerName: 'You', unreadFor: null,
    messages: [
      { role: 'BUYER', body: 'Can the leather sofa be delivered to Lagos?' },
      { role: 'VENDOR', body: 'Yes, delivery is arranged at cost. Roughly 90k to Lagos.' },
    ],
  }),
];

// ─── Subscription plans ─────────────────────────────────────────

export const plans = [
  {
    id: 'plan-basic', code: 'BASIC', name: 'Basic', amountMinor: 500, currency: 'USD',
    intervalMonths: 1, intervalDays: 30, listingLimit: 20,
    perks: ['Up to 20 live listings', 'Buyer chat inbox', 'Store page with reviews'],
  },
  {
    id: 'plan-pro', code: 'PRO', name: 'Pro', amountMinor: 1500, currency: 'USD',
    intervalMonths: 3, intervalDays: 90, listingLimit: 100,
    perks: ['Up to 100 live listings', 'Verified badge', 'Priority placement in browse', 'Response-time badge'],
  },
  {
    id: 'plan-premium', code: 'PREMIUM', name: 'Premium', amountMinor: 4800, currency: 'USD',
    intervalMonths: 12, intervalDays: 365, listingLimit: null,
    perks: ['Unlimited listings', 'Premium verification tier', 'Featured store slot', 'Dedicated support'],
  },
];

// ─── Current user / profile ─────────────────────────────────────

export const profile = {
  id: 'profile-me',
  userId: 'user-me',
  email: 'owen@worldstreet.test',
  firstName: 'Owen',
  lastName: 'Tester',
  phone: '+2348030000001',
  avatar: null,
  dateOfBirth: '1995-04-12',
  gender: 'PREFER_NOT_TO_SAY',
  storeName: 'Lagos Tech Hub',
  storeSlug: 'lagos-tech-hub',
  storeDescription: 'Phones, laptops and audio gear. Ikeja Computer Village, since 2019.',
  createdAt: iso(300),
  updatedAt: iso(3),
};

// ─── Malls ──────────────────────────────────────────────────────
// A mall is a paid umbrella over substores, which are ordinary stores carrying
// a mallId. Nothing here needed a new photo: each mall borrows the storefront
// shot of the trade it houses, and its listings are existing ones re-homed
// into substores above.

export const MY_MALL_ID = 'mall-1';

const mall = ({ photoFile, ...o }) => ({
  description: null,
  logo: photo(photoFile).url,
  banner: photo(photoFile).url,
  phone: '+2348012345678',
  whatsapp: '+2348012345678',
  email: `hello@${o.slug}.ng`,
  website: null,
  country: 'NG',
  address: null,
  status: 'ACTIVE',
  featuredListingIds: [],
  createdAt: iso(200),
  ...o,
});

export const malls = [
  mall({
    id: 'mall-1',
    name: 'Computer Village Arcade',
    slug: 'computer-village-arcade',
    photoFile: 'store-tech.jpg',
    description: 'Phone and audio counters under one roof in Ikeja.',
    state: 'Lagos',
    city: 'Ikeja',
    address: '5 Pepple Street, Computer Village',
    featuredListingIds: ['lst-003', 'lst-009'],
  }),
  mall({
    id: 'mall-2',
    name: 'Garden City Home Plaza',
    slug: 'garden-city-home-plaza',
    photoFile: 'store-home.jpg',
    description: 'Furniture showrooms and short-let agents in Port Harcourt.',
    state: 'Rivers',
    city: 'Port Harcourt',
    featuredListingIds: ['lst-017', 'lst-019'],
  }),
];

export const mallPlans = [
  {
    id: 'mplan-starter', code: 'MALL_STARTER', name: 'Starter', amountMinor: 2500, currency: 'USD',
    intervalMonths: 1, intervalDays: 30, listingLimit: null, substoreLimit: 5,
    perks: ['Up to 5 stores', 'One subscription covers every store', 'Mall page with a featured rail'],
  },
  {
    id: 'mplan-plus', code: 'MALL_PLUS', name: 'Plus', amountMinor: 6000, currency: 'USD',
    intervalMonths: 3, intervalDays: 90, listingLimit: null, substoreLimit: 20,
    perks: ['Up to 20 stores', 'Verified badge on every store', 'Priority placement in the directory'],
  },
  {
    id: 'mplan-unlimited', code: 'MALL_UNLIMITED', name: 'Unlimited', amountMinor: 20000, currency: 'USD',
    intervalMonths: 12, intervalDays: 365, listingLimit: null, substoreLimit: null,
    perks: ['Unlimited stores', 'Featured mall slot', 'Dedicated support'],
  },
];

// ─── Reports ────────────────────────────────────────────────────
// The admin queue is grouped by target, which is how the console reads it.

export const reportQueue = [
  {
    targetType: 'LISTING', targetId: 'lst-012', label: 'Honda Accord 2016', targetStatus: 'PUBLISHED',
    reportCount: 3, reasons: ['MISLEADING', 'SCAM'],
    firstReportedAt: iso(6), lastReportedAt: iso(1), reportIds: ['rep-1', 'rep-2', 'rep-3'],
  },
  {
    targetType: 'STORE', targetId: 'store-4', label: 'PH Home & Living', targetStatus: 'ACTIVE',
    reportCount: 1, reasons: ['MISLEADING'],
    firstReportedAt: iso(3), lastReportedAt: iso(3), reportIds: ['rep-4'],
  },
  {
    targetType: 'MALL', targetId: 'mall-2', label: 'Garden City Home Plaza', targetStatus: 'ACTIVE',
    reportCount: 2, reasons: ['OTHER'],
    firstReportedAt: iso(9), lastReportedAt: iso(4), reportIds: ['rep-5', 'rep-6'],
  },
];

// ─── Admin ──────────────────────────────────────────────────────

export const adminUsers = [
  { id: 'au-1', userId: 'user-me', email: 'owen@worldstreet.test', firstName: 'Owen', lastName: 'Tester', role: 'ADMIN', isVendor: true, vendorStatus: 'ACTIVE', storeName: 'Lagos Tech Hub', createdAt: iso(300) },
  { id: 'au-2', userId: 'user-chidi', email: 'chidi@example.ng', firstName: 'Chidi', lastName: 'Okafor', role: 'CUSTOMER', isVendor: false, vendorStatus: null, storeName: null, createdAt: iso(120) },
  { id: 'au-3', userId: 'user-amaka', email: 'amaka@example.ng', firstName: 'Amaka', lastName: 'Nwosu', role: 'CUSTOMER', isVendor: true, vendorStatus: 'ACTIVE', storeName: 'Naija Threads', createdAt: iso(210) },
  { id: 'au-4', userId: 'user-tunde', email: 'tunde@example.ng', firstName: 'Tunde', lastName: 'Adeyemi', role: 'CUSTOMER', isVendor: true, vendorStatus: 'ACTIVE', storeName: 'Abuja Auto Mart', createdAt: iso(180) },
  { id: 'au-5', userId: 'user-fatima', email: 'fatima@example.ng', firstName: 'Fatima', lastName: 'Bello', role: 'CUSTOMER', isVendor: false, vendorStatus: null, storeName: null, createdAt: iso(45) },
  { id: 'au-6', userId: 'user-emeka', email: 'emeka@example.ng', firstName: 'Emeka', lastName: 'Uche', role: 'CUSTOMER', isVendor: true, vendorStatus: 'SUSPENDED', storeName: 'PH Home & Living', createdAt: iso(90) },
];

export const adminStats = {
  totalProducts: listings.length + vendorOnlyListings.length,
  activeProducts: listings.length,
  outOfStockProducts: 0,
  lowStockProducts: 0,
  totalOrders: 0,
  totalRevenue: 0,
  totalCategories: categories.length,
  recentOrders: [],
  recentOrdersPagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasPrevPage: false, hasNextPage: false },
};

export { iso, img };
