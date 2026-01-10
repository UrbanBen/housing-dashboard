'use client';

/**
 * Locked Card Component
 *
 * Displays when user doesn't have access to a card based on their subscription tier
 * Shows upgrade prompt and required tier information
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getRequiredTierForCard, CARD_NAMES, getTier } from '@/lib/tiers';
import type { TierName } from '@/lib/tiers';

interface LockedCardProps {
  cardType: string;
  userTier: TierName;
  className?: string;
}

export function LockedCard({ cardType, userTier, className }: LockedCardProps) {
  const router = useRouter();
  const requiredTier = getRequiredTierForCard(cardType);
  const tierConfig = requiredTier ? getTier(requiredTier) : null;
  const cardName = CARD_NAMES[cardType] || cardType;

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  return (
    <Card
      className={`relative overflow-hidden opacity-60 hover:opacity-80 transition-opacity ${className}`}
    >
      {/* Locked overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="text-center space-y-4 px-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/20 p-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">
              {cardName} Card Locked
            </h3>

            {tierConfig && (
              <>
                <p className="text-sm text-slate-300">
                  Upgrade to <Badge variant="secondary" className="ml-1">{tierConfig.displayName}</Badge> to unlock
                </p>

                <p className="text-xs text-slate-400">
                  ${(tierConfig.price / 100).toFixed(2)}/month
                </p>
              </>
            )}
          </div>

          <Button
            onClick={handleUpgrade}
            variant="default"
            size="sm"
            className="group"
          >
            Upgrade Now
            <ArrowUpRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Dimmed card content in background */}
      <CardHeader className="opacity-30">
        <CardTitle>{cardName}</CardTitle>
        <CardDescription>Requires {tierConfig?.displayName || 'higher'} tier</CardDescription>
      </CardHeader>
      <CardContent className="opacity-20">
        <div className="h-48 flex items-center justify-center">
          <div className="text-6xl text-slate-500">📊</div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Small locked card variant for grid layouts
 */
export function LockedCardCompact({ cardType, userTier, className }: LockedCardProps) {
  const router = useRouter();
  const requiredTier = getRequiredTierForCard(cardType);
  const tierConfig = requiredTier ? getTier(requiredTier) : null;
  const cardName = CARD_NAMES[cardType] || cardType;

  return (
    <Card
      className={`relative overflow-hidden opacity-50 hover:opacity-70 transition-opacity cursor-pointer ${className}`}
      onClick={() => router.push('/pricing')}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
        <div className="text-center space-y-2 px-4">
          <Lock className="h-6 w-6 text-primary mx-auto" />
          <p className="text-xs font-medium text-white">
            {tierConfig?.displayName || 'Premium'}
          </p>
        </div>
      </div>

      <CardHeader className="opacity-20 p-4">
        <CardTitle className="text-sm">{cardName}</CardTitle>
      </CardHeader>
      <CardContent className="opacity-10 p-4">
        <div className="h-20 flex items-center justify-center">
          <Lock className="h-8 w-8 text-slate-500" />
        </div>
      </CardContent>
    </Card>
  );
}
