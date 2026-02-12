# Authentication System Setup Guide

## ✅ What's Been Completed

### 1. Environment Configuration
- ✅ Updated `.env.local` with authentication variables
- ✅ Moved database passwords from hardcoded paths to environment variables
- ✅ Added placeholders for OAuth providers (Google, Microsoft)
- ✅ Added placeholders for Stripe API keys

### 2. Database Schema
- ✅ Created migration script: `database/migrations/001_create_auth_schema.sql`
- ✅ Created migration runner: `database/run-migration.js`
- ✅ Schema includes:
  - `auth.users` - User accounts with tier and Stripe info
  - `auth.accounts` - OAuth provider linkage
  - `auth.sessions` - Session management
  - `auth.verification_tokens` - Email verification
  - `auth.usage_logs` - Analytics tracking
  - `auth.audit_log` - Security audit trail

### 3. Dependencies
- ✅ Installed `next-auth` - Authentication framework
- ✅ Installed `bcrypt` - Password hashing
- ✅ Installed `stripe` and `@stripe/stripe-js` - Payment processing

### 4. Tier Configuration
- ✅ Created `src/lib/tiers.ts` with 3-tier system:
  - **FREE**: 6 cards (Search, Boundary, Details, Key Metrics, Housing Metrics, Building Approvals)
  - **PLUS**: FREE + 3 cards (Dwelling Approvals by LGA, Age by Sex, Dwelling Type) = $29/month
  - **PRO**: All cards unlocked = $79/month

---

## 🚀 Next Steps to Complete

### Step 1: Run Database Migration

Run the migration to create the auth schema in your `research&insights` database:

```bash
node database/run-migration.js
```

This will:
- Create the `auth` schema
- Create all authentication tables
- Set up proper permissions for `mosaic_readonly` user

**⚠️ Important:** This requires admin credentials (`db_admin`) which are already configured in `.env.local`.

---

### Step 2: Configure OAuth Providers (Optional but Recommended)

#### Google OAuth Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

#### Microsoft OAuth Setup:
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations" → "New registration"
3. Add redirect URI: `http://localhost:3000/api/auth/callback/microsoft`
4. Create a client secret under "Certificates & secrets"
5. Copy Application (client) ID and Client Secret to `.env.local`:
   ```env
   MICROSOFT_CLIENT_ID=your-microsoft-client-id
   MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
   ```

---

### Step 3: Set Up Stripe Account

1. Create account at [Stripe Dashboard](https://dashboard.stripe.com/register)
2. Get API keys from [API Keys page](https://dashboard.stripe.com/apikeys):
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

3. Create Products and Prices:
   - Go to "Products" → "Add product"
   - Create "Plus" tier: $29/month recurring
   - Create "Pro" tier: $79/month recurring
   - Copy Price IDs to `.env.local`:
     ```env
     STRIPE_PRICE_ID_PLUS=price_...
     STRIPE_PRICE_ID_PRO=price_...
     ```

4. Set up Webhook for subscription events:
   - Go to "Developers" → "Webhooks" → "Add endpoint"
   - URL: `http://localhost:3000/api/webhooks/stripe` (use ngrok for testing)
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy webhook secret to `.env.local`:
     ```env
     STRIPE_WEBHOOK_SECRET=whsec_...
     ```

---

### Step 4: Generate Secure NextAuth Secret

Generate a random secret for JWT encryption:

```bash
openssl rand -base64 32
```

Replace the temporary value in `.env.local`:
```env
NEXTAUTH_SECRET=<paste-generated-secret-here>
```

---

## 🔧 What Still Needs to be Built

I've set up the foundation. The following components still need to be created:

### 1. NextAuth Configuration (`src/app/api/auth/[...nextauth]/route.ts`)
- Configure providers (Credentials, Google, Microsoft)
- Set up database adapter
- Custom callbacks for tier management

### 2. Authentication API Routes
- `/api/auth/register` - User registration
- `/api/auth/check-session` - Session validation
- `/api/webhooks/stripe` - Stripe webhook handler

### 3. Auth Helper Functions (`src/lib/auth-helpers.ts`)
- Password hashing/validation
- Session management
- Tier upgrade/downgrade logic

### 4. UI Components
- Login page (`src/app/login/page.tsx`)
- Registration page (`src/app/register/page.tsx`)
- Protected dashboard wrapper
- Locked card UI component
- Upgrade modal
- Pricing page

### 5. Dashboard Integration
- Wrap dashboard in session provider
- Add tier-based card filtering
- Show locked state for unavailable cards
- "Upgrade" buttons on locked cards

---

## 📁 Project Structure

```
housing-insights-dashboard/
├── .env.local (✅ configured)
├── database/
│   ├── migrations/
│   │   └── 001_create_auth_schema.sql (✅ created)
│   └── run-migration.js (✅ created)
├── src/
│   ├── lib/
│   │   ├── db-pool.ts (✅ updated for readonly)
│   │   ├── tiers.ts (✅ created - tier config)
│   │   ├── auth-helpers.ts (⏳ needs creation)
│   │   └── database.ts (✅ updated)
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts (⏳ needs creation)
│   │   │   ├── webhooks/
│   │   │   │   └── stripe/
│   │   │   │       └── route.ts (⏳ needs creation)
│   │   │   └── user/
│   │   │       └── register/
│   │   │           └── route.ts (⏳ needs creation)
│   │   ├── login/
│   │   │   └── page.tsx (⏳ needs creation)
│   │   ├── register/
│   │   │   └── page.tsx (⏳ needs creation)
│   │   ├── pricing/
│   │   │   └── page.tsx (⏳ needs creation)
│   │   └── dashboard/
│   │       └── page.tsx (⏳ needs protection)
│   └── components/
│       ├── auth/
│       │   ├── ProtectedRoute.tsx (⏳ needs creation)
│       │   ├── LoginForm.tsx (⏳ needs creation)
│       │   └── RegisterForm.tsx (⏳ needs creation)
│       ├── dashboard/
│       │   ├── LockedCard.tsx (⏳ needs creation)
│       │   └── UpgradeModal.tsx (⏳ needs creation)
│       └── ErrorBoundary.tsx (✅ created)
```

---

## 🎯 Quick Start Commands

```bash
# 1. Run database migration (creates auth schema)
node database/run-migration.js

# 2. Install any missing dependencies
npm install

# 3. Generate NextAuth secret
openssl rand -base64 32  # Copy to .env.local

# 4. Start development server
npm run dev

# 5. Test authentication (once implemented)
# - Visit http://localhost:3000/register
# - Create account
# - Login at http://localhost:3000/login
# - Access dashboard at http://localhost:3000/dashboard
```

---

## ❓ Questions?

**Q: Can I skip OAuth and use email/password only?**
A: Yes! NextAuth supports credentials-only auth. You can add OAuth providers later.

**Q: Do I need Stripe in development?**
A: No, you can build the UI first and test with hard-coded tiers. Add Stripe when ready for payments.

**Q: What happens if a user downgrades?**
A: The Stripe webhook will update their tier in the database, and locked cards will automatically disable on next login.

**Q: Is the readonly database user secure enough?**
A: Yes! Auth writes use admin credentials via API routes. The readonly user can only SELECT from auth tables, not INSERT/UPDATE/DELETE.

---

## 🔒 Security Checklist

Before going to production:

- [ ] Change `NEXTAUTH_SECRET` to a strong random value
- [ ] Never commit `.env.local` to git (add to `.gitignore`)
- [ ] Use HTTPS in production (`NEXTAUTH_URL=https://yourdomain.com`)
- [ ] Enable Stripe webhook signature verification
- [ ] Implement rate limiting on `/api/auth/*` endpoints
- [ ] Add CAPTCHA to registration form
- [ ] Enable email verification for new accounts
- [ ] Set up monitoring for failed login attempts
- [ ] Configure CORS properly for API routes
- [ ] Use environment-specific Stripe keys (test vs live)

---

## 🐛 Troubleshooting

### Issue: Microsoft OAuth Button Doesn't Work

**Symptom:** Clicking "Sign in with Microsoft" button reloads the login page instead of redirecting to Microsoft login.

**Root Cause:** The Microsoft OAuth provider is conditionally registered in `src/lib/auth-config.ts` only when both `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` environment variables are present:

```typescript
// From auth-config.ts line 128-153
...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
  ? [/* Microsoft provider config */]
  : []),  // Empty array when credentials missing
```

**Current State in `.env.local`:**
```bash
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

**Why It Fails:**
1. Empty environment variables evaluate to `false` in the conditional check
2. Microsoft provider never gets added to NextAuth's providers array
3. When user clicks "Sign in with Microsoft", NextAuth has no 'microsoft' provider
4. Request fails silently and redirects back to login page

**Solution Options:**

**Option A: Configure Microsoft OAuth (Recommended for Production)**
1. Follow the Microsoft OAuth Setup steps above
2. Add valid credentials to `.env.local`
3. Restart development server

**Option B: Hide Button When Not Configured (Development Friendly)**
The UI has been updated to only show OAuth buttons when credentials are properly configured. If you see the Microsoft button, it means the credentials are set up and should work.

**Option C: Use Google OAuth Instead**
If you prefer Google authentication, follow the Google OAuth Setup steps above instead.

### Issue: OAuth Callback Redirects to Wrong URL

**Symptom:** After successful OAuth login with provider, redirect goes to wrong page.

**Solution:** Ensure `NEXTAUTH_URL` in `.env.local` matches your development environment:
```bash
NEXTAUTH_URL=http://localhost:3000
```

For production, update to your production domain with HTTPS.

### Issue: "Configuration" Error on Sign In

**Symptom:** NextAuth shows a generic configuration error.

**Common Causes:**
1. Missing or invalid `NEXTAUTH_SECRET`
2. Database connection issues
3. Mismatched redirect URIs in OAuth provider settings

**Debug Steps:**
1. Check server console for detailed error messages
2. Verify database connection with: `psql -h mecone-data-lake.postgres.database.azure.com -U mosaic_readonly -d "research&insights"`
3. Ensure `NEXTAUTH_SECRET` is set in `.env.local`
4. Check OAuth provider redirect URIs match exactly (including trailing slashes)

---

## 🎉 Ready to Continue?

Run the migration and let me know if you want me to continue building the remaining components!
