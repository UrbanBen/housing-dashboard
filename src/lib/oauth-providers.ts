/**
 * OAuth Provider Configuration Utilities
 *
 * Server-side utilities to check which OAuth providers are configured
 */

export interface OAuthProviderConfig {
  google: boolean;
  microsoft: boolean;
}

/**
 * Check which OAuth providers are configured (server-side only)
 * This runs on the server and checks environment variables
 */
export function getConfiguredOAuthProviders(): OAuthProviderConfig {
  return {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoft: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
  };
}
