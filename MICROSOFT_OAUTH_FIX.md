# Fix Microsoft OAuth "OAuthCallback" Error

## Problem
Error: `AADSTS700025: Client is public so neither 'client_assertion' nor 'client_secret' should be presented`

Your Azure app is configured as a **Public Client** (mobile/desktop app) but needs to be a **Web Application** (confidential client) for NextAuth to work.

## Solution: Reconfigure Azure App Registration

### Step 1: Access Azure Portal
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app: `e7cb6949-8974-48de-bc9b-d1504cb8a1a2`

### Step 2: Configure as Web Application
1. Click on your app registration
2. Go to **Authentication** (left sidebar)
3. Under **Platform configurations**:
   - If you see "Mobile and desktop applications" → **Remove it**
   - Click **+ Add a platform**
   - Select **Web**
   - Add Redirect URI: `http://localhost:3000/api/auth/callback/microsoft`
   - Click **Configure**

### Step 3: Disable Public Client Flows
1. Still in **Authentication** section
2. Scroll to **Advanced settings**
3. Find "Allow public client flows"
4. Set to **No**
5. Click **Save** at the top

### Step 4: Verify Client Secret
1. Go to **Certificates & secrets** (left sidebar)
2. Under **Client secrets**, verify you have an active secret
3. If expired or missing, create a new one:
   - Click **+ New client secret**
   - Description: "NextAuth Development"
   - Expires: 24 months
   - Click **Add**
   - **COPY THE VALUE IMMEDIATELY** (you can't see it again)
4. Update `.env.local` with the new secret if changed:
   ```
   MICROSOFT_CLIENT_SECRET=<your-new-secret-value>
   ```

### Step 5: Verify Redirect URIs
In **Authentication** → **Web** → **Redirect URIs**, ensure you have:
- Development: `http://localhost:3000/api/auth/callback/microsoft`
- Production (when ready): `https://yourdomain.com/api/auth/callback/microsoft`

### Step 6: Test
1. Restart your development server
2. Go to `http://localhost:3000/login`
3. Click "Sign in with Microsoft"
4. Should redirect to Microsoft login successfully

## Alternative: Create New App Registration (If Needed)

If the above doesn't work or you can't modify the existing app:

1. In Azure Portal → **App registrations**
2. Click **+ New registration**
3. Name: "Housing Dashboard - NextAuth"
4. Supported account types: "Accounts in this organizational directory only"
5. Redirect URI:
   - Platform: **Web**
   - URI: `http://localhost:3000/api/auth/callback/microsoft`
6. Click **Register**
7. Copy **Application (client) ID**
8. Go to **Certificates & secrets** → **+ New client secret**
9. Copy the secret value
10. Update `.env.local`:
    ```
    MICROSOFT_CLIENT_ID=<new-client-id>
    MICROSOFT_CLIENT_SECRET=<new-client-secret>
    ```
11. Restart dev server

## Common Issues

**Issue**: "Redirect URI mismatch"
- **Fix**: Ensure redirect URI in Azure exactly matches: `http://localhost:3000/api/auth/callback/microsoft` (no trailing slash)

**Issue**: "Invalid client secret"
- **Fix**: Secret may have expired, create a new one in Azure Portal

**Issue**: Still seeing "public client" error
- **Fix**: Clear browser cookies and try again, or wait a few minutes for Azure changes to propagate
