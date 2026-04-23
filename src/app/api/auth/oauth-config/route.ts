/**
 * OAuth Configuration API Route
 *
 * Returns which OAuth providers are configured
 * This allows the client to conditionally render OAuth buttons
 */

import { NextResponse } from 'next/server';
import { getConfiguredOAuthProviders } from '@/lib/oauth-providers';
import { createAPILogger, generateRequestId } from '@/lib/logger';

export async function GET() {
  const logger = createAPILogger('/api/auth/oauth-config', generateRequestId());

  try {
    const config = getConfiguredOAuthProviders();
    return NextResponse.json(config);
  } catch (error) {
    logger.error('[OAuth Config API] Error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to get OAuth configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
