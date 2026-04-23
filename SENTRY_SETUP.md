# Sentry Error Monitoring Setup Guide

## ✅ What's Already Done

- ✅ Sentry SDK installed (`@sentry/nextjs`)
- ✅ Client configuration created (`sentry.client.config.ts`)
- ✅ Server configuration created (`sentry.server.config.ts`)
- ✅ Edge runtime configuration created (`sentry.edge.config.ts`)
- ✅ Next.js config updated with Sentry webpack plugin

## 🔴 What You Need To Do

### Step 1: Create Sentry Account

1. Go to [sentry.io](https://sentry.io/signup/)
2. Sign up with your work email (or use company Sentry account)
3. Create a new project
   - **Platform:** Next.js
   - **Project Name:** urban-analytics-dashboard (or your preference)
   - **Team:** Choose appropriate team

### Step 2: Get Your Sentry DSN

After creating the project, Sentry will show you a DSN (Data Source Name). It looks like:

```
https://1234567890abcdef1234567890abcdef@o123456.ingest.sentry.io/123456
```

**Copy this DSN** - you'll need it for the environment variables.

### Step 3: Get Auth Token (for Source Maps)

1. Go to **Settings → Account → API → Auth Tokens**
2. Click **Create New Token**
3. Give it a name: "Urban Analytics Build"
4. Scopes needed:
   - `project:releases`
   - `org:read`
5. **Copy the token** - it won't be shown again!

### Step 4: Update Environment Variables

Add these to your `.env.local` file (for development):

```bash
# Sentry Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_DSN_HERE@o123456.ingest.sentry.io/123456
SENTRY_DSN=https://YOUR_DSN_HERE@o123456.ingest.sentry.io/123456
SENTRY_ORG=your-org-name
SENTRY_PROJECT=urban-analytics-dashboard
SENTRY_AUTH_TOKEN=your-auth-token-here
```

**For Vercel Production:**

1. Go to your Vercel project settings
2. Navigate to **Settings → Environment Variables**
3. Add each variable above for **Production**, **Preview**, and **Development** environments
4. **IMPORTANT:** Mark `SENTRY_AUTH_TOKEN` as **Secret**

### Step 5: Test Sentry Integration

#### Test in Development:

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Create a test error by adding this to any page temporarily:
   ```typescript
   throw new Error('Testing Sentry!');
   ```

3. Visit that page - you should see the error in Sentry dashboard within 1 minute

#### Test in Production:

1. Deploy to Vercel
2. Visit your production site
3. Trigger an error
4. Check Sentry dashboard for the error

### Step 6: Configure Alerts (Optional but Recommended)

In Sentry dashboard:

1. Go to **Alerts → Create Alert**
2. Recommended alerts:
   - **New error:** Get notified of new unique errors
   - **Error spike:** Threshold > 100 events in 1 hour
   - **Build failed:** Monitor build process

3. Configure notification channels:
   - Email
   - Slack (recommended for team)
   - Microsoft Teams

## 📊 What Sentry Will Track

### Automatically Tracked:

- ✅ JavaScript errors (client-side)
- ✅ API route errors (server-side)
- ✅ Unhandled promise rejections
- ✅ React component errors (via Error Boundary)
- ✅ Performance metrics
- ✅ Session replays (when errors occur)

### Filtered Out:

- ❌ Development environment errors (NODE_ENV=development)
- ❌ ResizeObserver errors (browser noise)
- ❌ Non-Error promise rejections
- ❌ Database connection errors in development

## 🔧 Customization

### Capture Custom Errors:

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // Your code here
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'dashboard',
      cardType: 'population-growth'
    },
    extra: {
      userId: user.id,
      lgaName: selectedLGA?.name
    }
  });

  // Show user-friendly error
  showErrorToast('Failed to load data');
}
```

### Add User Context:

```typescript
import * as Sentry from '@sentry/nextjs';

// After user logs in:
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
  tier: user.subscriptionTier // 'FREE', 'PLUS', 'PRO'
});

// When user logs out:
Sentry.setUser(null);
```

### Add Breadcrumbs:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.addBreadcrumb({
  category: 'dashboard',
  message: 'User changed LGA selection',
  level: 'info',
  data: {
    fromLGA: previousLGA,
    toLGA: newLGA
  }
});
```

## 🎯 Usage Examples

### Example 1: API Route Error Tracking

```typescript
// src/app/api/census-data/route.ts
import * as Sentry from '@sentry/nextjs';

export async function GET(request: Request) {
  try {
    const data = await fetchCensusData();
    return Response.json({ success: true, data });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { api: 'census-data' },
      extra: { url: request.url }
    });

    return Response.json(
      { success: false, error: 'Failed to fetch census data' },
      { status: 500 }
    );
  }
}
```

### Example 2: Card Component Error

```typescript
// src/components/dashboard/PopulationGrowthCard.tsx
import * as Sentry from '@sentry/nextjs';

useEffect(() => {
  async function fetchData() {
    try {
      const response = await fetch(`/api/census-data?lgaName=${lgaName}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      setData(result.data);
    } catch (err) {
      Sentry.captureException(err, {
        tags: {
          component: 'PopulationGrowthCard',
          lga: lgaName
        }
      });

      setError('Failed to load population data');
    }
  }

  fetchData();
}, [lgaName]);
```

## 🚨 Troubleshooting

### Build Fails with Sentry Error

If you get a build error about missing Sentry variables:

1. Make sure `NEXT_PUBLIC_SENTRY_DSN` is set (even empty string works for builds)
2. In development, Sentry is optional - it won't send errors without valid DSN
3. For CI/CD, add Sentry variables to build environment

**Quick fix for local builds:**
```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=  # Empty is OK for local builds
SENTRY_DSN=
```

### No Errors Appearing in Sentry

1. Check DSN is correct in environment variables
2. Verify `NODE_ENV=production` (dev errors are filtered out)
3. Check Sentry dashboard → Project Settings → Inbound Filters
4. Look at browser console for "Sentry" logs

### Too Many Errors

If you're getting flooded with errors:

1. Increase `beforeSend` filtering in configs
2. Adjust sample rates:
   ```typescript
   tracesSampleRate: 0.1,  // Only 10% of transactions
   replaysSessionSampleRate: 0.01,  // Only 1% of sessions
   ```
3. Set up Spike Protection in Sentry dashboard

## 📈 Monitoring Best Practices

1. **Set Alert Thresholds:** Don't alert on every error, use thresholds
2. **Add Context:** Always include user, LGA, card type in error data
3. **Regular Review:** Weekly review of error trends
4. **Fix High-Impact Errors First:** Sort by frequency × user impact
5. **Use Releases:** Tag deployments to track which version caused errors

## 🔗 Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Dashboard](https://sentry.io/)
- [Best Practices Guide](https://docs.sentry.io/product/best-practices/)

## ✅ Verification Checklist

After completing setup:

- [ ] Sentry account created
- [ ] Project created in Sentry
- [ ] DSN copied to `.env.local`
- [ ] Auth token created and saved
- [ ] Environment variables added to Vercel
- [ ] Dev server restarted
- [ ] Test error verified in Sentry dashboard
- [ ] Alerts configured
- [ ] Team members added to Sentry project
- [ ] Notification channels set up

**Status: Ready for production** ✅ once variables are configured
