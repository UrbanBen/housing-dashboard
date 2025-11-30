"use client";

import React, { useState } from 'react';
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
  Layout,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw
} from "lucide-react";
import type { DashboardCard } from './DraggableDashboard';

interface AdminToolbarProps {
  isVisible: boolean;
  onResetLayout?: () => void;
}

interface CardTemplate {
  id: string;
  title: string;
  category: 'search' | 'map' | 'charts' | 'kpi' | 'data' | 'blank';
  icon: React.ComponentType<any>;
  description: string;
  defaultConfig?: Partial<DashboardCard>;
}

// Available card templates and elements
const cardTemplates: CardTemplate[] = [
  // Blank Card
  {
    id: 'blank-card',
    title: 'Blank Card',
    category: 'blank',
    icon: Plus,
    description: 'Empty card to configure from scratch'
  },

  // Search Cards
  {
    id: 'geography-search',
    title: 'Search Card',
    category: 'search',
    icon: Search,
    description: 'LGA/location search and selection'
  },
  {
    id: 'advanced-search',
    title: 'Advanced Search',
    category: 'search',
    icon: Sparkles,
    description: 'Multi-criteria search with filters'
  },

  // Map Cards
  {
    id: 'interactive-map',
    title: 'Map Card',
    category: 'map',
    icon: Map,
    description: 'Interactive map with boundaries'
  },
  {
    id: 'location-details',
    title: 'Location Details',
    category: 'map',
    icon: MapPin,
    description: 'Detailed area information'
  },
  {
    id: 'heat-map',
    title: 'Heat Map',
    category: 'map',
    icon: Activity,
    description: 'Data density visualization'
  },

  // Chart Cards
  {
    id: 'bar-chart',
    title: 'Bar Chart',
    category: 'charts',
    icon: BarChart3,
    description: 'Vertical or horizontal bars'
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
    description: 'Proportional breakdown'
  },
  {
    id: 'trend-chart',
    title: 'Trend Analysis',
    category: 'charts',
    icon: TrendingUp,
    description: 'Advanced trends with forecasting'
  },
  {
    id: 'time-series',
    title: 'Time Series',
    category: 'charts',
    icon: Calendar,
    description: 'Historical data over periods'
  },
  {
    id: 'scatter-plot',
    title: 'Scatter Plot',
    category: 'charts',
    icon: Activity,
    description: 'Correlation visualization'
  },
  {
    id: 'lga-dwelling-approvals',
    title: 'Building Approvals by LGA',
    category: 'charts',
    icon: LineChart,
    description: 'LGA-specific dwelling approvals trend'
  },
  {
    id: 'age-by-sex',
    title: 'Age by Sex',
    category: 'charts',
    icon: PieChart,
    description: 'Population breakdown by gender'
  },

  // KPI & Metrics
  {
    id: 'key-metrics',
    title: 'Key Metrics',
    category: 'kpi',
    icon: Activity,
    description: 'Important indicators'
  },
  {
    id: 'housing-affordability',
    title: 'Affordability',
    category: 'kpi',
    icon: Home,
    description: 'Affordability ratios'
  },
  {
    id: 'property-values',
    title: 'Property Values',
    category: 'kpi',
    icon: DollarSign,
    description: 'Median prices'
  },
  {
    id: 'population-metrics',
    title: 'Population',
    category: 'kpi',
    icon: Users,
    description: 'Demographics'
  },
  {
    id: 'development-stats',
    title: 'Development',
    category: 'kpi',
    icon: Building,
    description: 'Construction data'
  },
  {
    id: 'percentage-display',
    title: 'Percentage',
    category: 'kpi',
    icon: Percent,
    description: 'Large % displays'
  },
  {
    id: 'counter-display',
    title: 'Counter',
    category: 'kpi',
    icon: Hash,
    description: 'Large numbers'
  },
  {
    id: 'progress-tracker',
    title: 'Progress',
    category: 'kpi',
    icon: Clock,
    description: 'Goal tracking'
  },

  // Data Tables
  {
    id: 'data-table',
    title: 'Data Table',
    category: 'data',
    icon: Grid3X3,
    description: 'Sortable table'
  },
  {
    id: 'comparison-table',
    title: 'Comparison',
    category: 'data',
    icon: Layout,
    description: 'Side-by-side compare'
  },
  {
    id: 'insights-panel',
    title: 'Insights',
    category: 'data',
    icon: FileText,
    description: 'AI insights'
  },

  // Database Test
  {
    id: 'test-card',
    title: 'DB Test',
    category: 'data',
    icon: Database,
    description: 'Connection test'
  }
];

// Category styling with green highlights
const categoryStyles = {
  'blank': {
    bg: 'bg-zinc-900',
    border: 'border-[#00FF41]/30',
    text: 'text-[#00FF41]',
    hover: 'hover:border-[#00FF41] hover:shadow-[0_0_10px_rgba(0,255,65,0.3)]'
  },
  'search': {
    bg: 'bg-zinc-900',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    hover: 'hover:border-emerald-500 hover:shadow-[0_0_10px_rgba(16,185,129,0.3)]'
  },
  'map': {
    bg: 'bg-zinc-900',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    hover: 'hover:border-cyan-500 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]'
  },
  'charts': {
    bg: 'bg-zinc-900',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    hover: 'hover:border-violet-500 hover:shadow-[0_0_10px_rgba(139,92,246,0.3)]'
  },
  'kpi': {
    bg: 'bg-zinc-900',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    hover: 'hover:border-amber-500 hover:shadow-[0_0_10px_rgba(245,158,11,0.3)]'
  },
  'data': {
    bg: 'bg-zinc-900',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    hover: 'hover:border-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]'
  }
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

  // Special bright green styling for LGA Dwelling Approvals
  const isLGADwellingApprovals = template.id === 'lga-dwelling-approvals';
  const isAgeBySex = template.id === 'age-by-sex';

  const styles = isLGADwellingApprovals ? {
    bg: 'bg-zinc-900',
    border: 'border-[#00FF41]/50',
    text: 'text-[#00FF41]',
    hover: 'hover:border-[#00FF41] hover:shadow-[0_0_15px_rgba(0,255,65,0.5)]'
  } : isAgeBySex ? {
    bg: 'bg-zinc-900',
    border: 'border-[#f8ba33]/50',
    text: 'text-[#f8ba33]',
    hover: 'hover:border-[#f8ba33] hover:shadow-[0_0_15px_rgba(248,186,51,0.5)]'
  } : categoryStyles[template.category];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 cursor-grab
        transition-all duration-300
        ${styles.bg} ${styles.border} ${styles.text} ${styles.hover}
        ${isDragging ? 'opacity-50 cursor-grabbing scale-95' : 'hover:scale-105'}
      `}
      title={template.description}
    >
      <IconComponent className="h-8 w-8" />
      <span className="text-xs font-semibold text-center leading-tight">
        {template.title}
      </span>
    </div>
  );
}

export function AdminToolbar({ isVisible, onResetLayout }: AdminToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { id: 'blank', label: 'Blank', icon: Plus },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'map', label: 'Maps', icon: Map },
    { id: 'charts', label: 'Charts', icon: BarChart3 },
    { id: 'kpi', label: 'KPIs', icon: Activity },
    { id: 'data', label: 'Data', icon: Database }
  ];

  const filteredTemplates = selectedCategory
    ? cardTemplates.filter(t => t.category === selectedCategory)
    : cardTemplates;

  return (
    <div
      className={`
        h-full z-50
        transition-all duration-500 ease-in-out
        ${isVisible ? (isExpanded ? 'w-80' : 'w-16') : 'w-0'}
      `}
    >
      {/* Sidebar */}
      <div
        className={`
          h-full bg-black/95 backdrop-blur-xl border-r border-[#00FF41]/20
          shadow-[0_0_30px_rgba(0,255,65,0.1)]
          transition-all duration-500 ease-in-out
          flex flex-col
          overflow-hidden
          ${isVisible ? (isExpanded ? 'w-80' : 'w-16') : 'w-0'}
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-[#00FF41]/20 flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-[#00FF41]" />
              <h3 className="font-bold text-[#00FF41] text-lg drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]">
                Card Library
              </h3>
            </div>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg bg-zinc-900 border border-[#00FF41]/30 hover:border-[#00FF41] hover:shadow-[0_0_10px_rgba(0,255,65,0.3)] transition-all"
          >
            {isExpanded ? (
              <ChevronLeft className="h-4 w-4 text-[#00FF41]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#00FF41]" />
            )}
          </button>
        </div>

        {isExpanded && (
          <>
            {/* Category Filter */}
            <div className="flex-shrink-0 p-4 border-b border-[#00FF41]/20">
              <div className="text-xs font-semibold text-[#00FF41] mb-2">CATEGORIES</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`
                    px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${!selectedCategory
                      ? 'bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]'
                      : 'bg-zinc-900 text-gray-400 border border-zinc-700 hover:border-[#00FF41]/50'
                    }
                  `}
                >
                  All ({cardTemplates.length})
                </button>
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const count = cardTemplates.filter(t => t.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`
                        px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1
                        ${selectedCategory === cat.id
                          ? 'bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]'
                          : 'bg-zinc-900 text-gray-400 border border-zinc-700 hover:border-[#00FF41]/50'
                        }
                      `}
                    >
                      <Icon className="h-3 w-3" />
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card Templates Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
              <div className="text-xs font-semibold text-[#00FF41] mb-3">
                {selectedCategory
                  ? `${categories.find(c => c.id === selectedCategory)?.label.toUpperCase()} CARDS`
                  : 'ALL CARDS'}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {filteredTemplates.map(template => (
                  <DraggableTemplate key={template.id} template={template} />
                ))}
              </div>
            </div>

            {/* Reset Layout Button */}
            <div className="flex-shrink-0 p-4 border-t border-[#00FF41]/20">
              <button
                onClick={onResetLayout}
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-red-500/30 text-red-400 hover:border-red-500 hover:bg-red-500/10 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Layout
              </button>
            </div>

            {/* Footer Tip */}
            <div className="flex-shrink-0 p-4 bg-zinc-950">
              <div className="text-xs text-gray-400 text-center">
                💡 <span className="text-[#00FF41]">Drag</span> cards to dashboard • <span className="text-[#00FF41]">Double-click</span> to configure
              </div>
            </div>
          </>
        )}

        {/* Collapsed State Icons */}
        {!isExpanded && (
          <div className="p-2 space-y-2">
            {categories.slice(0, 6).map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setIsExpanded(true);
                    setSelectedCategory(cat.id);
                  }}
                  className="w-full p-2 rounded-lg bg-zinc-900 border border-[#00FF41]/30 hover:border-[#00FF41] hover:shadow-[0_0_10px_rgba(0,255,65,0.3)] transition-all"
                  title={cat.label}
                >
                  <Icon className="h-5 w-5 text-[#00FF41] mx-auto" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
