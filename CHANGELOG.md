# Changelog

All notable changes to worldshop-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.11.0] - 2026-02-09

### Changed — Electro Template Home Page Redesign
- Completely rewrote Home.tsx to replicate the Electro HTML template home page layout
- Hero slider redesigned: static background image, product images per slide, CSS slide-in animations (slideInLeft/slideInRight), 3 rotating slides with 6s interval
- Removed `bannerApi` dependency — hero now uses static `heroSlides` data (no API calls)
- Promo banner cards section with 4 promotional tiles
- Deals section with countdown timer + tabbed product grid (Featured / On Sale / Top Rated)
- Tab products grid improved: bordered cells with padding instead of 1px gap, smart nth-child border removal per breakpoint
- Category showcase section with image cards
- Full-width promotional banner section
- Featured products carousel section
- Features strip (free shipping, money back, support, secure payment)

### Changed — ProductCard Electro Redesign
- Restructured ProductCard.tsx to match Electro template card layout
- New layout order: category → product name → rating → image → price + cart icon
- Body/footer structure: `.product-card-body` wraps content, `.product-card-footer` has price left + cart icon right
- Product name color changed to Electro blue (#2874f0)
- Cart button changed from full-width text to icon-only yellow circle (36px)
- Removed border-radius on cards, images use `object-fit: contain` with transparent background
- Hover shows shadow + z-index elevation (no transform)
- List variant updated for new body/footer structure

### Styles
- Complete _product.scss card section rewrite (Electro-inspired styles)
- New _pages.scss hero slider with static background, keyframe animations, slide-offer pricing display
- Tab products grid bordered cell layout with responsive nth-child border rules
- Removed `.hero-fallback` styles (no longer needed)

## [0.10.0] - 2026-02-09

### Added — Products & Categories Integration
- Product and category pages now use real API data for listings, detail, and search flows
- Shared category store for navigation and mobile menu

### Changed — Navigation & Branding
- Simplified header layout with inline nav and improved category dropdown
- Logo applied across header, mobile menu, and footer
- Favicon and web manifest wired to new brand assets

### Fixed
- Wishlist price display now supports base/sale price and legacy mock fields
- Mock product helpers now handle base price and average rating naming

## [0.9.0] - 2026-02-08

### Added — Profile Integration (Service 2)
- `profileService.ts` — API client for `GET /profile` and `PATCH /profile` on worldshop-server
- `UserProfile`, `Gender`, `UpdateProfileRequest` types in `user.types.ts`
- Profile page now fetches real data from the backend on mount
- New profile fields: date of birth, gender
- Profile auto-creates on first backend access (syncs from auth user)

### Changed — Profile Page UI Redesign
- Two-column layout: sidebar with avatar/info/quick links + main form area
- Avatar with gradient initials fallback
- Breadcrumb navigation (My Account / Profile)
- Modern form fields with focus states, error highlighting, and disabled styling
- Quick links sidebar for Orders, Addresses, Wishlist
- Security section links to external WorldStreet auth for password changes
- Loading spinner state while fetching profile
- Save button with inline spinner + disabled state when form is clean
- Responsive: collapses to single column on smaller screens

### Changed — API Configuration
- `VITE_API_BASE_URL` updated to point to worldshop-server at `http://localhost:8000/api/v1`

### Styles
- Complete profile page SCSS rewrite with BEM naming
- New `.form-field` component styles (input, select, error, hint, disabled states)
- `.profile-card`, `.profile-nav`, `.profile-section`, `.profile-breadcrumb` components
- Custom select dropdown arrow via SVG background
- Spinner animation keyframes

## [0.8.0] - Previous

### Added
- External auth integration with WorldStreet Identity (HttpOnly cookies)
- Protected routes with `ProtectedRoute` and `AdminRoute`
- Auth store with verify → refresh → redirect flow
- Cleaned all auth console logs and dev tools
