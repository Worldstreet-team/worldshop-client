/**
 * Local mock of the WorldShop API (`shop-api.worldstreetgold.com`).
 *
 * The real backend is a suspended Render service, so the client has nothing to
 * talk to. This stands in for it: zero dependencies, node builtins only, and it
 * speaks the exact envelopes `src/services/*` expect.
 *
 *   node mock-api/server.mjs          # http://localhost:8787/api/v1
 *   PORT=9000 node mock-api/server.mjs
 *
 * State is in-memory and resets on restart — writes (send a message, publish a
 * listing, edit the profile) persist for the life of the process only.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  categories, categoryAttributes, stores, listings, vendorOnlyListings,
  reviews, conversations, plans, profile, adminUsers, adminStats,
  MY_STORE_ID, iso,
} from './data.mjs';

const PORT = Number(process.env.PORT) || 8787;
const ORIGIN = process.env.MOCK_PUBLIC_URL ?? `http://localhost:${PORT}`;
const PREFIX = '/api/v1';
// Resolved from this file, not cwd, so `node mock-api/server.mjs` works from
// anywhere.
const IMAGE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'images');
const LATENCY_MS = Number(process.env.MOCK_LATENCY ?? 120);

// Mutable working copies — the mock is a tiny database.
const db = {
  listings: [...listings],
  vendorListings: [...listings.filter((l) => l.storeId === MY_STORE_ID), ...vendorOnlyListings],
  conversations: conversations.map((c) => ({ ...c, messages: [...c.messages] })),
  categories: [...categories],
  profile: { ...profile },
  reviews: [...reviews],
  stores: [...stores],
  users: [...adminUsers],
};

// ─── Helpers ────────────────────────────────────────────────────

const ok = (data, extra = {}) => ({ success: true, data, ...extra });

const paginate = (rows, query, defaultLimit = 24) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || defaultLimit));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    slice: rows.slice((page - 1) * limit, page * limit),
    pagination: {
      page, limit, total, totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

const storeById = (id) => db.stores.find((s) => s.id === id) ?? null;

/**
 * Browse and listing detail both need the store denormalised onto the row.
 * `listingCount` is computed here too — the seller card reads it, and without
 * it the "Listings" row renders blank.
 */
const withStore = (l) => {
  const s = storeById(l.storeId);
  return {
    ...l,
    store: s && {
      ...s,
      listingCount: db.listings.filter((x) => x.storeId === s.id && x.status === 'PUBLISHED').length,
    },
  };
};

const descendantIds = (categoryId) => {
  const kids = db.categories.filter((c) => c.parentId === categoryId).map((c) => c.id);
  return [categoryId, ...kids];
};

const reviewSummary = (rows) => {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
  const averageRating = rows.length
    ? Number((rows.reduce((sum, r) => sum + r.rating, 0) / rows.length).toFixed(2))
    : 0;
  return {
    averageRating,
    reviewCount: rows.length,
    distribution,
    verifiedCount: rows.filter((r) => r.isVerified).length,
    responseRate: 0.92,
    avgResponseMins: 42,
  };
};

/** Deterministic pastel from a seed, so each placeholder image looks distinct. */
const seedColor = (seed) => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return { bg: `hsl(${h} 45% 88%)`, fg: `hsl(${h} 55% 32%)` };
};

const placeholderSvg = (seed, label) => {
  const { bg, fg } = seedColor(seed);
  const text = (label || seed).slice(0, 34).replace(/[<>&]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="${bg}"/>
  <circle cx="400" cy="240" r="86" fill="none" stroke="${fg}" stroke-width="10" opacity="0.45"/>
  <path d="M355 260 l38 -44 34 40 24 -26 44 52 z" fill="${fg}" opacity="0.5"/>
  <text x="400" y="420" font-family="system-ui,Segoe UI,sans-serif" font-size="34"
        font-weight="600" fill="${fg}" text-anchor="middle">${text}</text>
  <text x="400" y="462" font-family="system-ui,Segoe UI,sans-serif" font-size="20"
        fill="${fg}" opacity="0.65" text-anchor="middle">mock image</text>
</svg>`;
};

// ─── Routes ─────────────────────────────────────────────────────
// Matched top to bottom, so literal segments must precede `:param` ones.

const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, handler });
const GET = (p, h) => route('GET', p, h);
const POST = (p, h) => route('POST', p, h);
const PATCH = (p, h) => route('PATCH', p, h);
const PUT = (p, h) => route('PUT', p, h);
const DELETE = (p, h) => route('DELETE', p, h);

// --- Categories ---

GET('/categories', () => ok(db.categories));
GET('/categories/featured', (_p, q) => ok(db.categories.filter((c) => !c.parentId).slice(0, Number(q.limit) || 4)));
GET('/categories/id/:id/attributes', ({ id }) => ok(categoryAttributes.filter((a) => a.categoryId === id)));
GET('/categories/id/:id', ({ id }) => ok(db.categories.find((c) => c.id === id) ?? null));
GET('/categories/:slug', ({ slug }, q) => {
  const category = db.categories.find((c) => c.slug === slug);
  if (!category) return { status: 404, body: { success: false, message: 'Category not found' } };
  const rows = db.listings.filter((l) => descendantIds(category.id).includes(l.categoryId));
  const { slice, pagination } = paginate(rows, q);
  return ok({ category, products: { data: slice.map(withStore), pagination } });
});

// The WorldStreet dollar wallet, as the navbar shows it. Same numbers as the
// vendor dashboard's embedded wallet so the two never disagree in the mock.
GET('/wallet', () => ok({ currency: 'USD', availableMinor: 8420, lockedMinor: 0 }));

// --- Public marketplace ---

GET('/listings', (_p, q) => {
  let rows = db.listings.filter((l) => l.status === 'PUBLISHED');

  if (q.categoryId) {
    const ids = descendantIds(q.categoryId);
    rows = rows.filter((l) => ids.includes(l.categoryId));
  }
  if (q.state) rows = rows.filter((l) => l.state === q.state);
  if (q.condition) rows = rows.filter((l) => l.condition === q.condition);
  if (q.search) {
    const needle = String(q.search).toLowerCase();
    rows = rows.filter((l) =>
      l.name.toLowerCase().includes(needle) ||
      (l.description ?? '').toLowerCase().includes(needle) ||
      (l.brand ?? '').toLowerCase().includes(needle) ||
      l.tags.some((t) => t.toLowerCase().includes(needle)));
  }
  // `attr.<Name>=<Value>` — the structured filter layer browse builds facets from.
  for (const [key, value] of Object.entries(q)) {
    if (!key.startsWith('attr.') || !value) continue;
    const name = key.slice(5);
    rows = rows.filter((l) => (l.attributes ?? {})[name] === value);
  }

  // Price range. A RANGE listing matches if [basePrice, maxPrice] overlaps the
  // requested window; ON_REQUEST listings have no price to compare, so any
  // price filter excludes them.
  const minPrice = q.minPrice ? Number(q.minPrice) : null;
  const maxPrice = q.maxPrice ? Number(q.maxPrice) : null;
  if (minPrice != null || maxPrice != null) {
    rows = rows.filter((l) => {
      if (l.basePrice == null) return false;
      const lo = l.basePrice;
      const hi = l.maxPrice ?? l.basePrice;
      if (minPrice != null && hi < minPrice) return false;
      if (maxPrice != null && lo > maxPrice) return false;
      return true;
    });
  }

  const sort = q.sort ?? q.sortBy;
  if (sort === 'price_asc') rows = [...rows].sort((a, b) => (a.basePrice ?? 1e15) - (b.basePrice ?? 1e15));
  else if (sort === 'price_desc') rows = [...rows].sort((a, b) => (b.basePrice ?? -1) - (a.basePrice ?? -1));
  else rows = [...rows].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));

  const { slice, pagination } = paginate(rows, q);
  return { success: true, data: slice.map(withStore), pagination };
});

GET('/listings/:idOrSlug/reviews/eligibility', ({ idOrSlug }) => {
  const l = findListing(idOrSlug);
  const conv = db.conversations.find((c) => c.listingId === l?.id && c.buyerId === 'me');
  return ok({
    canReview: Boolean(conv),
    wouldBeVerified: Boolean(conv?.vendorFirstReplyAt),
    reason: conv ? undefined : 'Message the seller about this item before reviewing.',
    conversationId: conv?.id,
  });
});
GET('/listings/:idOrSlug/reviews/mine', () => ok(null));
GET('/listings/:idOrSlug/reviews', ({ idOrSlug }, q) => {
  const l = findListing(idOrSlug);
  const rows = db.reviews.filter((r) => r.listingId === l?.id && (q.verifiedOnly !== 'true' || r.isVerified));
  const { slice, pagination } = paginate(rows, q, 10);
  return { success: true, data: slice, meta: reviewSummary(rows), pagination };
});
POST('/listings/:idOrSlug/reviews', ({ idOrSlug }, _q, body) => {
  const l = findListing(idOrSlug);
  const review = {
    id: `rev-new-${db.reviews.length + 1}`,
    storeId: l?.storeId ?? MY_STORE_ID,
    listingId: l?.id ?? null,
    rating: body.rating ?? 5,
    title: body.title ?? null,
    comment: body.comment ?? '',
    userName: `${db.profile.firstName} ${db.profile.lastName[0]}.`,
    userId: db.profile.userId,
    isVerified: true,
    vendorReply: null,
    vendorRepliedAt: null,
    status: 'PUBLISHED',
    createdAt: iso(0),
    updatedAt: iso(0),
    product: l ? { id: l.id, name: l.name, slug: l.slug } : undefined,
  };
  db.reviews.unshift(review);
  return { status: 201, body: ok(review) };
});

GET('/listings/:idOrSlug', ({ idOrSlug }) => {
  const l = findListing(idOrSlug);
  if (!l) return { status: 404, body: { success: false, message: 'Listing not found' } };
  l.viewCount += 1;
  return ok(withStore(l));
});

function findListing(idOrSlug) {
  return [...db.listings, ...db.vendorListings].find((l) => l.id === idOrSlug || l.slug === idOrSlug) ?? null;
}

// --- Vendor: store + subscription (before /stores/:slug) ---

GET('/stores/plans', () => ok(plans));

GET('/stores/me/dashboard', () => {
  const store = storeById(MY_STORE_ID);
  const mine = db.vendorListings;
  const myReviews = db.reviews.filter((r) => r.storeId === MY_STORE_ID);
  const selling = db.conversations.filter((c) => c.storeId === MY_STORE_ID);
  const unread = selling.reduce((n, c) => n + c.vendorUnread, 0);
  const drafts = mine.filter((l) => l.status === 'DRAFT').length;
  const unreplied = myReviews.filter((r) => !r.vendorReply).length;

  const alerts = [];
  if (unread) alerts.push({ type: 'UNREAD', severity: 'info', message: `${unread} unread ${unread === 1 ? 'message' : 'messages'} from buyers.` });
  if (drafts) alerts.push({ type: 'DRAFTS', severity: 'warning', message: `${drafts} listing${drafts === 1 ? '' : 's'} still in draft.` });
  if (unreplied) alerts.push({ type: 'UNREPLIED_REVIEWS', severity: 'info', message: `${unreplied} review${unreplied === 1 ? '' : 's'} awaiting your reply.` });
  alerts.push({ type: 'RENEWAL_DUE', severity: 'warning', message: 'Subscription renews in 12 days.' });

  return ok({
    store: {
      id: store.id, name: store.name, slug: store.slug, logo: store.logo,
      status: store.status, verificationTier: store.verificationTier,
      publiclyVisible: true, state: store.state, city: store.city,
    },
    subscription: {
      status: 'ACTIVE',
      autoRenew: true,
      currentPeriodStart: iso(18),
      currentPeriodEnd: iso(-12),
      graceEndsAt: null,
      daysRemaining: 12,
      plan: { code: 'PRO', name: 'Pro', amountMinor: 1500, currency: 'USD', intervalMonths: 3, listingLimit: 100 },
      creditMinor: 250,
      lastCharge: {
        status: 'SUCCEEDED', amountMinor: 1500, currency: 'USD', creditMinor: 0,
        walletMinor: 1500, chargedAt: iso(18), failureCode: null, periodEnd: iso(-12),
      },
    },
    wallet: { currency: 'USD', availableMinor: 8420, lockedMinor: 0, dueMinor: 1250, sufficient: true },
    listings: {
      published: mine.filter((l) => l.status === 'PUBLISHED').length,
      draft: drafts,
      hidden: mine.filter((l) => l.status === 'HIDDEN').length,
      removed: mine.filter((l) => l.status === 'REMOVED').length,
      total: mine.length,
      limit: 100,
    },
    inbox: { unread, openThreads: selling.filter((c) => c.status === 'OPEN').length },
    engagement: {
      since: iso(18),
      inquiriesThisPeriod: selling.length,
      inquiriesAllTime: selling.length + 27,
      views: mine.reduce((n, l) => n + l.viewCount, 0),
      responseRate: 0.92,
      avgResponseMins: 42,
    },
    reputation: {
      avgRating: reviewSummary(myReviews).averageRating,
      reviewCount: myReviews.length,
      unrepliedReviews: unreplied,
    },
    alerts,
  });
});

GET('/stores/me/listings/form-spec', (_p, q) => {
  const attrs = categoryAttributes.filter((a) => a.categoryId === q.categoryId);
  return ok({
    categoryId: q.categoryId ?? '',
    attributes: attrs.map((a) => ({
      name: a.name, type: a.type, options: a.options, isRequired: a.isRequired,
      appliesTo: a.appliesTo, isFilterable: a.isFilterable, sortOrder: a.sortOrder,
    })),
    customFieldsAllowed: true,
  });
});

GET('/stores/me/listings', (_p, q) => {
  let rows = db.vendorListings;
  if (q.status) rows = rows.filter((l) => l.status === q.status);
  if (q.categoryId) rows = rows.filter((l) => l.categoryId === q.categoryId);
  if (q.search) {
    const needle = String(q.search).toLowerCase();
    rows = rows.filter((l) => l.name.toLowerCase().includes(needle));
  }
  const { slice, pagination } = paginate(rows, q);
  return { success: true, data: slice, pagination };
});

POST('/stores/me/listings', (_p, _q, body) => {
  const created = {
    ...body,
    id: `lst-new-${db.vendorListings.length + 1}`,
    slug: String(body.name ?? 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    status: 'DRAFT',
    publishedAt: null,
    viewCount: 0,
    inquiryCount: 0,
    updatedAt: iso(0),
    images: body.images ?? [],
    tags: body.tags ?? [],
    customFields: body.customFields ?? [],
    variants: body.variants ?? [],
    attributes: body.attributes ?? {},
    storeId: MY_STORE_ID,
    compliance: { compliant: true, problems: [] },
  };
  db.vendorListings.unshift(created);
  return { status: 201, body: ok(created) };
});

POST('/stores/me/listings/upload/images', () => ok([
  { key: 'mock/upload-1', url: `${ORIGIN}/img/upload-1.svg?label=Uploaded`, cloudflareId: 'mock/upload-1' },
]));

POST('/stores/me/listings/:id/publish', ({ id }) => {
  const l = db.vendorListings.find((x) => x.id === id);
  if (!l) return { status: 404, body: { success: false, message: 'Listing not found' } };
  if (l.compliance && !l.compliance.compliant) {
    return { status: 400, body: { success: false, message: 'Listing does not meet the category standards', errors: { listing: l.compliance.problems.join('; ') } } };
  }
  l.status = 'PUBLISHED';
  l.publishedAt = iso(0);
  if (!db.listings.some((x) => x.id === l.id)) db.listings.push(l);
  return ok({ listing: { id: l.id, status: l.status, publishedAt: l.publishedAt }, publiclyVisible: true, message: 'Listing is now live.' });
});

POST('/stores/me/listings/:id/unpublish', ({ id }) => {
  const l = db.vendorListings.find((x) => x.id === id);
  if (!l) return { status: 404, body: { success: false, message: 'Listing not found' } };
  l.status = 'HIDDEN';
  db.listings = db.listings.filter((x) => x.id !== l.id);
  return ok({ id: l.id, status: l.status });
});

GET('/stores/me/listings/:id', ({ id }) => {
  const l = db.vendorListings.find((x) => x.id === id);
  return l ? ok(l) : { status: 404, body: { success: false, message: 'Listing not found' } };
});
PATCH('/stores/me/listings/:id', ({ id }, _q, body) => {
  const l = db.vendorListings.find((x) => x.id === id);
  if (!l) return { status: 404, body: { success: false, message: 'Listing not found' } };
  Object.assign(l, body, { updatedAt: iso(0) });
  return ok(l);
});
DELETE('/stores/me/listings/:id', ({ id }) => {
  db.vendorListings = db.vendorListings.filter((x) => x.id !== id);
  db.listings = db.listings.filter((x) => x.id !== id);
  return ok(null);
});

GET('/stores/me/reviews', (_p, q) => {
  let rows = db.reviews.filter((r) => r.storeId === MY_STORE_ID);
  if (q.unrepliedOnly === 'true') rows = rows.filter((r) => !r.vendorReply);
  const { slice, pagination } = paginate(rows, q, 10);
  return { success: true, data: slice, meta: reviewSummary(rows), pagination };
});

POST('/stores/me/subscription/charge', () => ok({ periodEnd: iso(-102), alreadyPaid: false }));
POST('/stores/me/subscription/cancel', () => ok({ cancelled: true }));

GET('/stores/me', () => {
  const s = storeById(MY_STORE_ID);
  return ok({
    id: s.id, name: s.name, slug: s.slug, status: s.status, isPubliclyVisible: true,
    description: s.description, logo: s.logo, banner: s.banner, phone: s.phone,
    whatsapp: s.whatsapp, email: s.email, website: s.website,
    state: s.state, city: s.city, address: s.address,
  });
});
PATCH('/stores/me', (_p, _q, body) => {
  const s = storeById(MY_STORE_ID);
  Object.assign(s, body);
  return ok({ ...s, isPubliclyVisible: true });
});
POST('/stores', (_p, _q, body) => {
  const created = {
    ...storeById(MY_STORE_ID), ...body,
    id: 'store-new', slug: String(body.name ?? 'new-store').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    status: 'DRAFT', isPubliclyVisible: false,
  };
  return { status: 201, body: ok(created) };
});

// --- Public store pages ---

GET('/stores/:slug/listings', ({ slug }, q) => {
  const s = db.stores.find((x) => x.slug === slug);
  const rows = db.listings.filter((l) => l.storeId === s?.id && l.status === 'PUBLISHED');
  const { slice, pagination } = paginate(rows, q);
  return { success: true, data: slice, pagination };
});
GET('/stores/:slug/reviews', ({ slug }, q) => {
  const s = db.stores.find((x) => x.slug === slug);
  const rows = db.reviews.filter((r) => r.storeId === s?.id);
  const { slice, pagination } = paginate(rows, q, 10);
  return { success: true, data: slice, meta: reviewSummary(rows), pagination };
});
GET('/stores/:slug', ({ slug }) => {
  const s = db.stores.find((x) => x.slug === slug);
  if (!s) return { status: 404, body: { success: false, message: 'Store not found' } };
  return ok({ ...s, listingCount: db.listings.filter((l) => l.storeId === s.id).length });
});
GET('/stores', (_p, q) => {
  const { slice, pagination } = paginate(db.stores, q);
  return { success: true, data: slice, pagination };
});

// --- Chat ---

const sideOf = (c, side) => (side === 'selling' ? c.storeId === MY_STORE_ID : c.buyerId === 'me');

GET('/conversations/unread', () => {
  const buying = db.conversations.filter((c) => c.buyerId === 'me').reduce((n, c) => n + c.buyerUnread, 0);
  const selling = db.conversations.filter((c) => c.storeId === MY_STORE_ID).reduce((n, c) => n + c.vendorUnread, 0);
  return ok({ buying, selling, total: buying + selling });
});

GET('/conversations', (_p, q) => {
  const side = q.side === 'selling' ? 'selling' : 'buying';
  let rows = db.conversations.filter((c) => sideOf(c, side));
  if (q.status) rows = rows.filter((c) => c.status === q.status);
  const shaped = rows.map(({ messages, ...c }) => ({
    ...c,
    unread: side === 'selling' ? c.vendorUnread : c.buyerUnread,
    buyer: side === 'selling' ? c.buyer : null,
  }));
  const { slice, pagination } = paginate(shaped, q, 20);
  return {
    success: true,
    data: slice,
    meta: { unreadTotal: shaped.reduce((n, c) => n + c.unread, 0) },
    pagination,
  };
});

GET('/conversations/:id', ({ id }) => {
  const c = db.conversations.find((x) => x.id === id);
  if (!c) return { status: 404, body: { success: false, message: 'Conversation not found' } };
  const myRole = c.storeId === MY_STORE_ID ? 'VENDOR' : 'BUYER';
  return ok({ ...c, myRole, unread: myRole === 'VENDOR' ? c.vendorUnread : c.buyerUnread });
});

POST('/conversations/:id/messages', ({ id }, _q, body) => {
  const c = db.conversations.find((x) => x.id === id);
  if (!c) return { status: 404, body: { success: false, message: 'Conversation not found' } };
  const senderRole = c.storeId === MY_STORE_ID ? 'VENDOR' : 'BUYER';
  const msg = {
    id: `msg-${id}-${c.messages.length + 1}`,
    conversationId: id,
    senderId: senderRole === 'VENDOR' ? 'vendor-me' : 'me',
    senderRole,
    body: body.body ?? '',
    readAt: null,
    createdAt: iso(0),
  };
  c.messages.push(msg);
  c.lastMessage = msg;
  c.lastMessageAt = msg.createdAt;
  return { status: 201, body: ok(msg) };
});

POST('/conversations/:id/read', ({ id }) => {
  const c = db.conversations.find((x) => x.id === id);
  if (!c) return { status: 404, body: { success: false, message: 'Conversation not found' } };
  const n = c.storeId === MY_STORE_ID ? c.vendorUnread : c.buyerUnread;
  if (c.storeId === MY_STORE_ID) c.vendorUnread = 0; else c.buyerUnread = 0;
  return ok({ markedRead: n });
});

POST('/conversations/:id/archive', ({ id }) => {
  const c = db.conversations.find((x) => x.id === id);
  if (!c) return { status: 404, body: { success: false, message: 'Conversation not found' } };
  c.status = 'ARCHIVED';
  const { messages, ...rest } = c;
  return ok(rest);
});

POST('/conversations', (_p, _q, body) => {
  const l = findListing(body.listingId);
  const s = storeById(l?.storeId);
  const id = `conv-${db.conversations.length + 1}`;
  const msg = {
    id: `msg-${id}-1`, conversationId: id, senderId: 'me', senderRole: 'BUYER',
    body: body.message ?? '', readAt: null, createdAt: iso(0),
  };
  const conv = {
    id, listingId: l?.id ?? null, storeId: s?.id ?? MY_STORE_ID, buyerId: 'me',
    status: 'OPEN', lastMessageAt: msg.createdAt, buyerUnread: 0, vendorUnread: 1,
    vendorFirstReplyAt: null, buyer: { id: 'me', name: 'You' }, lastMessage: msg,
    listing: l ? { id: l.id, name: l.name, slug: l.slug, images: l.images, basePrice: l.basePrice, priceType: l.priceType } : null,
    store: s ? { id: s.id, name: s.name, slug: s.slug, logo: s.logo, verificationTier: s.verificationTier } : null,
    messages: [msg], myRole: 'BUYER', unread: 0,
  };
  db.conversations.unshift(conv);
  return { status: 201, body: ok(conv) };
});

// --- Reviews (vendor replies) ---

POST('/reviews/:id/reply', ({ id }, _q, body) => {
  const r = db.reviews.find((x) => x.id === id);
  if (!r) return { status: 404, body: { success: false, message: 'Review not found' } };
  r.vendorReply = body.reply ?? '';
  r.vendorRepliedAt = iso(0);
  return ok(r);
});
DELETE('/reviews/:id/reply', ({ id }) => {
  const r = db.reviews.find((x) => x.id === id);
  if (!r) return { status: 404, body: { success: false, message: 'Review not found' } };
  r.vendorReply = null;
  r.vendorRepliedAt = null;
  return ok(r);
});
PATCH('/reviews/:id', ({ id }, _q, body) => {
  const r = db.reviews.find((x) => x.id === id);
  if (!r) return { status: 404, body: { success: false, message: 'Review not found' } };
  Object.assign(r, body, { updatedAt: iso(0) });
  return ok(r);
});
DELETE('/reviews/:id', ({ id }) => {
  db.reviews = db.reviews.filter((x) => x.id !== id);
  return ok(null);
});

// --- Reports ---

POST('/reports', (_p, _q, body) => ({ status: 201, body: ok({ id: `rep-${Date.now()}`, ...body, status: 'PENDING', createdAt: iso(0) }) }));
GET('/reports/mine', (_p, q) => {
  const { slice, pagination } = paginate([], q);
  return { success: true, data: slice, pagination };
});

// --- Profile / auth ---

GET('/profile', () => ok(db.profile));
PATCH('/profile', (_p, _q, body) => {
  Object.assign(db.profile, body, { updatedAt: iso(0) });
  return ok(db.profile);
});
GET('/auth/me', () => ok({
  id: db.profile.userId, email: db.profile.email,
  firstName: db.profile.firstName, lastName: db.profile.lastName,
  phone: db.profile.phone, avatar: db.profile.avatar, role: 'ADMIN',
  isVerified: true, isVendor: true, vendorStatus: 'ACTIVE',
  storeName: db.profile.storeName, storeSlug: db.profile.storeSlug,
  storeDescription: db.profile.storeDescription, vendorSince: iso(300),
  createdAt: db.profile.createdAt, updatedAt: db.profile.updatedAt,
}));

// --- Admin ---

GET('/admin/dashboard/stats', () => ok(adminStats));
GET('/admin/categories', () => ok(db.categories.map((c) => ({
  ...c,
  parent: c.parentId ? (() => { const p = db.categories.find((x) => x.id === c.parentId); return p ? { id: p.id, name: p.name, slug: p.slug } : null; })() : null,
  children: db.categories.filter((x) => x.parentId === c.id).map((x) => ({ id: x.id, name: x.name, slug: x.slug, isActive: x.isActive })),
}))));
POST('/admin/categories', (_p, _q, body) => {
  const created = {
    id: `cat-new-${db.categories.length + 1}`,
    name: body.name ?? 'New category',
    slug: body.slug ?? String(body.name ?? 'new').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: body.description ?? null, parentId: body.parentId ?? undefined,
    productCount: 0, isActive: body.isActive ?? true, sortOrder: body.sortOrder ?? 99,
    createdAt: iso(0), updatedAt: iso(0),
  };
  db.categories.push(created);
  return { status: 201, body: ok(created) };
});
GET('/admin/categories/:id', ({ id }) => ok(db.categories.find((c) => c.id === id) ?? null));
PUT('/admin/categories/:id', ({ id }, _q, body) => {
  const c = db.categories.find((x) => x.id === id);
  if (!c) return { status: 404, body: { success: false, message: 'Category not found' } };
  Object.assign(c, body, { updatedAt: iso(0) });
  return ok(c);
});
DELETE('/admin/categories/:id', ({ id }) => {
  db.categories = db.categories.filter((c) => c.id !== id);
  return ok(null);
});

GET('/admin/users', (_p, q) => {
  let rows = db.users;
  if (q.role) rows = rows.filter((u) => u.role === q.role);
  if (q.search) {
    const needle = String(q.search).toLowerCase();
    rows = rows.filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(needle));
  }
  const { slice, pagination } = paginate(rows, q, 20);
  return { success: true, data: slice, pagination };
});
PATCH('/admin/users/:id/role', ({ id }, _q, body) => {
  const u = db.users.find((x) => x.id === id || x.userId === id);
  if (!u) return { status: 404, body: { success: false, message: 'User not found' } };
  u.role = body.role;
  return ok(u);
});

// ─── Dispatch ───────────────────────────────────────────────────

const matchRoute = (method, pathname) => {
  const parts = pathname.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.method !== method) continue;
    const pat = r.pattern.split('/').filter(Boolean);
    if (pat.length !== parts.length) continue;
    const params = {};
    let hit = true;
    for (let i = 0; i < pat.length; i += 1) {
      if (pat[i].startsWith(':')) params[pat[i].slice(1)] = decodeURIComponent(parts[i]);
      else if (pat[i] !== parts[i]) { hit = false; break; }
    }
    if (hit) return { handler: r.handler, params, pattern: r.pattern };
  }
  return null;
};

const readBody = (req) => new Promise((resolve) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return resolve({});
    try { resolve(JSON.parse(raw)); } catch { resolve({ _raw: raw }); }
  });
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const query = Object.fromEntries(url.searchParams.entries());

  // Permissive CORS — this is a local dev stand-in, never a deployed service.
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Session-ID');

  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }

  // Real product photos from mock-api/images/. Served here rather than from
  // Vite's public/ so the whole fixture — data and media — stays in one place.
  if (url.pathname.startsWith('/images/')) {
    const name = path.basename(decodeURIComponent(url.pathname.slice('/images/'.length)));
    const file = path.join(IMAGE_DIR, name);
    // basename() already strips any traversal; this is the belt-and-braces check.
    if (!file.startsWith(IMAGE_DIR) || !/\.(jpe?g|png|webp|svg)$/i.test(name)) {
      res.writeHead(400).end('bad image path');
      return;
    }
    try {
      const buf = await readFile(file);
      const ext = path.extname(name).toLowerCase();
      const type = ext === '.png' ? 'image/png'
        : ext === '.webp' ? 'image/webp'
        : ext === '.svg' ? 'image/svg+xml'
        : 'image/jpeg';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' });
      res.end(buf);
    } catch {
      console.warn(`  404  GET ${url.pathname}  (no such image)`);
      res.writeHead(404, { 'Content-Type': 'image/svg+xml' });
      res.end(placeholderSvg(name, 'missing image'));
    }
    return;
  }

  // Generated placeholders, for records with no photo of their own.
  if (url.pathname.startsWith('/img/')) {
    const seed = url.pathname.slice(5).replace(/\.svg$/, '');
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' });
    res.end(placeholderSvg(seed, query.label));
    return;
  }

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, mock: true, routes: routes.length }));
    return;
  }

  const pathname = url.pathname.startsWith(PREFIX) ? url.pathname.slice(PREFIX.length) || '/' : url.pathname;
  const match = matchRoute(req.method, pathname);

  if (LATENCY_MS) await new Promise((r) => setTimeout(r, LATENCY_MS));

  if (!match) {
    console.warn(`  ⚠ unhandled  ${req.method} ${url.pathname}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    // An empty, well-formed envelope keeps unknown routes from crashing a page.
    res.end(JSON.stringify({
      success: true, data: [], meta: {},
      pagination: { page: 1, limit: 24, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      message: `Mock API has no handler for ${req.method} ${pathname}`,
    }));
    return;
  }

  const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};

  try {
    const result = await match.handler(match.params, query, body);
    const status = result && typeof result === 'object' && 'status' in result && 'body' in result ? result.status : 200;
    const payload = status === 200 ? result : result.body;
    console.log(`  ${status}  ${req.method} ${url.pathname}`);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  } catch (err) {
    console.error(`  500  ${req.method} ${url.pathname}`, err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n  WorldShop mock API`);
  console.log(`  ➜  http://localhost:${PORT}${PREFIX}`);
  console.log(`  ➜  health: http://localhost:${PORT}/health`);
  console.log(`  ${routes.length} routes · ${db.listings.length} listings · ${db.stores.length} stores · ${db.conversations.length} conversations\n`);
});
