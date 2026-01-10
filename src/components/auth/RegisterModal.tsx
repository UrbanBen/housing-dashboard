'use client';

/**
 * Register Modal
 *
 * Modal overlay for user registration that appears over the dashboard
 */

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const name = formData.get('name') as string;

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
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
        // Registration succeeded but sign in failed - switch to login
        onSwitchToLogin?.();
        return;
      }

      // Success - reload page to update session
      window.location.reload();
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Register card - centered on top */}
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
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              Enter your details to get started with your free account
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

            {/* Free tier info */}
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Free tier includes 6 essential cards to get you started!
              </AlertDescription>
            </Alert>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal-name">Name</Label>
                <Input
                  id="modal-name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  disabled={isLoading}
                  autoComplete="name"
                />
                {fieldErrors.name && (
                  <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>
                )}
              </div>

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
                {fieldErrors.email && (
                  <p className="text-sm text-red-600">{fieldErrors.email[0]}</p>
                )}
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
                <Label htmlFor="modal-confirmPassword">Confirm Password</Label>
                <Input
                  id="modal-confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

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

          <CardFooter className="bg-transparent">
            <p className="text-sm text-muted-foreground text-center w-full">
              Already have an account?{' '}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchToLogin?.();
                }}
                className="text-primary underline-offset-4 hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
