/**
 * OAuth Configuration API Route
 *
 * Returns which OAuth providers are configured
 * This allows the client to conditionally render OAuth buttons
 */

import { NextResponse } from 'next/server';
import { getConfiguredOAuthProviders } from '@/lib/oauth-providers';

export async function GET() {
  const config = getConfiguredOAuthProviders();
  return NextResponse.json(config);
}
