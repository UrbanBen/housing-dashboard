"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Database, Settings, Save, RefreshCw, AlertCircle, CheckCircle, FolderOpen, FileText } from "lucide-react";

interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  passwordPath: string;
  schema: string;
  table: string;
  column: string;
  row: number;
  customQuery?: string;
  useCustomQuery: boolean;
}

interface FilterIntegration {
  enabled: boolean;
  lgaColumn?: string;
  dynamicFiltering: boolean;
}

interface TestCardConnectionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ConnectionConfig & { filterIntegration: FilterIntegration }) => void;
  currentConfig?: ConnectionConfig & { filterIntegration?: FilterIntegration };
}

export function TestCardConnectionForm({
  isOpen,
  onClose,
  onSave,
  currentConfig
}: TestCardConnectionFormProps) {
  const [config, setConfig] = useState<ConnectionConfig>({
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
    useCustomQuery: false
  });

  const [filterIntegration, setFilterIntegration] = useState<FilterIntegration>({
    enabled: false,
    lgaColumn: 'lga_name24',
    dynamicFiltering: false
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isReadingPassword, setIsReadingPassword] = useState(false);
  const [passwordFileStatus, setPasswordFileStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [passwordFileMessage, setPasswordFileMessage] = useState('');
  const [resolvedPassword, setResolvedPassword] = useState('');

  // Load current config when form opens
  useEffect(() => {
    if (isOpen && currentConfig) {
      setConfig(currentConfig);
      setFilterIntegration(currentConfig.filterIntegration || {
        enabled: false,
        lgaColumn: 'lga_name24',
        dynamicFiltering: false
      });
      // If there's a password path, try to read it
      if (currentConfig.passwordPath) {
        readPasswordFromFile(currentConfig.passwordPath);
      }
    }
  }, [isOpen, currentConfig]);

  const readPasswordFromFile = async (filePath: string) => {
    if (!filePath.trim()) {
      setPasswordFileStatus('idle');
      setPasswordFileMessage('');
      setResolvedPassword('');
      return;
    }

    setIsReadingPassword(true);
    setPasswordFileStatus('idle');
    setPasswordFileMessage('');

    try {
      const response = await fetch('/api/read-password-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath })
      });

      const result = await response.json();

      if (result.success) {
        setPasswordFileStatus('success');
        setPasswordFileMessage(`Found ${result.variable} in ${result.filePath}`);
        setResolvedPassword(result.password);
      } else {
        setPasswordFileStatus('error');
        setPasswordFileMessage(result.error || 'Failed to read password file');
        setResolvedPassword('');
      }
    } catch (error) {
      setPasswordFileStatus('error');
      setPasswordFileMessage(error instanceof Error ? error.message : 'Unknown error');
      setResolvedPassword('');
    } finally {
      setIsReadingPassword(false);
    }
  };

  const handlePasswordPathChange = (newPath: string) => {
    setConfig(prev => ({ ...prev, passwordPath: newPath }));
    // Don't automatically read on every keystroke - wait for Enter or onBlur
  };

  const handlePasswordPathKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      readPasswordFromFile(config.passwordPath);
    }
  };

  const testConnection = async () => {
    // First ensure we have a password
    if (!resolvedPassword && config.passwordPath) {
      await readPasswordFromFile(config.passwordPath);
      // If still no password after reading, fail
      if (!resolvedPassword) {
        setConnectionStatus('error');
        setErrorMessage('Could not read password from file. Please check the password path.');
        return;
      }
    }
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setErrorMessage('');

    try {
      const testParams = new URLSearchParams({
        schema: config.schema,
        table: config.table,
        column: config.column,
        row: config.row.toString()
      });

      const response = await fetch(`/api/test-data?${testParams}`);
      const result = await response.json();

      if (result.success) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Connection test failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...config,
      filterIntegration
    });
    onClose();
  };

  const generateCustomQuery = () => {
    if (filterIntegration.enabled && filterIntegration.dynamicFiltering) {
      return `SELECT ${config.column} FROM ${config.schema}.${config.table} WHERE ${filterIntegration.lgaColumn} = $1 ORDER BY ogc_fid LIMIT 1 OFFSET $2`;
    } else {
      return `SELECT ${config.column} FROM ${config.schema}.${config.table} ORDER BY ogc_fid LIMIT 1 OFFSET $1`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-xl">Test Card Connection Configuration</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure database connection, SQL queries, and filter integration
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Connection Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Database Connection
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Host
                  </label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    placeholder="Database host"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Port
                  </label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 5432 }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    placeholder="5432"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Database
                  </label>
                  <input
                    type="text"
                    value={config.database}
                    onChange={(e) => setConfig(prev => ({ ...prev, database: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    placeholder="Database name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    User
                  </label>
                  <input
                    type="text"
                    value={config.user}
                    onChange={(e) => setConfig(prev => ({ ...prev, user: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    placeholder="Username"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Password File Path
                  </label>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={config.passwordPath}
                        onChange={(e) => handlePasswordPathChange(e.target.value)}
                        onKeyPress={handlePasswordPathKeyPress}
                        onBlur={() => readPasswordFromFile(config.passwordPath)}
                        className="w-full px-3 py-2 pr-24 border border-border rounded-md bg-background text-foreground"
                        placeholder="/path/to/.env file (press Enter to read)"
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                        {isReadingPassword && (
                          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        <button
                          type="button"
                          onClick={() => readPasswordFromFile(config.passwordPath)}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title="Read password from file"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Password file status */}
                    {passwordFileStatus === 'success' && (
                      <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>{passwordFileMessage}</span>
                      </div>
                    )}

                    {passwordFileStatus === 'error' && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{passwordFileMessage}</span>
                      </div>
                    )}

                    {resolvedPassword && (
                      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-sm">
                        <FileText className="h-4 w-4" />
                        <span>Password loaded successfully (••••••••)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Query Configuration Section */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold">Query Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Schema
                  </label>
                  <input
                    type="text"
                    value={config.schema}
                    onChange={(e) => setConfig(prev => ({ ...prev, schema: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    placeholder="Schema name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Table
                  </label>
                  <input
                    type="text"
                    value={config.table}
                    onChange={(e) => setConfig(prev => ({ ...prev, table: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    placeholder="Table name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Column
                  </label>
                  <input
                    type="text"
                    value={config.column}
                    onChange={(e) => setConfig(prev => ({ ...prev, column: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    placeholder="Column name"
                  />
                </div>
              </div>

              <div className="w-full md:w-32">
                <label className="text-sm font-medium text-foreground block mb-2">
                  Row Number
                </label>
                <input
                  type="number"
                  value={config.row}
                  onChange={(e) => setConfig(prev => ({ ...prev, row: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  placeholder="1"
                  min="1"
                />
              </div>

              {/* Custom Query Option */}
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.useCustomQuery}
                    onChange={(e) => setConfig(prev => ({ ...prev, useCustomQuery: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Use Custom SQL Query</span>
                </label>

                {config.useCustomQuery && (
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Custom SQL Query
                    </label>
                    <textarea
                      value={config.customQuery}
                      onChange={(e) => setConfig(prev => ({ ...prev, customQuery: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-mono text-sm"
                      rows={4}
                      placeholder="SELECT column FROM schema.table WHERE condition ORDER BY id LIMIT 1"
                    />
                  </div>
                )}

                {!config.useCustomQuery && (
                  <div className="bg-muted/50 p-3 rounded-md">
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Generated Query Preview
                    </label>
                    <code className="text-sm bg-background p-2 rounded border block">
                      {generateCustomQuery()}
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Integration Section */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold">Filter Integration</h3>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterIntegration.enabled}
                  onChange={(e) => setFilterIntegration(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium">Enable LGA Filter Integration</span>
              </label>

              {filterIntegration.enabled && (
                <div className="space-y-4 ml-6">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      LGA Column Name
                    </label>
                    <input
                      type="text"
                      value={filterIntegration.lgaColumn}
                      onChange={(e) => setFilterIntegration(prev => ({ ...prev, lgaColumn: e.target.value }))}
                      className="w-full md:w-64 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                      placeholder="lga_name24"
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filterIntegration.dynamicFiltering}
                      onChange={(e) => setFilterIntegration(prev => ({ ...prev, dynamicFiltering: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Dynamic Filtering (filter by selected LGA)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Test Connection Section */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Test Connection</h3>
                <button
                  onClick={testConnection}
                  disabled={isTestingConnection}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${isTestingConnection ? 'animate-spin' : ''}`} />
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {connectionStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Connection successful! Data retrieved successfully.</span>
                </div>
              )}

              {connectionStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <span className="text-sm font-medium">Connection failed</span>
                    {errorMessage && <p className="text-sm mt-1">{errorMessage}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 border-t pt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <Save className="h-4 w-4" />
                Save Configuration
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}