/**
 * NextAuth.js Configuration
 *
 * Configures authentication providers, database adapter, and session management
 * Supports email/password (credentials) and OAuth (Google, Microsoft)
 */

import { AuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { Provider } from 'next-auth/providers/index';
import {
  getUserByEmail,
  verifyPassword,
  getUserById,
  getEffectiveTier,
  linkOAuthAccount,
} from '@/lib/auth-helpers';
import { TierName } from '@/lib/tiers';

/**
 * Extended User type with subscription information
 */
interface ExtendedUser extends NextAuthUser {
  id: string;
  tier: TierName;
  subscriptionStatus?: string;
  subscriptionCurrentPeriodEnd?: Date;
}

/**
 * Check and log OAuth provider configuration on startup
 */
if (process.env.NODE_ENV === 'development') {
  const oauthStatus = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoft: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
  };

  console.log('\n[OAuth Config]');
  console.log('  Google:    ' + (oauthStatus.google ? 'Configured' : 'Not configured'));
  console.log('  Microsoft: ' + (oauthStatus.microsoft ? 'Configured' : 'Not configured'));

  if (!oauthStatus.google && !oauthStatus.microsoft) {
    console.warn('\n[Warning] No OAuth providers configured. Only email/password login available.');
    console.warn('See AUTH_SETUP_GUIDE.md for setup instructions.\n');
  }
}

/**
 * NextAuth configuration
 */
export const authOptions: AuthOptions = {
  // Use JWT strategy (simpler than database sessions for now)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Custom pages
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login', // Error code passed in query string as ?error=
    newUser: '/dashboard', // Redirect new users to dashboard
  },

  // Authentication providers
  providers: [
    // Email/Password authentication
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'you@example.com'
        },
        password: {
          label: 'Password',
          type: 'password'
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        try {
          // Get user from database
          const user = await getUserByEmail(credentials.email);

          if (!user) {
            throw new Error('No user found with this email');
          }

          if (!user.password_hash) {
            throw new Error('Please sign in with your social account');
          }

          // Verify password
          const isValid = await verifyPassword(
            credentials.password,
            user.password_hash
          );

          if (!isValid) {
            throw new Error('Invalid password');
          }

          // Return user object (will be passed to JWT callback)
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            tier: user.tier as TierName,
            subscriptionStatus: user.subscription_status,
            subscriptionCurrentPeriodEnd: user.subscription_current_period_end,
          };
        } catch (error) {
          console.error('[NextAuth] Credentials authorization error:', error);
          throw error;
        }
      },
    }),

    // Google OAuth (if configured)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: 'consent',
                access_type: 'offline',
                response_type: 'code',
              },
            },
          }),
        ]
      : []),

    // Microsoft OAuth (if configured)
    ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
      ? [
          {
            id: 'microsoft',
            name: 'Microsoft',
            type: 'oauth',
            wellKnown: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
            authorization: {
              params: {
                scope: 'openid profile email User.Read',
              },
            },
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            profile(profile) {
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
                tier: 'free' as TierName,
              };
            },
          } as Provider,
        ]
      : []),
  ],

  // Callbacks for custom logic
  callbacks: {
    /**
     * JWT callback - runs when JWT is created or updated
     * Store user tier and subscription info in JWT
     */
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.tier = (user as ExtendedUser).tier;
        token.subscriptionStatus = (user as ExtendedUser).subscriptionStatus;
        token.subscriptionCurrentPeriodEnd = (user as ExtendedUser).subscriptionCurrentPeriodEnd;
      }

      // Handle account linking for OAuth
      if (account) {
        token.provider = account.provider;
      }

      // Refresh user data on update trigger
      if (trigger === 'update' && token.id) {
        try {
          const refreshedUser = await getUserById(Number(token.id));
          if (refreshedUser) {
            token.tier = getEffectiveTier(refreshedUser);
            token.subscriptionStatus = refreshedUser.subscription_status;
            token.subscriptionCurrentPeriodEnd = refreshedUser.subscription_current_period_end;
          }
        } catch (error) {
          console.error('[NextAuth] Error refreshing user data:', error);
        }
      }

      return token;
    },

    /**
     * Session callback - runs when session is checked
     * Expose user tier and subscription info to client
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.tier = token.tier as TierName;
        session.user.subscriptionStatus = token.subscriptionStatus as string;
        session.user.subscriptionCurrentPeriodEnd = token.subscriptionCurrentPeriodEnd as Date;
      }

      return session;
    },

    /**
     * Sign in callback - runs on successful sign in
     * Can be used to prevent sign in or perform additional checks
     */
    async signIn({ user, account, profile }) {
      // Allow all sign-ins for credentials provider
      if (account?.provider === 'credentials') {
        return true;
      }

      // For OAuth providers (Microsoft, Google)
      if (account && profile && user.email) {
        try {
          // Debug logging for OAuth data
          console.log('[NextAuth] OAuth sign in data:', {
            provider: account.provider,
            email: user.email,
            userName: user.name,
            profileName: (profile as any).name,
            providerAccountId: account.providerAccountId,
            hasImage: !!(user.image || (profile as any).picture),
          });

          // Check if user already exists
          const existingUser = await getUserByEmail(user.email);

          if (existingUser) {
            // User exists - link OAuth account if not already linked
            await linkOAuthAccount({
              userId: existingUser.id,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expiresAt: account.expires_at,
              tokenType: account.token_type,
              scope: account.scope,
              idToken: account.id_token,
            });
            return true;
          }

          // New OAuth user - redirect to registration page with prefilled data
          const name = user.name || (profile as any).name || '';
          const image = user.image || (profile as any).picture || '';
          const providerId = account.providerAccountId || '';

          console.log('[NextAuth] Redirecting to register with:', {
            provider: account.provider,
            email: user.email,
            name,
            image,
            providerId,
          });

          const registerUrl = `/register?` +
            `oauth=true&` +
            `provider=${encodeURIComponent(account.provider)}&` +
            `email=${encodeURIComponent(user.email)}&` +
            `name=${encodeURIComponent(name)}&` +
            `image=${encodeURIComponent(image)}&` +
            `providerId=${encodeURIComponent(providerId)}`;

          // Redirect to register page
          return registerUrl;
        } catch (error) {
          console.error('[NextAuth] OAuth sign in error:', error);
          return false;
        }
      }

      return true;
    },
  },

  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',

  // Secret for JWT encryption
  secret: process.env.NEXTAUTH_SECRET,
};
