"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Database, Settings, Save, FolderOpen, BarChart3, Link, Home, TrendingUp, Users, Square, Target } from "lucide-react";

export interface DataItemConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
}

export interface KeyMetricsConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  passwordPath: string;
  schema: string;
  table: string;
  areaColumn: string;
  accordTargetColumn: string;
  lgaNameColumn: string;
  buildingApprovals: {
    enabled: boolean;
    schema: string;
    table: string;
    lgaNameColumn: string;
    totalDwellingsColumn: string;
    newHousesColumn: string;
    newOtherColumn: string;
    valueTotalResColumn: string;
  };
  filterIntegration: {
    enabled: boolean;
    sourceCardId: string;
    sourceCardType: 'search-geography-card' | 'lga-lookup' | 'custom';
    autoRefresh: boolean;
  };
  dataItems: {
    totalDwellings: DataItemConfig;
    newHouses: DataItemConfig;
    newOther: DataItemConfig;
    valueTotalRes: DataItemConfig;
    area: DataItemConfig;
    accordTarget: DataItemConfig;
  };
}

interface KeyMetricsConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: KeyMetricsConfig) => void;
  currentConfig: KeyMetricsConfig | null;
}

const defaultDataItems = {
  totalDwellings: {
    enabled: true,
    title: 'Building Approvals (Total Dwellings)',
    subtitle: 'FYTD Total Approvals'
  },
  newHouses: {
    enabled: true,
    title: 'New Houses',
    subtitle: 'FYTD New Houses'
  },
  newOther: {
    enabled: true,
    title: 'New Other Dwellings',
    subtitle: 'FYTD New Other'
  },
  valueTotalRes: {
    enabled: true,
    title: 'Total Residential Value',
    subtitle: 'FYTD Total Value'
  },
  area: {
    enabled: true,
    title: 'Area',
    subtitle: 'Administrative Area'
  },
  accordTarget: {
    enabled: true,
    title: 'National Housing Accord Target',
    subtitle: 'Housing Target'
  }
};

export function KeyMetricsConfigForm({
  isOpen,
  onClose,
  onSave,
  currentConfig
}: KeyMetricsConfigFormProps) {
  const [config, setConfig] = useState<KeyMetricsConfig>({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    passwordPath: '/users/ben/permissions/.env.admin',
    schema: 'housing_dashboard',
    table: 'search',
    areaColumn: 'areasqkm',
    accordTargetColumn: 'accord_target',
    lgaNameColumn: 'lga_name24',
    buildingApprovals: {
      enabled: true,
      schema: 'housing_dashboard',
      table: 'abs_nsw_lga_fytd',
      lgaNameColumn: 'lga_name',
      totalDwellingsColumn: 'total_dwellings',
      newHousesColumn: 'new_houses',
      newOtherColumn: 'new_other',
      valueTotalResColumn: 'value_total_res'
    },
    filterIntegration: {
      enabled: true,
      sourceCardId: 'search-geography-card',
      sourceCardType: 'search-geography-card',
      autoRefresh: true
    },
    dataItems: defaultDataItems
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

  const dataItemIcons = {
    totalDwellings: Home,
    newHouses: TrendingUp,
    newOther: Users,
    valueTotalRes: BarChart3,
    area: Square,
    accordTarget: Target
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4 border-b border-border sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-xl">Key Metrics Configuration</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure database connection, data items, and filter integration
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
            {/* Data Items Section */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
                <Settings className="h-4 w-4" />
                Data Items (6 Maximum)
              </h3>
              <div className="space-y-3">
                {Object.entries(config.dataItems).map(([key, item]) => {
                  const Icon = dataItemIcons[key as keyof typeof dataItemIcons];
                  return (
                    <div key={key} className="border border-border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`item-${key}`}
                          checked={item.enabled}
                          onChange={(e) => setConfig({
                            ...config,
                            dataItems: {
                              ...config.dataItems,
                              [key]: {
                                ...item,
                                enabled: e.target.checked
                              }
                            }
                          })}
                          className="h-4 w-4 mt-1"
                        />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <label htmlFor={`item-${key}`} className="font-medium text-sm">
                              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Title</label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => setConfig({
                                  ...config,
                                  dataItems: {
                                    ...config.dataItems,
                                    [key]: {
                                      ...item,
                                      title: e.target.value
                                    }
                                  }
                                })}
                                disabled={!item.enabled}
                                className="w-full mt-1 px-2 py-1.5 bg-background border border-border rounded-md text-sm disabled:opacity-50"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Subtitle</label>
                              <input
                                type="text"
                                value={item.subtitle}
                                onChange={(e) => setConfig({
                                  ...config,
                                  dataItems: {
                                    ...config.dataItems,
                                    [key]: {
                                      ...item,
                                      subtitle: e.target.value
                                    }
                                  }
                                })}
                                disabled={!item.enabled}
                                className="w-full mt-1 px-2 py-1.5 bg-background border border-border rounded-md text-sm disabled:opacity-50"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Database Connection Section */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
                <Database className="h-4 w-4" />
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

            {/* Data Configuration */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
                <Settings className="h-4 w-4" />
                Data Source Tables
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
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Area Column</label>
                  <input
                    type="text"
                    value={config.areaColumn}
                    onChange={(e) => setConfig({...config, areaColumn: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm bg-primary/10 text-primary font-mono"
                    placeholder="e.g., areasqkm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Accord Target Column</label>
                  <input
                    type="text"
                    value={config.accordTargetColumn}
                    onChange={(e) => setConfig({...config, accordTargetColumn: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm bg-primary/10 text-primary font-mono"
                    placeholder="e.g., accord_target"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">LGA Name Column</label>
                  <input
                    type="text"
                    value={config.lgaNameColumn}
                    onChange={(e) => setConfig({...config, lgaNameColumn: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Building Approvals Configuration */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
                <Database className="h-4 w-4" />
                Building Approvals Data (abs_nsw_lga_fytd)
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="buildingApprovalsEnabled"
                    checked={config.buildingApprovals.enabled}
                    onChange={(e) => setConfig({
                      ...config,
                      buildingApprovals: {
                        ...config.buildingApprovals,
                        enabled: e.target.checked
                      }
                    })}
                    className="h-4 w-4"
                  />
                  <label htmlFor="buildingApprovalsEnabled" className="text-sm font-medium">
                    Enable building approvals data from database
                  </label>
                </div>

                {config.buildingApprovals.enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-7">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Schema</label>
                      <input
                        type="text"
                        value={config.buildingApprovals.schema}
                        onChange={(e) => setConfig({
                          ...config,
                          buildingApprovals: {
                            ...config.buildingApprovals,
                            schema: e.target.value
                          }
                        })}
                        className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Table</label>
                      <input
                        type="text"
                        value={config.buildingApprovals.table}
                        onChange={(e) => setConfig({
                          ...config,
                          buildingApprovals: {
                            ...config.buildingApprovals,
                            table: e.target.value
                          }
                        })}
                        className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">LGA Name Column</label>
                      <input
                        type="text"
                        value={config.buildingApprovals.lgaNameColumn}
                        onChange={(e) => setConfig({
                          ...config,
                          buildingApprovals: {
                            ...config.buildingApprovals,
                            lgaNameColumn: e.target.value
                          }
                        })}
                        className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Dwellings Column</label>
                      <input
                        type="text"
                        value={config.buildingApprovals.totalDwellingsColumn}
                        onChange={(e) => setConfig({
                          ...config,
                          buildingApprovals: {
                            ...config.buildingApprovals,
                            totalDwellingsColumn: e.target.value
                          }
                        })}
                        className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm bg-primary/10 text-primary font-mono"
                        placeholder="e.g., total_dwellings"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">New Houses Column</label>
                      <input
                        type="text"
                        value={config.buildingApprovals.newHousesColumn}
                        onChange={(e) => setConfig({
                          ...config,
                          buildingApprovals: {
                            ...config.buildingApprovals,
                            newHousesColumn: e.target.value
                          }
                        })}
                        className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm bg-primary/10 text-primary font-mono"
                        placeholder="e.g., new_houses"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">New Other Column</label>
                      <input
                        type="text"
                        value={config.buildingApprovals.newOtherColumn}
                        onChange={(e) => setConfig({
                          ...config,
                          buildingApprovals: {
                            ...config.buildingApprovals,
                            newOtherColumn: e.target.value
                          }
                        })}
                        className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm bg-primary/10 text-primary font-mono"
                        placeholder="e.g., new_other"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Value Total Res Column</label>
                      <input
                        type="text"
                        value={config.buildingApprovals.valueTotalResColumn}
                        onChange={(e) => setConfig({
                          ...config,
                          buildingApprovals: {
                            ...config.buildingApprovals,
                            valueTotalResColumn: e.target.value
                          }
                        })}
                        className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm bg-primary/10 text-primary font-mono"
                        placeholder="e.g., value_total_res"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Integration */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
                <Link className="h-4 w-4" />
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
                        Auto-refresh data when filter changes
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background">
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
