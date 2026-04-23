// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Configure error filtering
  beforeSend(event, hint) {
    // Filter out errors from development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Filter out specific errors you don't want to track
    const error = hint.originalException;
    if (error && typeof error === 'object') {
      const message = error.toString();

      // Filter out database connection errors in development
      if (process.env.NODE_ENV !== 'production' &&
          message.includes('ECONNREFUSED')) {
        return null;
      }
    }

    return event;
  },

  // Configure environment
  environment: process.env.NODE_ENV,

  // Configure release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
});
