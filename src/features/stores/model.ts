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

export function sinceLabel(iso: string): string | null {
  const at = new Date(iso);
  return Number.isNaN(at.getTime())
    ? null
    : at.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/** Average reply time as a buyer reads it: "~5 min", "~2 hr", "~3 days". */
export function replyTime(mins: number): string {
  if (mins < 60) return `~${Math.max(1, Math.round(mins))} min`;
  if (mins < 60 * 24) return `~${Math.round(mins / 60)} hr`;
  const days = Math.round(mins / (60 * 24));
  return `~${days} day${days === 1 ? '' : 's'}`;
}

export const tabId = (prefix: string, key: string) => `${prefix}-tab-${key}`;
export const panelId = (prefix: string, key: string) => `${prefix}-panel-${key}`;
