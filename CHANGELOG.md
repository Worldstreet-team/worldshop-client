# Changelog

All notable changes to worldshop-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
