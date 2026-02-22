/**
 * OAuth Configuration API Route
 *
 * Returns which OAuth providers are configured
 * This allows the client to conditionally render OAuth buttons
 */

import { NextResponse } from 'next/server';
import { getConfiguredOAuthProviders } from '@/lib/oauth-providers';

export async function GET() {
  try {
    const config = getConfiguredOAuthProviders();
    return NextResponse.json(config);
  } catch (error) {
    console.error('[OAuth Config API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get OAuth configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
