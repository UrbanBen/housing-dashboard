'use client';

/**
 * Pricing Page
 *
 * Displays subscription tiers with features and pricing
 */

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { getTierComparison, formatPrice, type TierName } from '@/lib/tiers';

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const tiers = getTierComparison();
  const currentTier = session?.user?.tier || 'free';

  const handleSubscribe = async (tierName: TierName) => {
    if (!session) {
      router.push('/login?message=Please sign in to upgrade');
      return;
    }

    if (tierName === 'free') {
      router.push('/dashboard');
      return;
    }

    setIsLoading(tierName);

    try {
      // TODO: Implement Stripe checkout session creation
      // For now, just show a message
      console.log('Upgrade to', tierName);
      alert(`Stripe integration coming soon! You selected ${tierName} tier.`);
      setIsLoading(null);
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start checkout. Please try again.');
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-green-950">
      {/* Navigation Bar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push('/dashboard')}
            >
              <img
                src="/mosaic-logo.svg"
                alt="MOSAIC By Mecone Logo"
                className="h-10 w-40"
              />
              <div>
                <h2 className="text-lg font-semibold text-[#00FF41] drop-shadow-[0_0_10px_rgba(0,255,65,0.5)] glow-text">Housing Analytics</h2>
                <p className="text-sm text-muted-foreground">Analytic Insights and Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* User Profile and Tier Display */}
              {session ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{session.user.name || session.user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {currentTier.toUpperCase()} Tier
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/api/auth/signout')}
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/login')}
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-300 max-w-5xl mx-auto">
            Get access to powerful housing insights and analytics with flexible pricing
          </p>
          {session && (
            <Badge variant="outline" className="text-sm bg-[#00FF41]/20 border-[#00FF41] text-white">
              Current Plan: {currentTier.toUpperCase()}
            </Badge>
          )}
        </div>
        <style jsx>{`
          @keyframes glimmer {
            0%, 100% {
              box-shadow: 0 0 20px rgba(0, 255, 65, 0.5), 0 0 40px rgba(0, 255, 65, 0.3);
            }
            50% {
              box-shadow: 0 0 30px rgba(0, 255, 65, 0.8), 0 0 60px rgba(0, 255, 65, 0.5);
            }
          }
          .animate-glimmer {
            animation: glimmer 2s ease-in-out infinite;
          }
        `}</style>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => {
            const isCurrentTier = currentTier === tier.name;
            const isPopular = tier.name === 'plus';
            const isPro = tier.name === 'pro';

            // Badge text for each tier
            const getBadgeText = () => {
              if (isCurrentTier) return 'Current Plan';
              if (isPopular) return 'Most Popular';
              if (isPro) return 'Premium Tier';
              return null;
            };

            const badgeText = getBadgeText();

            return (
              <Card
                key={tier.name}
                className="relative flex flex-col border-2 border-[#00FF41] transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-accent/10"
              >
                {badgeText && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <Badge className="bg-[#00FF41] text-black px-4 py-1 shadow-lg">
                      {badgeText}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-2xl">{tier.displayName}</CardTitle>
                  <CardDescription className="mt-2">
                    {tier.description}
                  </CardDescription>

                  <div className="mt-6">
                    <div className="text-4xl font-bold">
                      {tier.price === 0 ? (
                        'Free'
                      ) : (
                        <>
                          ${(tier.price / 100).toFixed(0)}
                          <span className="text-lg font-normal text-muted-foreground">/month</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 flex-grow flex flex-col">
                  <div className="space-y-2 min-h-[240px]">
                    {tier.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-[#00FF41] flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-muted mt-auto">
                    <p className="text-sm text-muted-foreground">
                      {tier.maxCards
                        ? `${tier.maxCards} cards available`
                        : 'Unlimited cards'}
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="mt-auto">
                  <Button
                    className={`w-full ${
                      isPro && !isCurrentTier
                        ? 'bg-[#00FF41] text-black hover:bg-[#00FF41]/90 animate-glimmer shadow-lg shadow-[#00FF41]/50'
                        : ''
                    }`}
                    variant={isPopular ? 'default' : 'outline'}
                    disabled={isCurrentTier || isLoading === tier.name}
                    onClick={() => handleSubscribe(tier.name)}
                  >
                    {isLoading === tier.name ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentTier ? (
                      'Current Plan'
                    ) : tier.name === 'free' ? (
                      'Get Started'
                    ) : (
                      `Upgrade to ${tier.displayName}`
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-slate-400">
            All plans include access to our core housing data and analytics.
            <br />
            Cancel or change your plan anytime.
          </p>

          {!session && (
            <div className="mt-8">
              <Button variant="link" className="text-[#00FF41] hover:text-[#00FF41]/80" onClick={() => router.push('/login')}>
                Already have an account? Sign in
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
