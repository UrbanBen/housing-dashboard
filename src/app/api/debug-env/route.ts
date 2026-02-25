/**
 * Debug Environment Variables
 * Shows which auth-related environment variables are actually set
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    // Check if variables exist (not their values for security)
    NEXTAUTH_SECRET_exists: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_SECRET_length: process.env.NEXTAUTH_SECRET?.length || 0,
    NEXTAUTH_SECRET_first5: process.env.NEXTAUTH_SECRET?.substring(0, 5) || 'MISSING',

    NEXTAUTH_URL_exists: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_value: process.env.NEXTAUTH_URL || 'MISSING',

    MICROSOFT_CLIENT_ID_exists: !!process.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_ID_length: process.env.MICROSOFT_CLIENT_ID?.length || 0,

    MICROSOFT_CLIENT_SECRET_exists: !!process.env.MICROSOFT_CLIENT_SECRET,
    MICROSOFT_CLIENT_SECRET_length: process.env.MICROSOFT_CLIENT_SECRET?.length || 0,

    DATABASE_PASSWORD_exists: !!process.env.DATABASE_PASSWORD,
    DATABASE_ADMIN_PASSWORD_exists: !!process.env.DATABASE_ADMIN_PASSWORD,

    // Show ALL environment variable names (not values) that start with NEXT
    allNextAuthVars: Object.keys(process.env).filter(key => key.startsWith('NEXT')),
  });
}
