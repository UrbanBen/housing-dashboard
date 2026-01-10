/**
 * NextAuth.js Route Handler
 *
 * Handles authentication requests for Next.js App Router
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// Export NextAuth handler for App Router
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
