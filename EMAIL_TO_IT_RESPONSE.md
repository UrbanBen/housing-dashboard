# Email Response to IT - OAuth Clarification

---

**Subject:** Re: Email Configuration for Housing Dashboard - OAuth Authentication (Option 2)

---

Hi [IT Team],

Thanks for the detailed breakdown of options! I appreciate the security considerations and the forward-thinking approach.

**To clarify: I'm already using OAuth authentication (your recommended Option 2).**

I'm not requesting SMTP Basic Auth or password-based authentication. The application uses **Microsoft Graph API with OAuth 2.0 Client Credentials Flow** - this is Microsoft's modern, secure, and recommended approach for application-to-application email sending.

---

## What I've Already Implemented

**Technology Stack:**
- **Microsoft Graph API** (not SMTP)
- **OAuth 2.0 Client Credentials Flow** (no passwords stored)
- **Azure AD App Registration** (already exists)
  - Client ID: `e7cb6949-8974-48de-bc9b-d1504cb8a1a2`
  - Tenant ID: `9701b00b-1a44-45ea-b86e-f98f2278c4f8`

**How it works:**
1. Application authenticates with Azure AD using Client ID + Client Secret (OAuth token)
2. No user passwords are stored or transmitted
3. Token is obtained programmatically at runtime
4. Email is sent via Microsoft Graph API (`/users/{email}/sendMail`)
5. Emails are sent from: `researchandinsights@mecone.com.au`

**Security benefits:**
✅ No password expiration issues (OAuth token refresh is automatic)
✅ No Basic Auth deprecation concerns (uses modern OAuth 2.0)
✅ No credential exposure risk (client secret is stored securely in environment variables)
✅ Works beyond 2027 (Microsoft's recommended modern authentication)
✅ Granular permissions (only Mail.Send, nothing else)

---

## What I Need from IT

**The only thing needed is admin consent for the Graph API permission:**

**Already completed:**
- ✅ Azure AD App Registration created
- ✅ Mail.Send permission added to the app
- ✅ Application code implemented and tested

**Needs admin approval:**
- ❌ **Admin consent for Mail.Send permission** (this is the blocker)

**How to grant consent:**
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to: **Azure Active Directory** → **App registrations**
3. Search for Client ID: `e7cb6949-8974-48de-bc9b-d1504cb8a1a2`
4. Click **API permissions**
5. Click **"Grant admin consent for Mecone"** button
6. Confirm

This is a one-time action. Once granted, it doesn't expire and doesn't require password updates.

---

## Addressing Email Reputation Concerns

I understand the sensitivity around email relay and reputation. Here's how this implementation mitigates risks:

**Volume Control:**
- Feedback form only (not bulk email)
- Rate-limited by Microsoft Graph API (max 150 calls/60 seconds)
- User must fill out a form (Name, Email, Subject, Message) - prevents automated abuse
- Emails sent to: `researchandinsights@mecone.com.au` (internal feedback collection)

**Security Controls:**
- Application-only permission (no user impersonation)
- Client secret stored in `.env.local` (gitignored, not in source control)
- Server-side validation (email format, required fields)
- Logs all email sends for audit trail

**Reputation Protection:**
- Uses official Microsoft Graph API (not external SMTP relay)
- Emails originate from Microsoft's infrastructure (not our servers)
- Reply-To set to user's email (responses go to users, not our system)
- Sends only from authenticated Mecone tenant

**Use Case:**
This is solely for collecting user feedback on the Housing Insights Dashboard:
- Bug reports
- Feature requests
- General feedback
- Support inquiries

Not used for:
- Marketing emails
- Bulk communications
- External customer emails
- Automated notifications

---

## Why Not SMTP Relay (Option 3)?

While IP whitelisting could work, OAuth is superior because:

**Flexibility:**
- ❌ SMTP Relay: Only works from specific IP (limits dev/testing environments)
- ✅ OAuth: Works from anywhere (local dev, staging, production)

**Security:**
- ❌ SMTP Relay: Entire IP range can send (broader attack surface)
- ✅ OAuth: Only this specific application can send (narrow scope)

**Future-proofing:**
- ❌ SMTP Relay: Still uses SMTP protocol (older technology)
- ✅ OAuth: Modern REST API (Microsoft's strategic direction)

**Management:**
- ❌ SMTP Relay: Requires IP changes if infrastructure moves
- ✅ OAuth: Infrastructure-agnostic (no IP management)

---

## Testing Verification

Once admin consent is granted, I can immediately verify it's working:

```bash
node scripts/test-graph-api.js
```

This will:
1. Authenticate with Azure AD
2. Send a test email to `researchandinsights@mecone.com.au`
3. Confirm Mail.Send permission is active

I can also provide you with the test script if you'd like to run it yourself after granting consent.

---

## Microsoft Documentation

For reference, here are Microsoft's official docs on this approach:

- [Send mail without a user](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0)
- [Application permissions for Microsoft Graph](https://learn.microsoft.com/en-us/graph/permissions-reference#mail-permissions)
- [Client credentials flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)

---

## Summary

**Request:** Please grant admin consent for the **Mail.Send** application permission on Azure AD app `e7cb6949-8974-48de-bc9b-d1504cb8a1a2`.

**Why:** This enables secure, modern OAuth-based email sending for the Housing Dashboard feedback system.

**Risk:** Minimal - limited scope, internal use only, Microsoft-recommended approach.

**Effort:** 2 minutes (one-time click in Azure Portal).

**Alternative:** None needed - this IS the recommended secure method.

---

Let me know if you need any additional technical details or have concerns I can address!

Thanks,
**Ben Gellie**
Research & Insights
bgellie@mecone.com.au

---

## Technical Appendix (Optional)

If IT wants to review the implementation, here are the relevant files:

- **API Endpoint:** `src/app/api/send-feedback/route.ts`
- **Email Form:** `src/components/dashboard/FeedbackCard.tsx`
- **Test Script:** `scripts/test-graph-api.js`
- **Documentation:** `FEEDBACK_EMAIL_SETUP.md`

All code is in the repository if they want to audit the implementation before granting consent.
