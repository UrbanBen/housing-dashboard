'use client';

/**
 * Registration Page
 *
 * New user account creation with email/password
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Check if this is an OAuth signup
  const isOAuthSignup = searchParams.get('oauth') === 'true';
  const oauthProvider = searchParams.get('provider');
  const oauthEmail = searchParams.get('email') || '';
  const oauthName = searchParams.get('name') || '';
  const oauthImage = searchParams.get('image') || '';
  const oauthProviderId = searchParams.get('providerId') || '';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;

    try {
      if (isOAuthSignup && oauthProvider && oauthProviderId) {
        // OAuth signup - create user without password
        const response = await fetch('/api/auth/oauth-signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            name,
            image: oauthImage,
            provider: oauthProvider,
            providerAccountId: oauthProviderId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.details) {
            setFieldErrors(data.details);
          } else {
            setError(data.error || 'OAuth signup failed');
          }
          setIsLoading(false);
          return;
        }

        // Success - redirect to login to sign in with Microsoft
        router.push(`/login?message=Account created! Please sign in with ${oauthProvider}.`);
        return;
      }

      // Regular email/password signup
      const password = formData.get('password') as string;
      const confirmPassword = formData.get('confirmPassword') as string;

      // Client-side validation
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      // Call registration API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          // Validation errors from Zod
          setFieldErrors(data.details);
        } else {
          setError(data.error || 'Registration failed');
        }
        setIsLoading(false);
        return;
      }

      // Registration successful - auto sign in
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Registration succeeded but sign in failed - redirect to login
        router.push('/login?message=Registration successful. Please sign in.');
        return;
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <Card className="w-full max-w-md border-2 border-[#00FF41] shadow-2xl shadow-[#00FF41]/30 bg-card animate-in fade-in zoom-in duration-300">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Enter your details to get started with your free account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Display errors */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* OAuth signup indicator */}
          {isOAuthSignup && oauthProvider && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                Completing signup with {oauthProvider === 'microsoft' ? 'Microsoft' : 'Google'}
              </AlertDescription>
            </Alert>
          )}

          {/* Free tier info */}
          {!isOAuthSignup && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Free tier includes 6 essential cards to get you started!
              </AlertDescription>
            </Alert>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                disabled={isLoading}
                defaultValue={oauthName}
                autoComplete="name"
              />
              {fieldErrors.name && (
                <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                disabled={isLoading || isOAuthSignup}
                defaultValue={oauthEmail}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="text-sm text-red-600">{fieldErrors.email[0]}</p>
              )}
            </div>

            {!isOAuthSignup && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  {fieldErrors.password && (
                    <p className="text-sm text-red-600">{fieldErrors.password[0]}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters with uppercase, lowercase, and number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>

        <CardFooter>
          <p className="text-sm text-muted-foreground text-center w-full">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primary underline-offset-4 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
