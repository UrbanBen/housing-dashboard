"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Database, Settings, Save, FolderOpen, TrendingUp, Link } from "lucide-react";

export interface BuildingApprovalsConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  passwordPath: string;
  schema: string;
  table: string;
  filterIntegration: {
    enabled: boolean;
    sourceCardId: string;
    sourceCardType: 'search-geography-card' | 'lga-lookup' | 'custom';
    autoRefresh: boolean;
  };
}

interface BuildingApprovalsConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: BuildingApprovalsConfig) => void;
  currentConfig: BuildingApprovalsConfig | null;
}

export function BuildingApprovalsConfigForm({
  isOpen,
  onClose,
  onSave,
  currentConfig
}: BuildingApprovalsConfigFormProps) {
  const [config, setConfig] = useState<BuildingApprovalsConfig>({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'mosaic_pro',
    user: 'mosaic_readonly',
    passwordPath: '/users/ben/permissions/.env.readonly',
    schema: 'public',
    table: 'abs_building_approvals_lga',
    filterIntegration: {
      enabled: true,
      sourceCardId: 'search-geography-card',
      sourceCardType: 'search-geography-card',
      autoRefresh: true
    }
  });

  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    if (isOpen && currentConfig) {
      setConfig(currentConfig);
    }
  }, [isOpen, currentConfig]);

  const handlePasswordPathKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await validatePasswordPath();
    }
  };

  const validatePasswordPath = async () => {
    if (!config.passwordPath.trim()) {
      setPasswordMessage('');
      setIsPasswordValid(false);
      return;
    }

    try {
      const response = await fetch('/api/read-password-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filePath: config.passwordPath
        })
      });

      const result = await response.json();

      if (result.success) {
        setIsPasswordValid(true);
        setPasswordMessage(`✓ Password found: ${result.variable}`);
      } else {
        setIsPasswordValid(false);
        setPasswordMessage(`✗ ${result.error}`);
      }
    } catch (error) {
      setIsPasswordValid(false);
      setPasswordMessage('✗ Failed to read password file');
    }
  };

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
        className="bg-background border border-primary/30 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4 border-b border-primary/20 sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-xl text-primary">Building Approvals Configuration</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure database connection and data source for NSW state-wide building approvals
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
            {/* Database Connection Section */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
                <Database className="h-4 w-4 text-primary" />
                Database Connection
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Host</label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => setConfig({...config, host: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Port</label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig({...config, port: parseInt(e.target.value)})}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
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
                  <label className="text-sm font-medium text-muted-foreground">User</label>
                  <input
                    type="text"
                    value={config.user}
                    onChange={(e) => setConfig({...config, user: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FolderOpen className="h-3 w-3" />
                    Password File Path
                  </label>
                  <input
                    type="text"
                    value={config.passwordPath}
                    onChange={(e) => setConfig({...config, passwordPath: e.target.value})}
                    onKeyPress={handlePasswordPathKeyPress}
                    placeholder="Press Enter to validate"
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                  {passwordMessage && (
                    <p className={`mt-1 text-xs ${isPasswordValid ? 'text-green-600' : 'text-destructive'}`}>
                      {passwordMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Data Source Configuration */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
                <Settings className="h-4 w-4 text-primary" />
                Data Source
              </h3>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="mt-4 p-3 bg-muted/50 border border-primary/20 rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-primary">Note:</strong> This card shows NSW state-wide building approvals aggregated from all LGAs.
                  Data is pulled from the ABS building approvals table.
                </p>
              </div>
            </div>

            {/* Filter Integration */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
                <Link className="h-4 w-4 text-primary" />
                Filter Integration
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="filterEnabled"
                    checked={config.filterIntegration.enabled}
                    onChange={(e) => setConfig({
                      ...config,
                      filterIntegration: {
                        ...config.filterIntegration,
                        enabled: e.target.checked
                      }
                    })}
                    className="h-4 w-4"
                  />
                  <label htmlFor="filterEnabled" className="text-sm font-medium">
                    Enable filter integration with search card
                  </label>
                </div>

                {config.filterIntegration.enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-7">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Source Card Type</label>
                      <select
                        value={config.filterIntegration.sourceCardType}
                        onChange={(e) => setConfig({
                          ...config,
                          filterIntegration: {
                            ...config.filterIntegration,
                            sourceCardType: e.target.value as 'search-geography-card' | 'lga-lookup' | 'custom',
                            sourceCardId: e.target.value === 'search-geography-card' ? 'search-geography-card' : config.filterIntegration.sourceCardId
                          }
                        })}
                        className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                      >
                        <option value="search-geography-card">Search Geography Card</option>
                        <option value="lga-lookup">LGA Lookup</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Source Card ID</label>
                      <input
                        type="text"
                        value={config.filterIntegration.sourceCardId}
                        onChange={(e) => setConfig({
                          ...config,
                          filterIntegration: {
                            ...config.filterIntegration,
                            sourceCardId: e.target.value
                          }
                        })}
                        className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                        disabled={config.filterIntegration.sourceCardType === 'search-geography-card'}
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="autoRefresh"
                        checked={config.filterIntegration.autoRefresh}
                        onChange={(e) => setConfig({
                          ...config,
                          filterIntegration: {
                            ...config.filterIntegration,
                            autoRefresh: e.target.checked
                          }
                        })}
                        className="h-4 w-4"
                      />
                      <label htmlFor="autoRefresh" className="text-sm font-medium">
                        Auto-refresh chart when LGA selection changes
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-primary/20 sticky bottom-0 bg-background">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(var(--primary),0.3)]"
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
