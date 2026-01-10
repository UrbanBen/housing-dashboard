/**
 * NextAuth Type Extensions
 *
 * Extends NextAuth's default types to include our custom user fields
 */

import { TierName } from '@/lib/tiers';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extended Session type with subscription information
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      tier: TierName;
      subscriptionStatus?: string;
      subscriptionCurrentPeriodEnd?: Date;
    };
  }

  /**
   * Extended User type
   */
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    tier: TierName;
    subscriptionStatus?: string;
    subscriptionCurrentPeriodEnd?: Date;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extended JWT type
   */
  interface JWT {
    id: string;
    tier: TierName;
    subscriptionStatus?: string;
    subscriptionCurrentPeriodEnd?: Date;
    provider?: string;
  }
}
