'use client';

/**
 * Login Modal
 *
 * Modal overlay for user authentication that appears over the dashboard
 */

import { useState, useEffect } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import type { ClientSafeProvider, LiteralUnion } from 'next-auth/react';
import type { BuiltInProviderType } from 'next-auth/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { RegisterModal } from './RegisterModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [providers, setProviders] = useState<Record<LiteralUnion<BuiltInProviderType, string>, ClientSafeProvider> | null>(null);

  // Fetch available OAuth providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      const availableProviders = await getProviders();
      setProviders(availableProviders);
    };
    fetchProviders();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Success - modal will close automatically when session updates
      window.location.reload();
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft') => {
    setIsLoading(true);
    setError(null);

    try {
      await signIn(provider, {
        callbackUrl: '/dashboard',
      });
    } catch (err) {
      setError(`Failed to sign in with ${provider}`);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Background - slightly dimmed dashboard */}
      <div className="absolute inset-0 bg-black/50 z-10"></div>

      {/* Login card - centered on top */}
      <div className="relative z-30 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-[#00FF41] shadow-2xl shadow-[#00FF41]/30 bg-black" style={{ backgroundColor: 'rgb(0, 0, 0)' }}>
          {/* Logo and Title */}
          <div className="flex flex-col items-center gap-3 pt-8 pb-4">
            <img
              src="/mosaic-logo.svg"
              alt="MOSAIC By Mecone Logo"
              className="h-12 w-48"
            />
            <div className="text-center">
              <h2 className="text-xl font-semibold text-[#00FF41] drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]">Housing Analytics</h2>
              <p className="text-sm text-muted-foreground">Analytic Insights and Intelligence</p>
            </div>
          </div>

          <CardHeader className="space-y-1 bg-transparent pt-4">
            <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
            <CardDescription>
              Enter your email and password to access your dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 bg-transparent">
            {/* Display errors */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal-email">Email</Label>
                <Input
                  id="modal-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-password">Password</Label>
                <Input
                  id="modal-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            {/* OAuth Sign In Buttons - Only show if configured */}
            {providers?.microsoft && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoading}
                onClick={() => handleOAuthSignIn('microsoft')}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                Sign in with Microsoft
              </Button>
            )}

            {providers?.google && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoading}
                onClick={() => handleOAuthSignIn('google')}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </Button>
            )}
          </CardContent>

          <CardFooter className="bg-transparent">
            <p className="text-sm text-muted-foreground text-center w-full">
              Don't have an account?{' '}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowRegisterModal(true);
                }}
                className="text-primary underline-offset-4 hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Register Modal */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => setShowRegisterModal(false)}
      />
    </div>
  );
}
