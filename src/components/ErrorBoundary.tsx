'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Card className="shadow-lg border border-red-500/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We encountered an error loading this component. Please try refreshing.
            </p>

            {this.state.error && (
              <div className="text-xs bg-muted/50 p-3 rounded font-mono">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Card Error State Component
 *
 * User-friendly error display for individual dashboard cards
 */
export function CardErrorState({
  error,
  onRetry,
  title = 'Failed to load data'
}: {
  error?: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center space-y-4">
      <AlertCircle className="h-12 w-12 text-red-500/70" />
      <div className="space-y-2">
        <h3 className="font-medium text-foreground">{title}</h3>
        {error && (
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Loading State Component
 *
 * Consistent loading indicator for cards
 */
export function CardLoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
