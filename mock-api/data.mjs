/**
 * Seed data for the local mock API.
 *
 * Shapes are copied from the client's own types (`src/services/storeService.ts`,
 * `src/types/product.types.ts`, `src/services/chatService.ts`), so anything the
 * pages destructure exists here. Values are invented; nothing is real.
 */

const NOW = Date.parse('2026-08-02T12:00:00.000Z');
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

export const categories = [
  cat('cat-electronics', 'Electronics', 'electronics', undefined, 1),
  cat('cat-vehicles', 'Vehicles', 'vehicles', undefined, 2),
  cat('cat-fashion', 'Fashion', 'fashion', undefined, 3),
  cat('cat-property', 'Home & Property', 'home-property', undefined, 4),

  cat('cat-phones', 'Phones & Tablets', 'phones-tablets', 'cat-electronics', 1),
  cat('cat-laptops', 'Laptops', 'laptops', 'cat-electronics', 2),
  cat('cat-audio', 'Audio', 'audio', 'cat-electronics', 3),
  cat('cat-cars', 'Cars', 'cars', 'cat-vehicles', 1),
  cat('cat-bikes', 'Motorcycles', 'motorcycles', 'cat-vehicles', 2),
  cat('cat-menswear', "Men's Clothing", 'mens-clothing', 'cat-fashion', 1),
  cat('cat-womenswear', "Women's Clothing", 'womens-clothing', 'cat-fashion', 2),
  cat('cat-furniture', 'Furniture', 'furniture', 'cat-property', 1),
  cat('cat-apartments', 'Apartments', 'apartments', 'cat-property', 2),
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
  status: 'ACTIVE',
  verificationTier: 'VERIFIED',
  responseRate: 0.92,
  avgResponseMins: 42,
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
  }),
  store({
    id: 'store-2',
    name: 'Abuja Auto Mart',
    slug: 'abuja-auto-mart',
    photoFile: 'store-auto.jpg',
    description: 'Clean registered and foreign-used vehicles. Inspection welcome.',
    state: 'FCT - Abuja',
    city: 'Wuse',
    avgRating: 4.3,
    reviewCount: 21,
    verificationTier: 'PREMIUM',
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
  }),
];

/** The store owned by the signed-in mock user — what /stores/me resolves to. */
export const MY_STORE_ID = 'store-1';

// ─── Listings ───────────────────────────────────────────────────

let listingSeq = 0;
const listing = ({ photoFile, ...o }) => {
  listingSeq += 1;
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
    name: 'Tecno Camon 30 128GB', photoFile: 'tecno-camon.jpg', categoryId: 'cat-phones', storeId: 'store-1',
    basePrice: 265_000, condition: 'NEW', brand: 'Tecno', state: 'Lagos', city: 'Ikeja',
    attributes: { Brand: 'Tecno', Storage: '128GB', RAM: '8GB', Colour: 'Green' },
  }),
  listing({
    name: 'Google Pixel 8 128GB', photoFile: 'pixel-8.jpg', categoryId: 'cat-phones', storeId: 'store-1',
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
    name: 'JBL Flip 6 Bluetooth Speaker', photoFile: 'jbl-flip.jpg', categoryId: 'cat-audio', storeId: 'store-1',
    basePrice: 92_000, condition: 'NEW', brand: 'JBL', state: 'Lagos', city: 'Ikeja',
    attributes: { Brand: 'JBL', Type: 'Speaker' },
  }),

  listing({
    name: 'Toyota Corolla 2019 Foreign Used', photoFile: 'toyota-corolla.jpg', categoryId: 'cat-cars', storeId: 'store-2',
    basePrice: 18_500_000, condition: 'USED', brand: 'Toyota', state: 'FCT - Abuja', city: 'Wuse',
    shortDesc: 'Duty paid, accident free, 61,000 km.',
    attributes: { Make: 'Toyota', Transmission: 'Automatic', Fuel: 'Petrol', Year: '2019' },
    customFields: [{ label: 'Mileage', value: '61,000 km' }, { label: 'Registration', value: 'Duty paid' }],
  }),
  listing({
    name: 'Mercedes-Benz GLE 450 2021', photoFile: 'mercedes-gle.jpg', categoryId: 'cat-cars', storeId: 'store-2',
    priceType: 'ON_REQUEST', condition: 'USED', brand: 'Mercedes-Benz', state: 'FCT - Abuja', city: 'Maitama',
    shortDesc: 'Serious buyers only — price on request.',
    attributes: { Make: 'Mercedes-Benz', Transmission: 'Automatic', Fuel: 'Petrol', Year: '2021' },
  }),
  listing({
    name: 'Honda Accord 2016', photoFile: 'honda-accord.jpg', categoryId: 'cat-cars', storeId: 'store-2',
    basePrice: 11_200_000, condition: 'USED', brand: 'Honda', state: 'FCT - Abuja', city: 'Wuse',
    attributes: { Make: 'Honda', Transmission: 'Automatic', Fuel: 'Petrol', Year: '2016' },
  }),
  listing({
    name: 'Bajaj Boxer 150cc', photoFile: 'bajaj-boxer.jpg', categoryId: 'cat-bikes', storeId: 'store-2',
    basePrice: 1_150_000, condition: 'NEW', brand: 'Bajaj', state: 'FCT - Abuja', city: 'Kubwa',
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
  c.productCount = listings.filter(
    (l) => l.categoryId === c.id || categories.some((k) => k.parentId === c.id && k.id === l.categoryId),
  ).length;
}

// ─── Reviews ────────────────────────────────────────────────────

const REVIEW_BODIES = [
  ['Exactly as described', 'Seller replied fast and the item matched the photos. Met at their shop in Ikeja.'],
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
