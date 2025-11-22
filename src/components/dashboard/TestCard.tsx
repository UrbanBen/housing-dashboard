"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, RefreshCw, AlertCircle } from "lucide-react";
import { TestCardConnectionForm } from './TestCardConnectionForm';

interface TestCardProps {
  isAdminMode?: boolean;
  onAdminClick?: () => void;
  title?: string;
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

// Global state to prevent multiple instances from making simultaneous requests
let isGloballyLoading = false;
let globalData: TestData | null = null;
let globalConnection: ConnectionInfo | null = null;
let globalError: string | null = null;
let globalLastUpdated: Date | null = null;

export function TestCard({ isAdminMode = false, onAdminClick, title = "Test" }: TestCardProps) {
  const [data, setData] = useState<TestData | null>(globalData);
  const [connection, setConnection] = useState<ConnectionInfo | null>(globalConnection);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(globalError);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(globalLastUpdated);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  // Get query parameters from localStorage (set by admin config)
  const getStoredConfig = () => {
    const stored = localStorage.getItem('test-card-config');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored config:', e);
      }
    }
    return {
      schema: 'housing_dashboard',
      table: 'search',
      column: 'lga_name24',
      row: 1
    };
  };

  const fetchData = async () => {
    // Prevent multiple simultaneous requests
    if (isGloballyLoading) {
      console.log('[TestCard] Already loading, skipping request');
      return;
    }

    const fetchId = Math.random().toString(36).substr(2, 9);
    console.log(`[TestCard-${fetchId}] fetchData called:`, {
      timestamp: new Date().toISOString(),
      isGloballyLoading,
      hasError: !!globalError,
      currentData: globalData?.value?.slice(0, 30)
    });

    try {
      isGloballyLoading = true;
      setIsLoading(true);
      setError(null);
      globalError = null;

      const config = getStoredConfig();
      console.log(`[TestCard-${fetchId}] Using config:`, config);

      const params = new URLSearchParams({
        schema: config.schema,
        table: config.table,
        column: config.column,
        row: config.row.toString()
      });

      console.log(`[TestCard-${fetchId}] Making API request:`, `/api/test-data?${params}`);
      const response = await fetch(`/api/test-data?${params}`);
      const result = await response.json();

      console.log(`[TestCard-${fetchId}] API response:`, {
        success: result.success,
        value: result.data?.value?.slice(0, 30),
        diagnostics: result.diagnostics
      });

      if (result.success) {
        // Update global state
        globalData = result.data;
        globalConnection = result.connection;
        globalLastUpdated = new Date();
        globalError = null;

        // Update local state
        setData(result.data);
        setConnection(result.connection);
        setLastUpdated(new Date());
        setError(null);

        // Cache the successful result to localStorage for immediate display on future loads
        const cacheKey = `test-card-cache-${config.schema}-${config.table}-${config.column}-${config.row}`;
        const cacheData = {
          data: result.data,
          connection: result.connection,
          timestamp: new Date().toISOString(),
          config: config
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));

        console.log(`[TestCard-${fetchId}] Data cached successfully`);
      } else {
        globalError = result.error || 'Failed to fetch data';
        globalConnection = result.connection || null;
        globalData = null;

        setError(result.error || 'Failed to fetch data');
        setConnection(result.connection || null);
        setData(null);
      }
    } catch (err) {
      console.log(`[TestCard-${fetchId}] Fetch error:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Network error';

      globalError = errorMessage;
      globalData = null;
      globalConnection = null;

      setError(errorMessage);
      setData(null);
      setConnection(null);
    } finally {
      isGloballyLoading = false;
      setIsLoading(false);
    }
  };

  // Load cached data immediately if available
  const loadCachedData = () => {
    const config = getStoredConfig();
    const cacheKey = `test-card-cache-${config.schema}-${config.table}-${config.column}-${config.row}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const cacheData = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(cacheData.timestamp).getTime();
        const maxAge = 5 * 60 * 1000; // 5 minutes cache

        if (cacheAge < maxAge) {
          console.log('[TestCard] Loading from cache:', { age: Math.round(cacheAge / 1000) + 's' });

          // Update global state
          globalData = cacheData.data;
          globalConnection = cacheData.connection;
          globalLastUpdated = new Date(cacheData.timestamp);
          globalError = null;

          // Update local state
          setData(cacheData.data);
          setConnection(cacheData.connection);
          setLastUpdated(new Date(cacheData.timestamp));
          setError(null);
          return true; // Cache was loaded
        } else {
          console.log('[TestCard] Cache expired, will fetch fresh data');
          localStorage.removeItem(cacheKey);
        }
      } catch (e) {
        console.log('[TestCard] Cache parse error:', e);
        localStorage.removeItem(cacheKey);
      }
    }
    return false; // No cache available
  };

  // Initialize component only once
  useEffect(() => {
    if (isInitialized) return;

    console.log('[TestCard] Component initialization started');

    // Check if global data already exists (from another component instance)
    if (globalData && globalConnection) {
      console.log('[TestCard] Using existing global data');
      setData(globalData);
      setConnection(globalConnection);
      setLastUpdated(globalLastUpdated);
      setError(globalError);
      setIsInitialized(true);
      return;
    }

    // Try to load from cache first
    const cacheLoaded = loadCachedData();

    // Only fetch if no cache was loaded and no other instance is loading
    if (!cacheLoaded && !isGloballyLoading) {
      console.log('[TestCard] No cache available, fetching fresh data');
      fetchData();
    }

    setIsInitialized(true);
    console.log('[TestCard] Component initialized');
  }, [isInitialized]);

  // Listen for config changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'test-card-config') {
        console.log('[TestCard] Test card config changed, refetching data');
        fetchData();
      }
    };

    const handleConfigChange = () => {
      console.log('[TestCard] Custom config change event received');
      fetchData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('test-card-config-changed', handleConfigChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('test-card-config-changed', handleConfigChange);
    };
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const handleDoubleClick = () => {
    const config = {
      host: 'mecone-data-lake.postgres.database.azure.com',
      port: 5432,
      database: 'research&insights',
      user: 'db_admin',
      passwordPath: '/users/ben/permissions/.env.admin',
      schema: connection?.schema || 'housing_dashboard',
      table: connection?.table || 'search',
      column: data?.column || 'lga_name24',
      row: data?.row || 1,
      customQuery: '',
      useCustomQuery: false,
      filterIntegration: {
        enabled: false,
        lgaColumn: 'lga_name24',
        dynamicFiltering: false
      }
    };
    setCurrentConfig(config);
    setShowConnectionForm(true);
    onAdminClick?.();
  };

  const handleSaveConfig = (newConfig: any) => {
    // Save config to localStorage
    localStorage.setItem('test-card-config', JSON.stringify({
      schema: newConfig.schema,
      table: newConfig.table,
      column: newConfig.column,
      row: newConfig.row,
      passwordPath: newConfig.passwordPath
    }));

    // Trigger config change event
    window.dispatchEvent(new Event('test-card-config-changed'));
    setCurrentConfig(newConfig);
  };

  return (
    <>
    <Card
      className="shadow-lg border border-border/50 h-fit cursor-pointer hover:ring-2 hover:ring-primary/50 hover:shadow-lg transition-all"
      onDoubleClick={handleDoubleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Database Test Data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-1 hover:bg-muted rounded-sm transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Data Display */}
        <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : error ? (
            <div className="flex items-center text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              <div>
                <div className="font-medium">Error</div>
                <div className="text-sm">{error}</div>
              </div>
            </div>
          ) : data ? (
            <div>
              <div className="text-2xl font-bold text-foreground mb-2">
                {data.value}
              </div>
              <div className="text-xs text-muted-foreground">
                Row {data.row}, Column: {data.column}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">
              No data available
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          {connection ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Connected to {connection.database}</span>
              </div>
              <div>{connection.schema}.{connection.table}</div>
              {lastUpdated && (
                <div>Last updated: {lastUpdated.toLocaleTimeString()}</div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Database connection failed</span>
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