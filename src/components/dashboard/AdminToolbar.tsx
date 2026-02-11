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
  RotateCcw,
  Globe,
  GitCompare,
  History,
  MessageSquare
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
    id: 'search-geography-card',
    title: 'Search Geography',
    category: 'search',
    icon: Search,
    description: 'LGA/location search and selection'
  },
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
  {
    id: 'dwelling-type',
    title: 'Dwelling Type',
    category: 'charts',
    icon: Percent,
    description: 'Dwelling composition by type'
  },
  {
    id: 'country-of-birth',
    title: 'Country of Birth',
    category: 'charts',
    icon: Globe,
    description: 'Population by country of birth'
  },
  {
    id: 'australian-born',
    title: 'Australian Born',
    category: 'charts',
    icon: MapPin,
    description: 'Australian-born vs overseas-born population'
  },
  {
    id: 'citizenship',
    title: 'Australian Citizenship',
    category: 'charts',
    icon: Users,
    description: 'Citizenship breakdown 2011-2021'
  },
  {
    id: 'citizenship-trend',
    title: 'Australian Citizenship Trend',
    category: 'charts',
    icon: TrendingUp,
    description: 'Citizenship trends over time'
  },
  {
    id: 'income',
    title: 'Rental Affordability - Census 2021',
    category: 'kpi',
    icon: DollarSign,
    description: 'Average household/personal income and weekly rent with rankings'
  },
  {
    id: 'da-daily',
    title: 'DA Daily Activity',
    category: 'charts',
    icon: Calendar,
    description: 'Last 30 days of DA determinations'
  },
  {
    id: 'da-weekly',
    title: 'DA Weekly Trends',
    category: 'charts',
    icon: BarChart3,
    description: 'Last 12 weeks DA trends'
  },
  {
    id: 'da-monthly',
    title: 'DA Monthly Summary',
    category: 'charts',
    icon: TrendingUp,
    description: 'Last 12 months DA summary'
  },
  {
    id: 'da-13-month',
    title: 'DA 13-Month Overview',
    category: 'charts',
    icon: Activity,
    description: '13-month DA trend analysis'
  },
  {
    id: 'da-yoy',
    title: 'DA Year-over-Year',
    category: 'charts',
    icon: GitCompare,
    description: 'Last 12 vs previous 12 months'
  },
  {
    id: 'da-history',
    title: 'DA Complete History',
    category: 'charts',
    icon: History,
    description: 'All available DA data'
  },
  {
    id: 'oc-daily',
    title: 'OC Daily Activity',
    category: 'charts',
    icon: Calendar,
    description: 'Last 30 days of OC determinations'
  },
  {
    id: 'oc-weekly',
    title: 'OC Weekly Trends',
    category: 'charts',
    icon: BarChart3,
    description: 'Last 12 weeks OC trends'
  },
  {
    id: 'oc-monthly',
    title: 'OC Monthly Summary',
    category: 'charts',
    icon: TrendingUp,
    description: 'Last 12 months OC summary'
  },
  {
    id: 'oc-13-month',
    title: 'OC 13-Month Overview',
    category: 'charts',
    icon: Activity,
    description: '13-month OC trend analysis'
  },
  {
    id: 'oc-yoy',
    title: 'OC Year-over-Year',
    category: 'charts',
    icon: GitCompare,
    description: 'Last 12 vs previous 12 months'
  },
  {
    id: 'oc-history',
    title: 'OC Complete History',
    category: 'charts',
    icon: History,
    description: 'All available OC data'
  },
  {
    id: 'ba-daily',
    title: 'BA Daily Activity',
    category: 'charts',
    icon: Calendar,
    description: 'Last 30 days of BA determinations'
  },
  {
    id: 'ba-weekly',
    title: 'BA Weekly Trends',
    category: 'charts',
    icon: BarChart3,
    description: 'Last 12 weeks BA trends'
  },
  {
    id: 'ba-monthly',
    title: 'BA Monthly Summary',
    category: 'charts',
    icon: TrendingUp,
    description: 'Last 12 months BA summary'
  },
  {
    id: 'ba-13-month',
    title: 'BA 13-Month Overview',
    category: 'charts',
    icon: Activity,
    description: '13-month BA trend analysis'
  },
  {
    id: 'ba-yoy',
    title: 'BA Year-over-Year',
    category: 'charts',
    icon: GitCompare,
    description: 'Last 12 vs previous 12 months'
  },
  {
    id: 'ba-history',
    title: 'BA Complete History',
    category: 'charts',
    icon: History,
    description: 'All available BA data'
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

  // Data Tables
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
  },
  {
    id: 'feedback',
    title: 'User Feedback',
    category: 'data',
    icon: MessageSquare,
    description: 'Collect user feedback and suggestions'
  },

  // Core LGA Cards (previously not in library)
  {
    id: 'lga-lookup',
    title: 'LGA Lookup',
    category: 'search',
    icon: Search,
    description: 'Core LGA search and selection'
  },
  {
    id: 'lga-details',
    title: 'LGA Details',
    category: 'data',
    icon: MapPin,
    description: 'Detailed LGA information panel'
  },
  {
    id: 'lga-insights',
    title: 'LGA Map Insights',
    category: 'map',
    icon: Map,
    description: 'LGA boundary visualization with insights'
  },
  {
    id: 'lga-metrics',
    title: 'LGA Metrics',
    category: 'kpi',
    icon: Activity,
    description: 'Key LGA statistics display'
  },

  // Housing & Development Cards (previously not in library)
  {
    id: 'housing-pipeline',
    title: 'Housing Pipeline',
    category: 'charts',
    icon: Building,
    description: 'Housing development pipeline overview'
  },
  {
    id: 'building-approvals-chart',
    title: 'Building Approvals Chart',
    category: 'charts',
    icon: TrendingUp,
    description: 'Building approvals trend visualization'
  },
  {
    id: 'market-overview',
    title: 'Market Overview',
    category: 'charts',
    icon: BarChart3,
    description: 'Market summary and analysis'
  },
  {
    id: 'market-forecast',
    title: 'Market Forecast',
    category: 'charts',
    icon: TrendingUp,
    description: 'Future market predictions'
  },
  {
    id: 'regional-comparison',
    title: 'Regional Comparison',
    category: 'charts',
    icon: GitCompare,
    description: 'Compare multiple regions side-by-side'
  },

  // System & Utility Cards (previously not in library)
  {
    id: 'data-freshness',
    title: 'Data Freshness',
    category: 'kpi',
    icon: Clock,
    description: 'Data update status indicator'
  },
  {
    id: 'kpi-cards',
    title: 'KPI Cards',
    category: 'kpi',
    icon: Activity,
    description: 'Multiple KPI dashboard display'
  },

  // ABS-Specific Cards (previously not in library)
  {
    id: 'abs-geography-search',
    title: 'ABS Geography Search',
    category: 'search',
    icon: Search,
    description: 'ABS statistical geography search'
  },
  {
    id: 'abs-lga-map',
    title: 'ABS LGA Map',
    category: 'map',
    icon: Map,
    description: 'ABS boundary visualization'
  }
];

// Category styling with orange highlights for Edit Mode
const categoryStyles = {
  'blank': {
    bg: 'bg-zinc-900',
    border: 'border-orange-500/30',
    text: 'text-orange-500',
    hover: 'hover:border-orange-500 hover:shadow-[0_0_10px_rgba(249,115,22,0.3)]'
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
  const isDwellingType = template.id === 'dwelling-type';
  const isSearchGeography = template.id === 'search-geography-card';
  const isCountryOfBirth = template.id === 'country-of-birth';
  const isAustralianBorn = template.id === 'australian-born';
  const isCitizenship = template.id === 'citizenship';
  const isCitizenshipTrend = template.id === 'citizenship-trend';
  const isIncome = template.id === 'income';

  // OC cards - all styled in red (#ef4444)
  const isOCDaily = template.id === 'oc-daily';
  const isOCWeekly = template.id === 'oc-weekly';
  const isOCMonthly = template.id === 'oc-monthly';
  const isOC13Month = template.id === 'oc-13-month';
  const isOCYoY = template.id === 'oc-yoy';
  const isOCHistory = template.id === 'oc-history';

  // BA cards - all styled in blue (#6366f1)
  const isBADaily = template.id === 'ba-daily';
  const isBAWeekly = template.id === 'ba-weekly';
  const isBAMonthly = template.id === 'ba-monthly';
  const isBA13Month = template.id === 'ba-13-month';
  const isBAYoY = template.id === 'ba-yoy';
  const isBAHistory = template.id === 'ba-history';

  // Census data cards - all styled in yellow (#eab308)
  const isCensusCard = isAgeBySex || isDwellingType || isCountryOfBirth ||
                       isAustralianBorn || isCitizenship || isCitizenshipTrend || isIncome;

  // OC cards grouped
  const isOCCard = isOCDaily || isOCWeekly || isOCMonthly || isOC13Month || isOCYoY || isOCHistory;

  // BA cards grouped
  const isBACard = isBADaily || isBAWeekly || isBAMonthly || isBA13Month || isBAYoY || isBAHistory;

  const styles = isSearchGeography ? {
    bg: 'bg-zinc-900',
    border: 'border-[#22c55e]/50',
    text: 'text-[#22c55e]',
    hover: 'hover:border-[#22c55e] hover:shadow-[0_0_15px_rgba(34,197,94,0.5)]'
  } : isLGADwellingApprovals ? {
    bg: 'bg-zinc-900',
    border: 'border-orange-500/50',
    text: 'text-orange-500',
    hover: 'hover:border-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.5)]'
  } : isCensusCard ? {
    bg: 'bg-zinc-900',
    border: 'border-[#eab308]/50',
    text: 'text-[#eab308]',
    hover: 'hover:border-[#eab308] hover:shadow-[0_0_15px_rgba(234,179,8,0.5)]'
  } : isOCCard ? {
    bg: 'bg-zinc-900',
    border: 'border-[#ef4444]/50',
    text: 'text-[#ef4444]',
    hover: 'hover:border-[#ef4444] hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]'
  } : isBACard ? {
    bg: 'bg-zinc-900',
    border: 'border-[#6366f1]/50',
    text: 'text-[#6366f1]',
    hover: 'hover:border-[#6366f1] hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]'
  } : categoryStyles[template.category];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      suppressHydrationWarning
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
          h-full bg-black/95 backdrop-blur-xl border-r border-orange-500/20
          shadow-[0_0_30px_rgba(249,115,22,0.1)]
          transition-all duration-500 ease-in-out
          flex flex-col
          overflow-hidden
          ${isVisible ? (isExpanded ? 'w-80' : 'w-16') : 'w-0'}
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-orange-500/20 flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-orange-500" />
              <h3 className="font-bold text-orange-500 text-lg drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                Card Library
              </h3>
            </div>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg bg-zinc-900 border border-orange-500/30 hover:border-orange-500 hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all"
          >
            {isExpanded ? (
              <ChevronLeft className="h-4 w-4 text-orange-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-orange-500" />
            )}
          </button>
        </div>

        {isExpanded && (
          <>
            {/* Category Filter */}
            <div className="flex-shrink-0 p-4 border-b border-orange-500/20">
              <div className="text-xs font-semibold text-orange-500 mb-2">CATEGORIES</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`
                    px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${!selectedCategory
                      ? 'bg-orange-500/20 text-orange-500 border border-orange-500'
                      : 'bg-zinc-900 text-gray-400 border border-zinc-700 hover:border-orange-500/50'
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
                          ? 'bg-orange-500/20 text-orange-500 border border-orange-500'
                          : 'bg-zinc-900 text-gray-400 border border-zinc-700 hover:border-orange-500/50'
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
              <div className="text-xs font-semibold text-orange-500 mb-3">
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
            <div className="flex-shrink-0 p-4 border-t border-orange-500/20">
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
                💡 <span className="text-orange-500">Drag</span> cards to dashboard • <span className="text-orange-500">Double-click</span> to configure
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
                  className="w-full p-2 rounded-lg bg-zinc-900 border border-orange-500/30 hover:border-orange-500 hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all"
                  title={cat.label}
                >
                  <Icon className="h-5 w-5 text-orange-500 mx-auto" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
