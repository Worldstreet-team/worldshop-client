/**
 * Single source of truth for what a store's verificationTier means. Shared
 * so the homepage spotlight card and the listing-page trust panel can never
 * disagree on which tiers actually represent verification versus a plain
 * subscription tier — BASIC is the latter, not a verification claim.
 */
export const VERIFICATION_LABEL: Record<string, string> = {
  UNVERIFIED: '',
  EMAIL_VERIFIED: 'Email verified',
  ID_VERIFIED: 'ID verified',
  BUSINESS_VERIFIED: 'Business verified',
  BASIC: 'Basic',
  VERIFIED: 'Verified',
  PREMIUM: 'Premium seller',
};

export const isVerifiedTier = (tier: string): boolean =>
  Boolean(VERIFICATION_LABEL[tier]) && tier !== 'BASIC';
