/**
 * Subscription Tier Configuration
 *
 * Defines which cards are available to each subscription tier:
 * - FREE: 6 cards (Search, Boundary, Details, Key Metrics, Housing Metrics, Building Approvals)
 * - PLUS: FREE + 3 additional cards (Dwelling Approvals by LGA, Age by Sex, Dwelling Type)
 * - PRO: All cards unlocked
 */

export type TierName = 'free' | 'plus' | 'pro';

export interface TierConfig {
  name: TierName;
  displayName: string;
  price: number; // Monthly price in cents (0 for free)
  stripePriceId?: string; // Stripe Price ID for this tier
  description: string;
  features: string[];
  allowedCards: string[]; // Card IDs that are unlocked for this tier
  maxCards?: number; // Maximum number of cards on dashboard (undefined = unlimited)
}

/**
 * Card type mapping to user-friendly names
 */
export const CARD_NAMES: Record<string, string> = {
  // Free tier cards
  'search-geography-card': 'Search Geography',
  'australia-map': 'Boundary Map',
  'location-details': 'LGA Details',
  'kpi-cards': 'Key Metrics',
  'market-overview': 'Housing Metrics',
  'building-approvals-chart': 'Building Approvals',

  // Plus tier additional cards
  'lga-dwelling-approvals': 'Dwelling Approvals by LGA',
  'age-by-sex': 'Age by Sex',
  'dwelling-type': 'Dwelling Type',

  // Pro tier additional cards
  'housing-pipeline': 'Housing Development Pipeline',
  'market-forecast': 'Market Forecast',
  'regional-comparison': 'Regional Comparison',
  'data-freshness': 'Data Freshness',
  'interactive-map': 'Interactive Map',
  'bar-chart': 'Bar Chart',
  'line-chart': 'Line Chart',
  'pie-chart': 'Pie Chart',
  'trend-chart': 'Trend Analysis',
  'housing-affordability': 'Housing Affordability',
  'property-values': 'Property Values',
  'population-metrics': 'Population Data',
  'development-stats': 'Development Statistics',
  'data-table': 'Data Table',
  'comparison-table': 'Comparison Table',
  'time-series': 'Time Series',
  'progress-tracker': 'Progress Tracker',
  'insights-panel': 'Insights Panel',
  'percentage-display': 'Percentage Display',
  'counter-display': 'Counter Display',
  'blank-card': 'Blank Card',
  'test-card': 'Test Card',
};

/**
 * Free Tier - 6 cards available
 */
export const FREE_TIER: TierConfig = {
  name: 'free',
  displayName: 'Free',
  price: 0,
  description: 'Perfect for getting started with basic housing insights',
  features: [
    '6 essential cards',
    'Search geography by LGA',
    'Basic building approvals data',
    'LGA boundary visualization',
    'Key metrics dashboard',
    'Community support'
  ],
  allowedCards: [
    'search-geography-card',
    'australia-map',
    'location-details',
    'kpi-cards',
    'market-overview',
    'building-approvals-chart',
  ],
  maxCards: 6,
};

/**
 * Plus Tier - FREE + 3 additional cards = 9 total
 */
export const PLUS_TIER: TierConfig = {
  name: 'plus',
  displayName: 'Plus',
  price: 2900, // $29/month in cents
  stripePriceId: process.env.STRIPE_PRICE_ID_PLUS,
  description: 'For professionals needing deeper demographic insights',
  features: [
    'All Free tier features',
    '9 cards total (6 + 3 additional)',
    'Dwelling approvals by LGA',
    'Age by sex demographics',
    'Dwelling type breakdown',
    'Priority email support',
    'Export data to CSV',
  ],
  allowedCards: [
    ...FREE_TIER.allowedCards,
    'lga-dwelling-approvals',
    'age-by-sex',
    'dwelling-type',
  ],
  maxCards: 9,
};

/**
 * Pro Tier - All cards unlocked
 */
export const PRO_TIER: TierConfig = {
  name: 'pro',
  displayName: 'Pro',
  price: 7900, // $79/month in cents
  stripePriceId: process.env.STRIPE_PRICE_ID_PRO,
  description: 'Complete access for urban planning professionals',
  features: [
    'All cards unlocked',
    'Unlimited dashboard customization',
    'Housing development pipeline',
    'Market forecasting',
    'Regional comparison tools',
    'Advanced analytics',
    'API access',
    'Priority phone support',
    'Custom integrations',
  ],
  allowedCards: Object.keys(CARD_NAMES), // All cards available
  maxCards: undefined, // Unlimited
};

/**
 * All tiers in order (Free -> Plus -> Pro)
 */
export const TIERS: Record<TierName, TierConfig> = {
  free: FREE_TIER,
  plus: PLUS_TIER,
  pro: PRO_TIER,
};

/**
 * Check if a user's tier has access to a specific card
 */
export function canAccessCard(userTier: TierName, cardType: string): boolean {
  const tier = TIERS[userTier];
  return tier.allowedCards.includes(cardType);
}

/**
 * Get list of locked cards for a user's tier
 */
export function getLockedCards(userTier: TierName): string[] {
  const tier = TIERS[userTier];
  const allCards = Object.keys(CARD_NAMES);
  return allCards.filter(card => !tier.allowedCards.includes(card));
}

/**
 * Get upgrade suggestions for locked card
 */
export function getRequiredTierForCard(cardType: string): TierName | null {
  if (PLUS_TIER.allowedCards.includes(cardType)) return 'plus';
  if (PRO_TIER.allowedCards.includes(cardType)) return 'pro';
  return null; // Card not found or available in free tier
}

/**
 * Format price for display
 */
export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free';
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Get tier by name (with fallback to free)
 */
export function getTier(tierName?: string | null): TierConfig {
  if (!tierName || !(tierName in TIERS)) {
    return FREE_TIER;
  }
  return TIERS[tierName as TierName];
}

/**
 * Get tier comparison for upgrade page
 */
export function getTierComparison() {
  return [FREE_TIER, PLUS_TIER, PRO_TIER];
}
