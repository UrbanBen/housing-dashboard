"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Database, Settings, Save, Link } from "lucide-react";

export interface DataItemDetailedConfig {
  filterSourceCard: string;
  database: string;
  schema: string;
  table: string;
  dataColumn: string;
  filterColumn: string;
  formatting: {
    type: 'number' | 'currency' | 'percentage';
    decimals: number;
    unit?: string;
    prefix?: string;
    suffix?: string;
  };
}

interface DataItemConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: DataItemDetailedConfig) => void;
  currentConfig: DataItemDetailedConfig | null;
  itemTitle: string;
}

export function DataItemConfigForm({
  isOpen,
  onClose,
  onSave,
  currentConfig,
  itemTitle
}: DataItemConfigFormProps) {
  const [config, setConfig] = useState<DataItemDetailedConfig>({
    filterSourceCard: 'search-geography-card',
    database: 'research&insights',
    schema: 'housing_dashboard',
    table: 'search',
    dataColumn: 'areasqkm',
    filterColumn: 'lga_name24',
    formatting: {
      type: 'number',
      decimals: 0,
      unit: '',
      prefix: '',
      suffix: ''
    }
  });

  useEffect(() => {
    if (isOpen && currentConfig) {
      setConfig(currentConfig);
    }
  }, [isOpen, currentConfig]);

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-xl">Data Item Configuration</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure database source and formatting for "{itemTitle}"
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-muted rounded-sm transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Filter Integration */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
                <Link className="h-4 w-4" />
                Filter Integration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Filter Source Card ID</label>
                  <input
                    type="text"
                    value={config.filterSourceCard}
                    onChange={(e) => setConfig({...config, filterSourceCard: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                    placeholder="e.g., search-geography-card"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Filter Column Name</label>
                  <input
                    type="text"
                    value={config.filterColumn}
                    onChange={(e) => setConfig({...config, filterColumn: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm bg-primary/10 text-primary font-mono"
                    placeholder="e.g., lga_name24"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Column used to match filter value</p>
                </div>
              </div>
            </div>

            {/* Database Configuration */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
                <Database className="h-4 w-4" />
                Database Source
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Database</label>
                  <input
                    type="text"
                    value={config.database}
                    onChange={(e) => setConfig({...config, database: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Schema</label>
                  <input
                    type="text"
                    value={config.schema}
                    onChange={(e) => setConfig({...config, schema: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Table</label>
                  <input
                    type="text"
                    value={config.table}
                    onChange={(e) => setConfig({...config, table: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data Column</label>
                  <input
                    type="text"
                    value={config.dataColumn}
                    onChange={(e) => setConfig({...config, dataColumn: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm bg-primary/10 text-primary font-mono"
                    placeholder="e.g., total_dwellings"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Column containing the value to display</p>
                </div>
              </div>
            </div>

            {/* Display Formatting */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
                <Settings className="h-4 w-4" />
                Display Formatting
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Format Type</label>
                  <select
                    value={config.formatting.type}
                    onChange={(e) => setConfig({
                      ...config,
                      formatting: {
                        ...config.formatting,
                        type: e.target.value as 'number' | 'currency' | 'percentage'
                      }
                    })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  >
                    <option value="number">Number</option>
                    <option value="currency">Currency</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Decimal Places</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={config.formatting.decimals}
                    onChange={(e) => setConfig({
                      ...config,
                      formatting: {
                        ...config.formatting,
                        decimals: parseInt(e.target.value) || 0
                      }
                    })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Prefix</label>
                  <input
                    type="text"
                    value={config.formatting.prefix || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      formatting: {
                        ...config.formatting,
                        prefix: e.target.value
                      }
                    })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                    placeholder="e.g., $"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Suffix</label>
                  <input
                    type="text"
                    value={config.formatting.suffix || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      formatting: {
                        ...config.formatting,
                        suffix: e.target.value
                      }
                    })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                    placeholder="e.g., km² or %"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Unit</label>
                  <input
                    type="text"
                    value={config.formatting.unit || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      formatting: {
                        ...config.formatting,
                        unit: e.target.value
                      }
                    })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                    placeholder="e.g., dwellings, houses, M (million)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Optional unit description for context</p>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <h4 className="text-sm font-semibold mb-2">Preview</h4>
              <div className="text-2xl font-bold">
                {config.formatting.prefix || ''}
                {(12345.678).toFixed(config.formatting.decimals)}
                {config.formatting.suffix || ''}
                {config.formatting.unit ? ` ${config.formatting.unit}` : ''}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Example formatting with sample value 12345.678
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Configuration
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>,
    document.body
  );
}
