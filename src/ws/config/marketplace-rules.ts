/**
 * Every rule number in the marketplace lives here. Values come from the docs
 * (docs/marketplace/worldstreet-ux-flows.md, worldstreet-ebay-component-spec.md) and
 * are proposed defaults until the owner of each decision (flows Part K) signs off.
 *
 * Money is integer kobo (₦1 = 100 kobo). Durations are in the unit named by the key.
 */

const NAIRA = 100;

export const rules = {
  time: {
    zone: "Africa/Lagos", // R-006: store UTC, display WAT
  },
  money: {
    currency: "NGN", // R-002, EC-028: one currency, no mixed lists
    minorPerMajor: NAIRA,
  },
  location: {
    radiiKm: [5, 10, 25] as const, // R-001; "nationwide" is null
    defaultRadiusKm: 25,
  },
  search: {
    debounceMs: 150, // B2
    minChars: 2, // B2
    pageSize: 24, // §16.7
    maxSuggestions: 10, // spec §6 search box
    recentShown: 5, // Baymard/NN/g: a short list scans; research 6 Oct
    trendingShown: 5,
    recentStored: 8,
    maxSuggestionsPhone: 6, // the Phase 1 full-screen phone search
    // B2 Delivery filter says "≤ 2 days"; cards quote handling + transit (rider 1–2 days
    // after up to 2 handling days), so the filter uses the card's upper bound.
    fastDeliveryDays: 4,
    listedWithinDays: [1, 7, 30] as const, // B2 "Listed within" (24 h, 7 d, 30 d)
    spellMinLength: 4, // UI research Phase 2: only correct words of 4+ letters…
    spellMaxEdits: 1, // …one edit away (Damerau–Levenshtein)
    relatedShown: 6, // RelatedSearches chips at the end of results
    facetOptionsShown: 5, // a filter group shows this many before "Show more" (eBay)
    // PriceRangeFilter presets in naira (spec §6: "Under ₦10k, ₦10–50k…"); null = open end
    pricePresets: [
      [null, 10_000],
      [10_000, 50_000],
      [50_000, 200_000],
      [200_000, 1_000_000],
      [1_000_000, null],
    ] as const,
  },
  home: {
    maxHeroSlides: 3, // R-015 (stricter than spec §4, PLAN C6)
    heroAutoplayMs: 7000, // R-015: rotates only with motion allowed, pauses on hover and focus
    minRailItems: 4, // R-014
    railMax: 12, // cards per rail; "See all" opens the full search
    moreMax: 8, // "More near you" grid after the sell block (B1 "All listings")
    recentlyViewedMax: 12, // B1 Recently viewed rail (returning buyers), newest first
  },
  card: {
    maxFacts: 3, // subtitle line facts after the condition (Baymard: show category attributes)
    maxFactsNarrow: 1, // under 240px
    photosMax: 4, // photos a buyer can step through from a card (eBay steps up to 4)
  },
  hidden: {
    maxListings: 200, // "Not interested"; oldest drop off first (kept in a cookie for the server)
    maxSellers: 50, // "Hide seller"
  },
  saved: {
    maxListings: 500, // R-027
    maxSearches: 50, // R-027
    retainSoldDays: 30, // R-026, §6.6
  },
  offers: {
    validityHours: 48, // §6.6
    payWindowHours: 24, // R-034, §6.6
    quickPercent: [90, 85, 80] as const, // B6 quick offer amounts
    refreshMs: 30_000, // refresh local mock deadlines while a page stays open
    floorPercent: 50, // B6 step 2: offers ≥ 50% of list price
    perListing: 3, // R-030 (expired offers still count, B6)
    maxOpen: 5, // R-030
  },
  // P2P (owner's direction, 7 Oct): no cart or checkout. B9's payment rules apply to the
  // seller's payment request, sent in chat once a deal is agreed.
  paymentRequest: {
    lockMinutes: 10, // R-041: the item is held while the buyer pays the request
    bankTransferMinutes: 30, // B9, §6.6
    pollSeconds: 60, // B9
  },
  delivery: {
    typicalHandlingDays: 1, // research 6 Oct: lower end of the delivery-time range on cards
  },
  trust: {
    newSellerFeedbackCount: 10, // spec §440: "New seller" under this many ratings; best match weights feedback fully from here
  },
  media: {
    thumbQuality: 60, // rail and compact thumbnails only (research 6 Oct; 45 judged too lossy)
    highPriorityCards: 2, // fetchpriority="high" on the first N result photos (LCP)
    eagerCards: 4, // loading="eager" on the first N; the rest are lazy
  },
  three: {
    // 3D (home hero, listing viewer) only where it won't hurt: many buyers are on
    // budget Android phones and metered data (spec §16.7). Below these, the static
    // fallback shows instead.
    minDeviceMemoryGb: 4, // navigator.deviceMemory; unknown counts as enough
    minCores: 4, // navigator.hardwareConcurrency
    maxPixelRatio: 1.75, // render-size cap; sharper isn't worth the fill rate
    maxFps: 60,
  },
  orders: {
    sellerConfirmHours: 12, // §6.6
    handlingDays: 2, // R-061
    deliveryReattempts: 2, // R-064
  },
  escrow: {
    // L4: hours after Delivered; null = no auto-release (manual / milestone)
    inspectionHours: {
      default: 48,
      fashion: 48,
      home: 48,
      electronics: 72,
      phones: 72,
      appliances: 72,
      furniture: 72,
      vehicles: null,
      property: null,
      services: null,
      meetUp: 24,
    },
    extensionHours: 24, // L4
    remindersBeforeHours: [24, 2] as const, // R-211 (plus one at delivery)
    // L4 risk-tiered payout delay after release
    payoutDelay: {
      new: { delayHours: 48, reservePercent: 10, reserveDays: 14, firstOrders: 10 },
      standard: { delayHours: 24, reservePercent: 0, reserveDays: 0 },
      trusted: { delayHours: 0, reservePercent: 0, reserveDays: 0 },
    },
    highValueMinor: 500_000 * NAIRA, // L4: above this, +24 h and KYC L2+
    highValueExtraHours: 24,
    missingProofCaseHours: 72, // R-210
  },
  protection: {
    anyIssueDays: 14, // L7
    counterfeitSafetyDays: 45, // L7, R-242
    fundCapMinor: null as number | null, // L15: business decision, not shown as a number
  },
  disputes: {
    sellerResponseHours: 48, // §6.6
    opsSlaBusinessDays: 3, // §6.6
    appealDays: 7, // R-082
    returnShipDays: 5, // §6.6
  },
  reviews: {
    editDays: 7, // R-071
  },
  seller: {
    titleMax: 80, // S2 step 3
    descriptionMax: 5_000, // S2 step 3
    wasPriceMinDays: 7, // S2 step 4: a crossed-out price needs this many days at the higher price
    photosMax: 12, // S2 step 1
    photoMinPx: 600, // R-114
    photoMaxMb: 10, // R-114
    durationDays: 30, // R-115
    priceWarnAbovePercent: 30, // S2 step 4: more than 30% above the comparable median
    priceWarnBelowPercentOfMedian: 40, // EC-027: price under 40% of the comparable median
  },
  fees: {
    finalValuePercent: 5, // S2 step 7, K4
    paymentPercent: 1.5, // S2 step 7, K4
    minWithdrawalMinor: 1_000 * NAIRA, // S6
  },
  limits: {
    l1CapMinor: 200_000 * NAIRA, // K3 placeholder
    l2CapMinor: 5_000_000 * NAIRA, // K3 placeholder
  },
  messaging: {
    maxChars: 1_000, // B5 step 2
    maxPhotos: 3, // B5 step 2
    photoMaxBytes: 1_000_000, // local demo attachments; production needs an upload service
    newThreadsPerDay: 20, // R-053 (L1 buyers)
  },
  listing: {
    specificsShown: 8, // spec §7 ItemSpecifics: collapsible after 8 rows
    descriptionLines: 12, // spec §7 DescriptionBlock: "Read more" after 12 lines
    relatedRailMax: 12, // spec §7 SimilarItemsRail / SellerOtherItemsRail: cards per rail
    reviewsShown: 5, // spec §7 ReviewsSection: then "Show more reviews" (eBay shows a handful)
    reviewsStep: 10, // reviews added per "Show more"
  },
  moderation: {
    reportReviewHours: 24, // flows §632: normal-risk SLA (high risk is 1 h, internal)
    reportDetailsMax: 500,
    highRiskHours: 1, // A1: high-risk items (luxury authenticity, prohibited, counterfeit, scam) within 1 h
  },
  admin: {
    reversalApprovalMinor: 100_000 * NAIRA, // R-260: reversals above this need a second person
    rationaleMin: 20, // L8 step 5: written rationale shown to both parties
  },
  demand: {
    watchersThreshold: 10, // R-025, PLAN C7
  },
  tracking: {
    requiredAboveMinor: 20_000 * NAIRA, // R-141
  },
  notifications: {
    quietHours: { start: "22:00", end: "07:00" }, // Part D
  },
  flags: {
    autoDecideDisputes: false, // PLAN F1
    payOnDelivery: false, // K5
    auctions: false, // Phase 9 (B7): not built; P2P deals run on offers
    // Phase 9 growth features ship behind flags; these three are low-risk buyer tools.
    compare: true, // spec §270 CompareTray
    priceHistory: true, // spec §320 PriceHistorySparkline
    alerts: true, // B4 step 4
    promotions: true, // S2/S3 Promote
    bulkImport: true, // R-122
    analytics: true, // AnalyticsDashboard
  },
  compare: {
    max: 4, // spec: sticky tray of up to 4 items
  },
  alerts: {
    checkEveryMs: 5 * 60_000, // while a tab is open; production pushes from the server (R-012)
  },
  promotions: {
    // Promoted listings: an ad rate charged only when a promoted item sells (K4 fee model, open).
    minRatePercent: 2,
    maxRatePercent: 15,
    suggestedRatePercent: 5,
  },
  bulkImport: {
    maxRows: 200, // R-122
    maxBytes: 1_000_000,
  },
  priceHistory: {
    days: 30, // spec: sparkline of the last 30 days
  },
} as const;

export type MarketplaceRules = typeof rules;
