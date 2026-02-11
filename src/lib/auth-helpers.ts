/**
 * Authentication Helper Functions
 *
 * Utilities for user authentication, password hashing, and tier management
 */

import bcrypt from 'bcrypt';
import { getAdminPool } from './db-pool';
import type { TierName } from './tiers';

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a new user account
 */
export async function createUser(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ success: true; userId: number } | { success: false; error: string }> {
  const pool = getAdminPool(); // Use admin pool for writes

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM auth.users WHERE email = $1',
      [data.email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const result = await pool.query(
      `INSERT INTO auth.users (email, password_hash, name, tier, email_verified)
       VALUES ($1, $2, $3, 'free', NOW())
       RETURNING id`,
      [data.email.toLowerCase(), passwordHash, data.name || null]
    );

    const userId = result.rows[0].id;

    // Log registration in audit log
    await pool.query(
      `INSERT INTO auth.audit_log (user_id, action, details)
       VALUES ($1, 'register', $2)`,
      [userId, JSON.stringify({ method: 'credentials', tier: 'free' })]
    );

    return { success: true, userId };
  } catch (error) {
    console.error('[createUser] Error:', error);
    return { success: false, error: 'Failed to create user account' };
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const pool = getAdminPool();

  const result = await pool.query(
    `SELECT id, email, password_hash, name, tier, stripe_customer_id,
            subscription_status, subscription_current_period_end, created_at
     FROM auth.users
     WHERE email = $1`,
    [email.toLowerCase()]
  );

  return result.rows[0] || null;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const pool = getAdminPool();

  const result = await pool.query(
    `SELECT id, email, name, tier, image, stripe_customer_id,
            subscription_status, subscription_current_period_end, created_at
     FROM auth.users
     WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Update user tier (called by Stripe webhook)
 */
export async function updateUserTier(
  userId: number,
  tier: TierName,
  subscriptionData?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    currentPeriodEnd?: Date;
  }
): Promise<boolean> {
  const pool = getAdminPool();

  try {
    const params: any[] = [tier, userId];
    let query = 'UPDATE auth.users SET tier = $1, updated_at = NOW()';

    if (subscriptionData) {
      const fields: string[] = [];
      let paramIndex = 3;

      if (subscriptionData.stripeCustomerId) {
        fields.push(`stripe_customer_id = $${paramIndex++}`);
        params.splice(2, 0, subscriptionData.stripeCustomerId);
      }
      if (subscriptionData.stripeSubscriptionId) {
        fields.push(`stripe_subscription_id = $${paramIndex++}`);
        params.splice(2, 0, subscriptionData.stripeSubscriptionId);
      }
      if (subscriptionData.subscriptionStatus) {
        fields.push(`subscription_status = $${paramIndex++}`);
        params.splice(2, 0, subscriptionData.subscriptionStatus);
      }
      if (subscriptionData.currentPeriodEnd) {
        fields.push(`subscription_current_period_end = $${paramIndex++}`);
        params.splice(2, 0, subscriptionData.currentPeriodEnd);
      }

      if (fields.length > 0) {
        query += ', ' + fields.join(', ');
      }
    }

    query += ` WHERE id = $${params.length}`;

    await pool.query(query, params);

    // Log tier change in audit log
    await pool.query(
      `INSERT INTO auth.audit_log (user_id, action, details)
       VALUES ($1, 'tier_change', $2)`,
      [userId, JSON.stringify({ new_tier: tier, ...subscriptionData })]
    );

    return true;
  } catch (error) {
    console.error('[updateUserTier] Error:', error);
    return false;
  }
}

/**
 * Log card usage for analytics
 */
export async function logCardUsage(
  userId: number | null,
  cardType: string,
  action: string = 'view',
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  const pool = getAdminPool();

  try {
    await pool.query(
      `INSERT INTO auth.usage_logs (user_id, card_type, action, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        cardType,
        action,
        metadata?.ipAddress || null,
        metadata?.userAgent || null,
      ]
    );
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('[logCardUsage] Error:', error);
  }
}

/**
 * Check if user's subscription is active
 */
export function isSubscriptionActive(user: any): boolean {
  if (!user) return false;

  // Free tier is always "active"
  if (user.tier === 'free') return true;

  // Check subscription status and expiry
  if (user.subscription_status !== 'active') return false;

  if (user.subscription_current_period_end) {
    const expiryDate = new Date(user.subscription_current_period_end);
    return expiryDate > new Date();
  }

  return false;
}

/**
 * Get effective tier for user (downgrades to free if subscription expired)
 */
export function getEffectiveTier(user: any): TierName {
  if (!user) return 'free';

  // If subscription is inactive or expired, revert to free
  if (!isSubscriptionActive(user)) {
    return 'free';
  }

  return user.tier as TierName;
}

/**
 * Create OAuth user (no password)
 */
export async function createOAuthUser(data: {
  email: string;
  name?: string;
  image?: string;
}): Promise<{ success: true; userId: number } | { success: false; error: string }> {
  const pool = getAdminPool();

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM auth.users WHERE email = $1',
      [data.email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return { success: false, error: 'Email already registered' };
    }

    // Create user without password (OAuth only)
    const result = await pool.query(
      `INSERT INTO auth.users (email, name, image, tier, email_verified, password_hash)
       VALUES ($1, $2, $3, 'free', NOW(), NULL)
       RETURNING id`,
      [data.email.toLowerCase(), data.name || null, data.image || null]
    );

    const userId = result.rows[0].id;

    // Log registration in audit log
    await pool.query(
      `INSERT INTO auth.audit_log (user_id, action, details)
       VALUES ($1, 'register', $2)`,
      [userId, JSON.stringify({ method: 'oauth', tier: 'free' })]
    );

    return { success: true, userId };
  } catch (error) {
    console.error('[createOAuthUser] Error:', error);
    return { success: false, error: 'Failed to create OAuth user account' };
  }
}

/**
 * Link OAuth account to user
 */
export async function linkOAuthAccount(data: {
  userId: number;
  provider: string;
  providerAccountId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
}): Promise<boolean> {
  const pool = getAdminPool();

  try {
    await pool.query(
      `INSERT INTO auth.accounts (
        user_id, type, provider, provider_account_id,
        access_token, refresh_token, expires_at, token_type, scope, id_token
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (provider, provider_account_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()`,
      [
        data.userId,
        'oauth',
        data.provider,
        data.providerAccountId,
        data.accessToken || null,
        data.refreshToken || null,
        data.expiresAt || null,
        data.tokenType || null,
        data.scope || null,
        data.idToken || null,
      ]
    );

    return true;
  } catch (error) {
    console.error('[linkOAuthAccount] Error:', error);
    return false;
  }
}
