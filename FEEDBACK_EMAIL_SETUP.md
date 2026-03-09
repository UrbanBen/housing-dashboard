# Feedback Email System - Azure AD Setup Guide

## Overview
The feedback system uses **Microsoft Graph API** to send emails from `researchandinsights@mecone.com.au`. This eliminates the need for SMTP passwords and uses your existing Microsoft OAuth credentials.

## Prerequisites
- Azure AD App Registration (already configured)
- Microsoft 365 account: `researchandinsights@mecone.com.au`
- Admin access to Azure Portal

---

## Setup Steps

### 1. Access Azure Portal

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app (Client ID: `e7cb6949-8974-48de-bc9b-d1504cb8a1a2`)

### 2. Add Mail.Send Permission

1. In your App registration, click **API permissions** (left sidebar)
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Choose **Application permissions** (not Delegated)
5. Search for and select: **Mail.Send**
6. Click **Add permissions**

### 3. Grant Admin Consent

**CRITICAL**: Application permissions require admin consent.

1. In the **API permissions** page, click **Grant admin consent for [Your Org]**
2. Confirm by clicking **Yes**
3. Wait for the status column to show a green checkmark ✅

### 4. Verify Permissions

Your app should now have these permissions:

| Permission | Type | Status |
|------------|------|--------|
| Mail.Send | Application | ✅ Granted |
| User.Read | Delegated | ✅ Granted (existing) |

---

## How It Works

### Authentication Flow

```
1. Dashboard API Route
   ↓
2. Azure Identity SDK
   ↓ (Client Credentials Flow)
3. Microsoft Graph API
   ↓
4. Email sent from researchandinsights@mecone.com.au
```

### Environment Variables Used

```env
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=common
SMTP_FROM=researchandinsights@mecone.com.au
```

### API Endpoint

- **Route**: `/api/send-feedback`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "Feature Request",
    "message": "Please add dark mode...",
    "userAgent": "Mozilla/5.0...",
    "url": "http://localhost:3000/dashboard"
  }
  ```

---

## Testing

### 1. Check Dev Server

```bash
npm run dev
```

### 2. Test Feedback Form

1. Navigate to the dashboard
2. Add the Feedback card from the Card Library
3. Fill in all fields:
   - Name
   - Email
   - Subject
   - Message
4. Click **Submit Feedback**

### 3. Verify Email Delivery

Check `researchandinsights@mecone.com.au` inbox for:
- **Subject**: [Dashboard Feedback] Your Subject
- **From**: researchandinsights@mecone.com.au
- **Reply-To**: User's email address
- **Body**: Formatted HTML with feedback details

---

## Troubleshooting

### Error: "Permission denied. Ensure Mail.Send permission is granted."

**Solution**: Admin consent not granted
1. Go to Azure Portal → App registrations → Your app
2. Click **API permissions**
3. Click **Grant admin consent** button
4. Confirm the consent

### Error: "Authentication failed. Check Microsoft OAuth credentials."

**Solution**: Invalid credentials or expired secret
1. Verify `MICROSOFT_CLIENT_ID` in `.env.local`
2. Check if `MICROSOFT_CLIENT_SECRET` is still valid
3. If expired, generate new secret in Azure Portal:
   - App registrations → Your app → Certificates & secrets
   - New client secret
   - Copy value to `.env.local`

### Error: "Failed to send feedback"

**Solution**: Check server logs for detailed error
```bash
# In terminal running dev server, look for:
[Feedback] Error sending email: <detailed error>
```

Common causes:
- Network connectivity issues
- Invalid email format
- Graph API throttling (rare)

### Email Not Received

1. **Check spam/junk folder**
2. **Verify sender email exists**:
   - Log into `researchandinsights@mecone.com.au`
   - Check "Sent Items" folder for the email
3. **Check Graph API logs** in Azure Portal:
   - Sign-ins → Filter by application
   - Look for failed authentication attempts

---

## Security Notes

### ✅ Secure Practices
- Uses OAuth 2.0 Client Credentials Flow
- No SMTP passwords stored
- Client secret stored in `.env.local` (gitignored)
- Email validation on both client and server
- Rate limiting via Graph API (150 calls/60 seconds)

### ⚠️ Important
- **Never commit** `.env.local` to git
- **Rotate secrets** periodically (every 6-12 months)
- **Grant minimal permissions** (only Mail.Send required)
- **Monitor usage** in Azure Portal for suspicious activity

---

## Alternative: SMTP with App Password (Not Recommended)

If Graph API is not available, you can use SMTP with an app-specific password:

### Steps:
1. Go to [Microsoft 365 Security](https://mysignins.microsoft.com/security-info)
2. Enable **App passwords** (if available)
3. Generate new app password
4. Add to `.env.local`:
   ```env
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   SMTP_USER=researchandinsights@mecone.com.au
   SMTP_PASSWORD=<your-app-password>
   ```

**Note**: Many organizations disable app passwords for security. Graph API is the recommended approach.

---

## Support

If you encounter issues not covered here:

1. Check Azure Portal logs for authentication failures
2. Review server console for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure admin consent was granted successfully

For Graph API issues, consult:
- [Microsoft Graph Mail Documentation](https://learn.microsoft.com/en-us/graph/api/user-sendmail)
- [Azure AD Application Permissions](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent)
