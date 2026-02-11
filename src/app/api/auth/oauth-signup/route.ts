/**
 * OAuth User Signup API Route
 *
 * Handles user account creation for OAuth providers (Microsoft, Google)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOAuthUser, linkOAuthAccount } from '@/lib/auth-helpers';
import { z } from 'zod';

/**
 * OAuth signup request schema
 */
const oauthSignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  image: z.string().optional(),
  provider: z.enum(['microsoft', 'google']),
  providerAccountId: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional(),
  tokenType: z.string().optional(),
  scope: z.string().optional(),
  idToken: z.string().optional(),
});

/**
 * POST /api/auth/oauth-signup
 * Create a new user account from OAuth provider
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = oauthSignupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, name, image, provider, providerAccountId, ...oauthData } = validationResult.data;

    // Create user in database (OAuth users have no password)
    const userResult = await createOAuthUser({
      email,
      name,
      image,
    });

    if (!userResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: userResult.error,
        },
        { status: 400 }
      );
    }

    // Link OAuth account to user
    const linkedSuccess = await linkOAuthAccount({
      userId: userResult.userId,
      provider,
      providerAccountId,
      ...oauthData,
    });

    if (!linkedSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to link OAuth account',
        },
        { status: 500 }
      );
    }

    // Success - user and OAuth account created
    return NextResponse.json(
      {
        success: true,
        message: 'OAuth account created successfully',
        userId: userResult.userId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[OAuth Signup API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during OAuth signup',
      },
      { status: 500 }
    );
  }
}
