"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const marketData = [
  { category: 'Inventory', current: 2847, previous: 2630 },
  { category: 'Sales', current: 1248, previous: 1156 },
  { category: 'New Listings', current: 876, previous: 934 },
  { category: 'Price Drops', current: 234, previous: 189 },
];

export function MarketOverview() {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={marketData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--grid))" />
          <XAxis 
            dataKey="category" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '2px solid #22c55e',
              borderRadius: '6px',
              color: 'hsl(var(--card-foreground))'
            }}
            formatter={(value, name) => [
              value.toLocaleString(),
              name === 'current' ? 'Current Month' : 'Previous Month'
            ]}
            cursor={false}
          />
          <Bar
            dataKey="previous"
            fill="hsl(var(--muted))"
            radius={[0, 0, 4, 4]}
            name="previous"
            activeBar={{
              fill: 'hsl(var(--muted))',
              opacity: 0.8,
              stroke: '#4ade80',
              strokeWidth: 3,
              filter: 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.8))'
            }}
          />
          <Bar
            dataKey="current"
            fill="hsl(var(--chart-2))"
            radius={[4, 4, 0, 0]}
            name="current"
            activeBar={{
              fill: 'hsl(var(--chart-2))',
              opacity: 0.8,
              stroke: '#4ade80',
              strokeWidth: 3,
              filter: 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.8))'
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}