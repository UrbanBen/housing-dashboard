"use client";

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Plus,
  Map,
  BarChart3,
  PieChart,
  LineChart,
  Search,
  Database,
  MapPin,
  TrendingUp,
  Activity,
  Calendar,
  Users,
  Home,
  Building,
  DollarSign,
  Percent,
  Hash,
  Clock,
  FileText,
  Grid3X3,
  Layout
} from "lucide-react";
import type { DashboardCard } from './DraggableDashboard';

interface AdminToolbarProps {
  isVisible: boolean;
}

interface CardTemplate {
  id: string;
  title: string;
  category: 'lga' | 'metrics' | 'charts' | 'kpi';
  icon: React.ComponentType<any>;
  description: string;
  defaultConfig?: Partial<DashboardCard>;
}

// Available card templates and elements
const cardTemplates: CardTemplate[] = [
  // Blank Cards
  {
    id: 'blank-card',
    title: 'Blank Card',
    category: 'lga',
    icon: Plus,
    description: 'Empty card to configure from scratch'
  },

  // Geography & Search
  {
    id: 'geography-search',
    title: 'Geography Search',
    category: 'lga',
    icon: Search,
    description: 'LGA/location search and selection'
  },
  {
    id: 'interactive-map',
    title: 'Interactive Map',
    category: 'lga',
    icon: Map,
    description: 'Zoomable map with LGA boundaries'
  },
  {
    id: 'location-details',
    title: 'Location Details',
    category: 'lga',
    icon: MapPin,
    description: 'Detailed information panel for selected area'
  },

  // Charts & Visualizations
  {
    id: 'bar-chart',
    title: 'Bar Chart',
    category: 'charts',
    icon: BarChart3,
    description: 'Vertical or horizontal bar comparisons'
  },
  {
    id: 'line-chart',
    title: 'Line Chart',
    category: 'charts',
    icon: LineChart,
    description: 'Trend analysis over time'
  },
  {
    id: 'pie-chart',
    title: 'Pie Chart',
    category: 'charts',
    icon: PieChart,
    description: 'Proportional breakdown visualization'
  },
  {
    id: 'trend-chart',
    title: 'Trend Analysis',
    category: 'charts',
    icon: TrendingUp,
    description: 'Advanced trend visualization with forecasting'
  },

  // Metrics & KPIs
  {
    id: 'key-metrics',
    title: 'Key Metrics',
    category: 'kpi',
    icon: Activity,
    description: 'Important numerical indicators'
  },
  {
    id: 'housing-affordability',
    title: 'Housing Affordability',
    category: 'metrics',
    icon: Home,
    description: 'Affordability ratios and indices'
  },
  {
    id: 'property-values',
    title: 'Property Values',
    category: 'metrics',
    icon: DollarSign,
    description: 'Median prices and valuations'
  },
  {
    id: 'population-metrics',
    title: 'Population Data',
    category: 'metrics',
    icon: Users,
    description: 'Demographics and population statistics'
  },
  {
    id: 'development-stats',
    title: 'Development Stats',
    category: 'metrics',
    icon: Building,
    description: 'Housing targets and construction data'
  },

  // Data Tables & Lists
  {
    id: 'data-table',
    title: 'Data Table',
    category: 'lga',
    icon: Grid3X3,
    description: 'Tabular data display with sorting/filtering'
  },
  {
    id: 'comparison-table',
    title: 'Comparison Table',
    category: 'metrics',
    icon: Layout,
    description: 'Side-by-side area comparisons'
  },

  // Time-based
  {
    id: 'time-series',
    title: 'Time Series',
    category: 'charts',
    icon: Calendar,
    description: 'Historical data over time periods'
  },
  {
    id: 'progress-tracker',
    title: 'Progress Tracker',
    category: 'kpi',
    icon: Clock,
    description: 'Goal tracking with progress indicators'
  },

  // Reports & Insights
  {
    id: 'insights-panel',
    title: 'Insights Panel',
    category: 'lga',
    icon: FileText,
    description: 'AI-generated insights and summaries'
  },
  {
    id: 'percentage-display',
    title: 'Percentage Display',
    category: 'kpi',
    icon: Percent,
    description: 'Large percentage/ratio displays'
  },
  {
    id: 'counter-display',
    title: 'Counter Display',
    category: 'kpi',
    icon: Hash,
    description: 'Large numerical counters'
  },

  // Database Test
  {
    id: 'test-card',
    title: 'Test',
    category: 'lga',
    icon: Database,
    description: 'Database connection test card'
  }
];

// Category colors for visual organization
const categoryColors = {
  'lga': 'bg-blue-500/10 border-blue-500/20 text-blue-700',
  'metrics': 'bg-green-500/10 border-green-500/20 text-green-700',
  'charts': 'bg-purple-500/10 border-purple-500/20 text-purple-700',
  'kpi': 'bg-orange-500/10 border-orange-500/20 text-orange-700'
};

// Draggable card template component
function DraggableTemplate({ template }: { template: CardTemplate }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `template-${template.id}`,
    data: {
      type: 'template',
      template: template
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const IconComponent = template.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex flex-col items-center gap-1 p-3 rounded-lg border-2 cursor-grab
        hover:shadow-md transition-all duration-200 min-w-[100px] max-w-[120px]
        flex-shrink-0
        ${categoryColors[template.category]}
        ${isDragging ? 'opacity-50 cursor-grabbing' : 'hover:scale-105'}
      `}
      title={template.description}
    >
      <IconComponent className="h-6 w-6" />
      <span className="text-xs font-medium text-center leading-tight">
        {template.title}
      </span>
    </div>
  );
}

export function AdminToolbar({ isVisible }: AdminToolbarProps) {
  if (!isVisible) return null;

  return (
    <div className="bg-muted/50 border-b border-border shadow-sm">
      <div className="max-w-full px-4 py-3">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Admin Toolbar</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Drag elements below to add to your dashboard
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            Total: {cardTemplates.length} available elements
          </span>
        </div>

        {/* Single horizontal scrollable row */}
        <div className="relative">
          <div
            className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0,0,0,0.2) transparent'
            }}
          >
            {cardTemplates.map(template => (
              <DraggableTemplate key={template.id} template={template} />
            ))}
          </div>

          {/* Scroll indicators */}
          <div className="absolute left-0 top-0 bottom-3 w-8 bg-gradient-to-r from-muted/50 to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-muted/50 to-transparent pointer-events-none" />
        </div>

        <div className="mt-2 pt-3 border-t border-border">
          <div className="text-center">
            <span className="text-xs text-muted-foreground">💡 Tip: Click any card element after dropping to configure database connections and queries</span>
          </div>
        </div>
      </div>
    </div>
  );
}