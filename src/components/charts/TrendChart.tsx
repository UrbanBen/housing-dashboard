"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { month: 'Jan', price: 465000, forecast: null },
  { month: 'Feb', price: 470000, forecast: null },
  { month: 'Mar', price: 468000, forecast: null },
  { month: 'Apr', price: 475000, forecast: null },
  { month: 'May', price: 478000, forecast: null },
  { month: 'Jun', price: 482000, forecast: null },
  { month: 'Jul', price: 485000, forecast: null },
  { month: 'Aug', price: 483000, forecast: null },
  { month: 'Sep', price: 487000, forecast: null },
  { month: 'Oct', price: 485200, forecast: null },
  { month: 'Nov', price: null, forecast: 488000 },
  { month: 'Dec', price: null, forecast: 492000 },
];

export function TrendChart() {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--grid))" />
          <XAxis 
            dataKey="month" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              color: 'hsl(var(--card-foreground))'
            }}
            formatter={(value, name) => [
              `$${value?.toLocaleString()}`,
              name === 'price' ? 'Actual Price' : 'Forecasted Price'
            ]}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            connectNulls={false}
          />
          <Line 
            type="monotone" 
            dataKey="forecast" 
            stroke="hsl(var(--highlight))" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: 'hsl(var(--highlight))', strokeWidth: 2, r: 3 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}