"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Database, RefreshCw, AlertCircle, ChevronDown } from "lucide-react";
import { TestCardConnectionForm } from './TestCardConnectionForm';

interface TestSearchCardProps {
  isAdminMode?: boolean;
  onAdminClick?: () => void;
}

interface LGAOption {
  lga_name: string;
  lga_code: string;
}

interface TestData {
  value: string;
  row: number;
  column: string;
  schema: string;
  table: string;
  query: string;
}

interface ConnectionInfo {
  host: string;
  port: number;
  database: string;
  user: string;
  schema: string;
  table: string;
}

export function TestSearchCard({ isAdminMode = false, onAdminClick }: TestSearchCardProps) {
  const [selectedLGA, setSelectedLGA] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [lgaOptions, setLgaOptions] = useState<LGAOption[]>([]);
  const [isLoadingLGAs, setIsLoadingLGAs] = useState(false);
  const [data, setData] = useState<TestData | null>(null);
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  // Fetch LGAs from database
  const fetchLGAs = async () => {
    setIsLoadingLGAs(true);
    try {
      // Get stored config for database connection
      const storedConfig = localStorage.getItem('search-geography-card-config');
      const config = storedConfig ? JSON.parse(storedConfig) : {
        schema: 'housing_dashboard',
        table: 'search',
        passwordPath: '/users/ben/permissions/.env.admin'
      };

      const params = new URLSearchParams({
        action: 'getLGAs',
        schema: config.schema,
        table: config.table,
        state_column: 'ste_name21',
        state_value: 'New South Wales',
        lga_column: 'lga_name24'
      });

      const response = await fetch(`/api/test-search-data?${params}`);
      const result = await response.json();

      if (result.success && result.data) {
        setLgaOptions(result.data);
      } else {
        console.error('Failed to fetch LGAs:', result.error);
        setError(result.error || 'Failed to fetch LGA list');
      }
    } catch (err) {
      console.error('Error fetching LGAs:', err);
      setError('Failed to fetch LGA list');
    } finally {
      setIsLoadingLGAs(false);
    }
  };

  // Fetch data when LGA is selected
  const fetchDataForLGA = async (lgaName: string) => {
    if (!lgaName) return;

    setIsLoading(true);
    setError(null);

    try {
      const storedConfig = localStorage.getItem('search-geography-card-config');
      const config = storedConfig ? JSON.parse(storedConfig) : {
        schema: 'housing_dashboard',
        table: 'search',
        column: 'lga_name24',
        passwordPath: '/users/ben/permissions/.env.admin'
      };

      const params = new URLSearchParams({
        action: 'getDataForLGA',
        schema: config.schema,
        table: config.table,
        column: config.column,
        lga_value: lgaName
      });

      const response = await fetch(`/api/test-search-data?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setConnection(result.connection);
      } else {
        setError(result.error || 'Failed to fetch data');
        setConnection(result.connection || null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter LGAs based on search query
  const filteredLGAs = useMemo(() => {
    let filtered = lgaOptions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = lgaOptions.filter(lga =>
        lga.lga_name.toLowerCase().includes(query)
      );
    }

    // Always sort alphabetically
    return filtered.sort((a, b) => a.lga_name.localeCompare(b.lga_name));
  }, [lgaOptions, searchQuery]);

  // Initialize - fetch LGAs on mount
  useEffect(() => {
    fetchLGAs();
  }, []);

  // Handle LGA selection
  const handleSelectLGA = (lgaName: string) => {
    setSelectedLGA(lgaName);
    setSearchQuery(lgaName);
    setIsDropdownOpen(false);
    fetchDataForLGA(lgaName);

    // Emit custom event for other cards to listen to
    const lgaOption = lgaOptions.find(lga => lga.lga_name === lgaName);
    const event = new CustomEvent('search-geography-lga-selected', {
      detail: {
        lgaName: lgaName,
        lgaCode: lgaOption?.lga_code || ''
      }
    });
    window.dispatchEvent(event);
  };

  // Handle double click for admin mode
  const handleDoubleClick = () => {
    if (isAdminMode) {
      const config = {
        host: 'mecone-data-lake.postgres.database.azure.com',
        port: 5432,
        database: 'research&insights',
        user: 'db_admin',
        passwordPath: '/users/ben/permissions/.env.admin',
        schema: 'housing_dashboard',
        table: 'search',
        column: 'lga_name24',
        row: 1,
        customQuery: '',
        useCustomQuery: false,
        filterIntegration: {
          enabled: true,
          lgaColumn: 'lga_name24',
          dynamicFiltering: true
        }
      };
      setCurrentConfig(config);
      setShowConnectionForm(true);
      onAdminClick?.();
    }
  };

  const handleSaveConfig = (newConfig: any) => {
    // Save config to localStorage
    localStorage.setItem('search-geography-card-config', JSON.stringify({
      schema: newConfig.schema,
      table: newConfig.table,
      column: newConfig.column,
      passwordPath: newConfig.passwordPath
    }));

    // Refresh LGA list with new config
    fetchLGAs();
    setCurrentConfig(newConfig);
  };

  return (
    <>
    <Card
      className={`shadow-lg border border-border/50 h-fit ${
        isAdminMode ? 'cursor-pointer hover:ring-2 hover:ring-purple-500 hover:shadow-purple-500/25 hover:shadow-lg transition-all' : ''
      }`}
      onDoubleClick={handleDoubleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Search Geography</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Search by State, Region or LGA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLGAs}
              className="p-1 hover:bg-muted rounded-sm transition-colors"
              title="Refresh LGA list"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoadingLGAs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Current Selection - Always visible to prevent resizing */}
        <div className="mt-3 bg-primary/10 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              {selectedLGA ? (
                <>
                  <div className="font-semibold text-foreground">{selectedLGA}</div>
                  <div className="text-xs text-muted-foreground">
                    NSW LGA
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-muted-foreground">No Selection</div>
                  <div className="text-xs text-muted-foreground">
                    Choose an LGA to view specific data
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Searchable Dropdown */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search NSW LGAs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                setIsDropdownOpen(true);
                setSearchQuery(''); // Clear search to show all LGAs when focusing
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredLGAs.length > 0) {
                  e.preventDefault();
                  handleSelectLGA(filteredLGAs[0].lga_name);
                } else if (e.key === 'Escape') {
                  setIsDropdownOpen(false);
                }
              }}
              className="w-full pl-10 pr-10 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                if (!isDropdownOpen) {
                  setSearchQuery(''); // Clear search to show all LGAs
                }
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {/* Dropdown List */}
          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
              {isLoadingLGAs ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Loading LGAs...
                </div>
              ) : filteredLGAs.length > 0 ? (
                filteredLGAs.map((lga) => (
                  <button
                    key={lga.lga_code || lga.lga_name}
                    onClick={() => handleSelectLGA(lga.lga_name)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    {lga.lga_name}
                  </button>
                ))
              ) : (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No LGAs found
                </div>
              )}
            </div>
          )}
        </div>


        {/* Connection Status */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          {connection ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Select an LGA to connect</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    <TestCardConnectionForm
      isOpen={showConnectionForm}
      onClose={() => setShowConnectionForm(false)}
      onSave={handleSaveConfig}
      currentConfig={currentConfig}
    />
    </>
  );
}