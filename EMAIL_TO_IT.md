# Email to IT - Azure AD Permission Request

---

**Subject:** Request: Grant Admin Consent for Azure AD App - Housing Insights Dashboard

---

Hi IT Team,

I'm working on the Housing Insights Dashboard and need admin consent granted for an Azure AD app registration to enable the feedback email system.

**What I need:**

Please grant admin consent for the **Mail.Send** permission on our Azure AD application.

**App Details:**
- **Application Name:** Housing Insights Dashboard (or check by Client ID below)
- **Client ID:** `e7cb6949-8974-48de-bc9b-d1504cb8a1a2`
- **Tenant ID:** `9701b00b-1a44-45ea-b86e-f98f2278c4f8`

**Permission Required:**
- **API:** Microsoft Graph
- **Permission Name:** Mail.Send
- **Type:** Application permission (not delegated)

**Why it's needed:**

The dashboard includes a feedback form that sends emails from `researchandinsights@mecone.com.au` to collect user feedback, bug reports, and feature requests. This uses Microsoft Graph API for secure email delivery without requiring SMTP passwords.

**Steps to grant consent:**

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to: **Azure Active Directory** → **App registrations**
3. Search for Client ID: `e7cb6949-8974-48de-bc9b-d1504cb8a1a2`
4. Click **API permissions** (left sidebar)
5. You should see **Mail.Send** listed (I've already added it)
6. Click the **"Grant admin consent for [Mecone]"** button
7. Confirm by clicking **Yes**
8. Verify the Status column shows a green checkmark ✅

**Testing:**

Once consent is granted, I can verify it's working by running:
```
node scripts/test-graph-api.js
```

Let me know if you need any additional information or have questions about this request.

Thanks!

**Ben Gellie**
Research & Insights
bgellie@mecone.com.au

---

**Attachments:**
- See `FEEDBACK_EMAIL_SETUP.md` for complete technical documentation (if needed)
