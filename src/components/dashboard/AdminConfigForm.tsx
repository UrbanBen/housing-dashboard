"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Database, Settings, Filter, RefreshCw } from "lucide-react";
import type { DashboardCard } from './DraggableDashboard';

interface AdminConfigFormProps {
  card: DashboardCard;
  dataItem?: string; // Specific data item that was double-clicked
  onClose: () => void;
  onSave: (config: DataItemConfig) => void;
}

interface DataItemConfig {
  // Data Item Specification
  id: string;
  name: string;
  description: string;
  category: 'lga' | 'metrics' | 'charts' | 'kpi';
  dataType: 'geographic' | 'numeric' | 'categorical' | 'temporal';
  updateFrequency: 'real-time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';

  // Database Connection Details
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
    schema?: string;
  };

  // SQL Query Configuration
  query: {
    sql: string;
    filterParameters: string[];
    primaryKey?: string;
    geometryColumn?: string;
  };

  // Filter Integration
  filterIntegration: {
    enabled: boolean;
    searchCardId?: string;
    filterColumn: string;
    filterType: 'exact' | 'contains' | 'starts_with' | 'fuzzy';
  };

  // Component Integration
  componentIntegration: {
    refreshOnFilterChange: boolean;
    cacheEnabled: boolean;
    cacheTtlMinutes: number;
  };

  // Refresh Cadence
  refreshCadence: {
    automatic: boolean;
    intervalMinutes?: number;
    manualRefreshEnabled: boolean;
  };
}

export function AdminConfigForm({ card, dataItem, onClose, onSave }: AdminConfigFormProps) {
  const [config, setConfig] = useState<DataItemConfig>({
    id: card.id,
    name: card.title,
    description: '',
    category: card.category,
    dataType: 'numeric',
    updateFrequency: 'daily',
    database: {
      host: 'localhost',
      port: 5432,
      database: 'mosaic_pro',
      user: 'mosaic_readonly',
      password: '',
      ssl: false,
      schema: 'public'
    },
    query: {
      sql: 'SELECT * FROM table_name WHERE 1=1',
      filterParameters: [],
      primaryKey: 'id',
      geometryColumn: undefined
    },
    filterIntegration: {
      enabled: false,
      searchCardId: undefined,
      filterColumn: 'lga_name',
      filterType: 'contains'
    },
    componentIntegration: {
      refreshOnFilterChange: true,
      cacheEnabled: true,
      cacheTtlMinutes: 30
    },
    refreshCadence: {
      automatic: true,
      intervalMinutes: 60,
      manualRefreshEnabled: true
    }
  });

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const handleFieldChange = (section: keyof DataItemConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object'
        ? { ...prev[section], [field]: value }
        : value
    }));
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-purple-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[10000] bg-card shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configure Data Item: {card.title}
              {dataItem && <span className="text-base font-normal text-purple-600"> • {dataItem}</span>}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {dataItem
                ? `Configure specific data item: ${dataItem}`
                : 'Set up database connections, queries, and integration settings'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Data Item Specification */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Data Item Specification
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Name</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => handleFieldChange('name', '', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Category</label>
                <select
                  value={config.category}
                  onChange={(e) => handleFieldChange('category', '', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="lga">LGA</option>
                  <option value="metrics">Metrics</option>
                  <option value="charts">Charts</option>
                  <option value="kpi">KPI</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Data Type</label>
                <select
                  value={config.dataType}
                  onChange={(e) => handleFieldChange('dataType', '', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="geographic">Geographic</option>
                  <option value="numeric">Numeric</option>
                  <option value="categorical">Categorical</option>
                  <option value="temporal">Temporal</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Update Frequency</label>
                <select
                  value={config.updateFrequency}
                  onChange={(e) => handleFieldChange('updateFrequency', '', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="real-time">Real-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description</label>
              <textarea
                value={config.description}
                onChange={(e) => handleFieldChange('description', '', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                placeholder="Describe what this data item represents and its purpose..."
              />
            </div>
          </section>

          {/* Database Connection */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Connection
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Host</label>
                <input
                  type="text"
                  value={config.database.host}
                  onChange={(e) => handleFieldChange('database', 'host', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Port</label>
                <input
                  type="number"
                  value={config.database.port}
                  onChange={(e) => handleFieldChange('database', 'port', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Database</label>
                <input
                  type="text"
                  value={config.database.database}
                  onChange={(e) => handleFieldChange('database', 'database', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">User</label>
                <input
                  type="text"
                  value={config.database.user}
                  onChange={(e) => handleFieldChange('database', 'user', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Password</label>
                <input
                  type="password"
                  value={config.database.password}
                  onChange={(e) => handleFieldChange('database', 'password', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Schema</label>
                <input
                  type="text"
                  value={config.database.schema || ''}
                  onChange={(e) => handleFieldChange('database', 'schema', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ssl"
                checked={config.database.ssl}
                onChange={(e) => handleFieldChange('database', 'ssl', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="ssl" className="text-sm">Use SSL Connection</label>
            </div>
          </section>

          {/* SQL Query Configuration */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">SQL Query Configuration</h3>
            <div>
              <label className="text-sm font-medium block mb-1">SQL Query</label>
              <textarea
                value={config.query.sql}
                onChange={(e) => handleFieldChange('query', 'sql', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background font-mono text-sm"
                placeholder="SELECT * FROM table_name WHERE condition = $1"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Primary Key Column</label>
                <input
                  type="text"
                  value={config.query.primaryKey || ''}
                  onChange={(e) => handleFieldChange('query', 'primaryKey', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="id"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Geometry Column</label>
                <input
                  type="text"
                  value={config.query.geometryColumn || ''}
                  onChange={(e) => handleFieldChange('query', 'geometryColumn', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="geom (for spatial data)"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Filter Parameters</label>
                <input
                  type="text"
                  value={config.query.filterParameters.join(', ')}
                  onChange={(e) => handleFieldChange('query', 'filterParameters', e.target.value.split(', ').filter(Boolean))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="param1, param2"
                />
              </div>
            </div>
          </section>

          {/* Filter Integration */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter Integration
            </h3>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="filterEnabled"
                checked={config.filterIntegration.enabled}
                onChange={(e) => handleFieldChange('filterIntegration', 'enabled', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="filterEnabled" className="text-sm">Enable filter integration with search cards</label>
            </div>
            {config.filterIntegration.enabled && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Search Card ID</label>
                  <select
                    value={config.filterIntegration.searchCardId || ''}
                    onChange={(e) => handleFieldChange('filterIntegration', 'searchCardId', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="">Select search card</option>
                    <option value="lga-lookup">Geography Search</option>
                    <option value="abs-geography-search">ABS Geography Search</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Filter Column</label>
                  <input
                    type="text"
                    value={config.filterIntegration.filterColumn}
                    onChange={(e) => handleFieldChange('filterIntegration', 'filterColumn', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Filter Type</label>
                  <select
                    value={config.filterIntegration.filterType}
                    onChange={(e) => handleFieldChange('filterIntegration', 'filterType', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="exact">Exact Match</option>
                    <option value="contains">Contains</option>
                    <option value="starts_with">Starts With</option>
                    <option value="fuzzy">Fuzzy Match</option>
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* Component Integration */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Component Integration</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="refreshOnFilter"
                  checked={config.componentIntegration.refreshOnFilterChange}
                  onChange={(e) => handleFieldChange('componentIntegration', 'refreshOnFilterChange', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="refreshOnFilter" className="text-sm">Refresh on filter change</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cacheEnabled"
                  checked={config.componentIntegration.cacheEnabled}
                  onChange={(e) => handleFieldChange('componentIntegration', 'cacheEnabled', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="cacheEnabled" className="text-sm">Enable caching</label>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Cache TTL (minutes)</label>
                <input
                  type="number"
                  value={config.componentIntegration.cacheTtlMinutes}
                  onChange={(e) => handleFieldChange('componentIntegration', 'cacheTtlMinutes', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
            </div>
          </section>

          {/* Refresh Cadence */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Cadence
            </h3>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="automaticRefresh"
                checked={config.refreshCadence.automatic}
                onChange={(e) => handleFieldChange('refreshCadence', 'automatic', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="automaticRefresh" className="text-sm">Enable automatic refresh</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {config.refreshCadence.automatic && (
                <div>
                  <label className="text-sm font-medium block mb-1">Refresh Interval (minutes)</label>
                  <input
                    type="number"
                    value={config.refreshCadence.intervalMinutes || 60}
                    onChange={(e) => handleFieldChange('refreshCadence', 'intervalMinutes', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="manualRefresh"
                  checked={config.refreshCadence.manualRefreshEnabled}
                  onChange={(e) => handleFieldChange('refreshCadence', 'manualRefreshEnabled', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="manualRefresh" className="text-sm">Enable manual refresh button</label>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}