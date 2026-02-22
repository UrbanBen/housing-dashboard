/**
 * Test Environment Variables
 *
 * Simple endpoint to verify environment variables are set
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasMicrosoftClientId: !!process.env.MICROSOFT_CLIENT_ID,
    hasMicrosoftClientSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
    // Don't expose actual secrets, just their presence
  });
}
