"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Settings } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DevelopmentApplicationsCardProps {
  selectedLGA?: { name: string; id: string } | null;
  isAdminMode?: boolean;
  onAdminClick?: () => void;
}

interface DADataPoint {
  month: string;
  totalDetermined: number;
  approved: number;
  refused: number;
  withdrawn: number;
}

interface DASummary {
  periodMonths: number;
  totalDetermined: number;
  totalApproved: number;
  totalRefused: number;
  totalWithdrawn: number;
  approvalRate: string;
  averagePerMonth: number;
}

// Color palette (shades of green to match theme)
const COLORS = {
  totalDetermined: '#047857', // Dark green
  approved: '#10b981',        // Medium green
  refused: '#ef4444',         // Red
  withdrawn: '#94a3b8'        // Gray
};

export function DevelopmentApplicationsCard({ selectedLGA, isAdminMode = false, onAdminClick }: DevelopmentApplicationsCardProps) {
  const [data, setData] = useState<DADataPoint[] | null>(null);
  const [summary, setSummary] = useState<DASummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedLGA) {
      setData(null);
      setSummary(null);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/development-applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lgaName: selectedLGA.name,
            monthsBack: 12 // Last 12 months
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch development applications data');
        }

        if (result.data && Array.isArray(result.data)) {
          // Reverse to show oldest to newest (left to right)
          const reversedData = result.data.reverse();

          // Format month for display (e.g., "2024-01" -> "Jan 24")
          const formattedData = reversedData.map((item: DADataPoint) => ({
            ...item,
            monthDisplay: formatMonthLabel(item.month)
          }));

          setData(formattedData);
          setSummary(result.summary);
        } else {
          setError('No data available for this LGA');
        }
      } catch (err) {
        console.error('Error fetching development applications data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA]);

  // Format month label for display
  const formatMonthLabel = (monthStr: string): string => {
    const date = new Date(monthStr + '-01');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${month} ${year}`;
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50 hover:ring-2 hover:ring-primary/50 hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">
              Development Applications{selectedLGA ? ` - ${selectedLGA.name}` : ''}
            </CardTitle>
          </div>
          {isAdminMode && onAdminClick && (
            <button
              onClick={onAdminClick}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Configure Development Applications"
            >
              <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!selectedLGA && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select an LGA to view development applications data
            </p>
          </div>
        )}

        {selectedLGA && isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {selectedLGA && error && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <p className="text-xs text-muted-foreground">
              Data is updated weekly. If this LGA is new, data may not be available yet.
            </p>
          </div>
        )}

        {selectedLGA && data && data.length > 0 && summary && !isLoading && !error && (
          <div className="space-y-6">
            {/* Line Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Monthly DA Determinations (Last 12 Months)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={data}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="monthDisplay"
                    stroke="hsl(var(--foreground))"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="hsl(var(--foreground))"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '2px solid #10b981',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="totalDetermined"
                    stroke={COLORS.totalDetermined}
                    strokeWidth={3}
                    name="Total Determined"
                    dot={{ fill: COLORS.totalDetermined, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="approved"
                    stroke={COLORS.approved}
                    strokeWidth={2}
                    name="Approved"
                    dot={{ fill: COLORS.approved, r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="refused"
                    stroke={COLORS.refused}
                    strokeWidth={2}
                    name="Refused"
                    dot={{ fill: COLORS.refused, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-4 gap-4 pt-3 border-t border-border/50">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Total Determined</div>
                <div className="text-lg font-bold">{summary.totalDetermined.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  ~{summary.averagePerMonth}/month
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Approved</div>
                <div className="text-lg font-bold text-[#10b981]">{summary.totalApproved.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  {summary.approvalRate}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Refused</div>
                <div className="text-lg font-bold text-[#ef4444]">{summary.totalRefused.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  {summary.totalDetermined > 0
                    ? ((summary.totalRefused / summary.totalDetermined) * 100).toFixed(1)
                    : '0.0'}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Withdrawn</div>
                <div className="text-lg font-bold text-[#94a3b8]">{summary.totalWithdrawn.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  {summary.totalDetermined > 0
                    ? ((summary.totalWithdrawn / summary.totalDetermined) * 100).toFixed(1)
                    : '0.0'}%
                </div>
              </div>
            </div>

            {/* Data freshness notice */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
              Data updated weekly from DPHI ePlanning Portal
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
