# User Feedback System

## Overview

The Housing Insights Dashboard includes an intelligent feedback system that collects, analyzes, and prioritizes user feedback using Claude AI. Feedback is automatically categorized, prioritized, and sent to the development team, with monthly summary reports for comprehensive review.

---

## System Architecture

```
┌─────────────────┐
│  User Interface │
│  FeedbackCard   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     API Endpoint                    │
│  /api/feedback (POST)               │
│  ┌───────────────────────────────┐  │
│  │ 1. Collect user & context     │  │
│  │ 2. Analyze with Claude AI     │  │
│  │ 3. Store in database          │  │
│  │ 4. Send immediate email       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  PostgreSQL Database                │
│  housing_dashboard.user_feedback    │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Monthly Summary Script (Cron)      │
│  ┌───────────────────────────────┐  │
│  │ 1. Aggregate last month       │  │
│  │ 2. Generate AI insights       │  │
│  │ 3. Send summary email         │  │
│  │ 4. Mark as summarized         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## Features

### 1. **Immediate Feedback Processing**

When a user submits feedback:

1. **User Context Capture**
   - User name, email, ID (from NextAuth session)
   - Timestamp (ISO format with timezone)
   - Page URL where feedback was submitted
   - Selected LGA (if any)
   - User agent (browser/device info)
   - IP address (for location context)

2. **AI Analysis (Claude 3.5 Sonnet)**
   - **Category**: Bug Report, Feature Request, UX Improvement, Data Issue, Performance, Documentation, General Feedback
   - **Priority**: Critical, High, Medium, Low
   - **Summary**: Concise 100-character summary for quick review

3. **Database Storage**
   - All feedback stored in `housing_dashboard.user_feedback`
   - Indexed for fast querying and analysis
   - Tracks status and processing workflow

4. **Immediate Email Notification**
   - **To**: bgellie@mecone.com.au
   - **Subject**: `[Priority] [Category] Summary`
   - **Body**: Full feedback + AI analysis + user/context info
   - **Format**: HTML with color-coded priority badges

### 2. **Monthly Summary Reports**

Automated monthly aggregation and insights:

1. **Data Aggregation**
   - Collects all feedback from previous calendar month
   - Excludes items already included in prior summaries
   - Sorts by priority and date

2. **AI-Generated Insights**
   - Executive summary (2-3 sentences)
   - Key insights (3-5 bullet points)
   - Trends and patterns analysis
   - Actionable recommendations for development team

3. **Comprehensive Email Report**
   - Overview statistics and breakdowns
   - AI executive summary and insights
   - Category and priority distributions
   - Full details of all feedback items
   - Color-coded by priority

4. **Tracking**
   - Marks all feedback as "included in monthly summary"
   - Records summary date for auditing
   - Prevents duplicate inclusion

---

## Database Schema

### Table: `housing_dashboard.user_feedback`

```sql
CREATE TABLE housing_dashboard.user_feedback (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- User Information (from NextAuth)
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  user_id VARCHAR(255),

  -- Feedback Content
  feedback_text TEXT NOT NULL,

  -- AI Analysis (Claude-generated)
  category VARCHAR(100),      -- AI-categorized
  priority VARCHAR(50),       -- AI-prioritized
  ai_summary TEXT,            -- AI-generated summary

  -- Context Information
  page_url TEXT,              -- Where feedback was submitted
  user_agent TEXT,            -- Browser/device info
  ip_address INET,            -- User IP for location
  browser_location JSONB,     -- Future: geo coordinates
  selected_lga VARCHAR(255),  -- Current LGA context

  -- Processing Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  email_sent_at TIMESTAMP,
  included_in_monthly_summary BOOLEAN DEFAULT FALSE,
  monthly_summary_date DATE,

  -- Status Tracking
  status VARCHAR(50) DEFAULT 'new',  -- new, acknowledged, in_progress, resolved
  admin_notes TEXT
);
```

**Indexes:**
- `idx_feedback_created_at` - Fast date range queries
- `idx_feedback_category` - Filter by category
- `idx_feedback_priority` - Filter by priority
- `idx_feedback_status` - Filter by status
- `idx_feedback_monthly_summary` - Monthly aggregation
- `idx_feedback_user_email` - User feedback history

---

## Setup Instructions

### Prerequisites

1. **Node.js Dependencies**
   ```bash
   npm install @anthropic-ai/sdk nodemailer
   ```

2. **Environment Variables** (add to `.env.local`)
   ```env
   # Anthropic API
   ANTHROPIC_API_KEY=sk-ant-api03-xxx

   # SMTP Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_FROM=your-email@gmail.com

   # Database (already configured)
   DB_ADMIN_PASSWORD=your-admin-password
   DB_READONLY_PASSWORD=your-readonly-password
   ```

3. **Database Permissions**
   - Ensure `mosaic_readonly` has SELECT, INSERT, UPDATE on `user_feedback`
   - Ensure `db_admin` has full permissions

### Installation Steps

#### 1. Create Database Table

```bash
# Create the feedback table
node scripts/create-feedback-table.js
```

**Expected Output:**
```
✓ Connected to research&insights database
📋 Creating user_feedback table...
✓ Table created successfully
✓ Table verified
```

#### 2. Integrate Feedback Card into Dashboard

Add to `src/components/dashboard/DraggableCard.tsx`:

```typescript
import { FeedbackCard } from './FeedbackCard';

// In renderCardContent():
case 'feedback':
  return <FeedbackCard selectedLGA={selectedLGA} />;
```

Add to `src/components/dashboard/AdminToolbar.tsx`:

```typescript
{
  id: 'feedback',
  title: 'User Feedback',
  category: 'data',
  icon: MessageSquare,
  description: 'Collect user feedback and suggestions'
}
```

#### 3. Set Up Monthly Summary Cron Job

```bash
# Make script executable
chmod +x scripts/setup-feedback-cron.sh

# Run setup script
./scripts/setup-feedback-cron.sh
```

**Expected Output:**
```
✓ Feedback summary cron job added successfully

Schedule: 1st of each month at 9:00 AM
Script: /Users/ben/Dashboard/scripts/send-monthly-feedback-summary.js
Logs: /Users/ben/.local/log/feedback-summary.log
```

#### 4. Test the System

**Test Immediate Feedback:**
1. Open dashboard
2. Add Feedback card from Card Library
3. Submit test feedback
4. Check email at bgellie@mecone.com.au
5. Verify database entry:
   ```sql
   SELECT * FROM housing_dashboard.user_feedback ORDER BY created_at DESC LIMIT 1;
   ```

**Test Monthly Summary (Manual):**
```bash
node scripts/send-monthly-feedback-summary.js
```

---

## Email Configuration Options

### Option 1: Gmail with App Password (Recommended)

1. Enable 2-Factor Authentication on Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use in `.env.local`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

### Option 2: Microsoft 365 / Outlook

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@mecone.com.au
SMTP_PASSWORD=your-password
```

### Option 3: SendGrid (High Volume)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

---

## AI Analysis Categories

### Categories

| Category | Description | Example |
|----------|-------------|---------|
| **Bug Report** | System errors, crashes, broken features | "The map doesn't load when I select Sydney" |
| **Feature Request** | New functionality suggestions | "Can we add a compare mode for two LGAs?" |
| **UX Improvement** | Interface, usability, design feedback | "The text is too small on mobile devices" |
| **Data Issue** | Incorrect, missing, or outdated data | "Population data for Parramatta seems wrong" |
| **Performance** | Slow loading, lag, timeout issues | "Dashboard takes 30 seconds to load" |
| **Documentation** | Help, guides, unclear instructions | "I don't understand what 'accord target' means" |
| **General Feedback** | Praise, general comments | "Love the new color scheme!" |

### Priorities

| Priority | Definition | Response Time |
|----------|-----------|---------------|
| **Critical** | System broken, blocking users | Immediate (same day) |
| **High** | Major functionality impaired | 2-3 days |
| **Medium** | Important but not blocking | 1-2 weeks |
| **Low** | Nice to have, minor issues | When resources available |

---

## Monthly Summary Schedule

**Cron Schedule:** `0 9 1 * *` (1st of each month at 9:00 AM)

**Process:**
1. Runs automatically on 1st day of month
2. Aggregates all feedback from previous calendar month
3. Generates AI insights with Claude
4. Sends comprehensive email to bgellie@mecone.com.au
5. Marks all feedback as "included in monthly summary"

**Manual Execution:**
```bash
node scripts/send-monthly-feedback-summary.js
```

**View Logs:**
```bash
tail -f ~/.local/log/feedback-summary.log
```

---

## Data Privacy & Security

### User Data Collection

- **Minimal Collection**: Only essential context for debugging
- **Session-Based**: Uses existing NextAuth authentication
- **No PII**: No passwords, payment info, or sensitive data
- **IP Anonymization**: Consider anonymizing IP after 30 days

### Database Security

- **Access Control**: Read-only for API, admin for scripts
- **Encryption**: SSL/TLS for all database connections
- **Backups**: Regular Azure automated backups
- **Retention**: Consider purging old feedback after 2 years

### Email Security

- **TLS Encryption**: All SMTP connections use TLS
- **App Passwords**: Never use main account passwords
- **Access Logs**: SMTP service maintains delivery logs

---

## Monitoring & Maintenance

### Daily Checks

- Monitor `~/.local/log/feedback-summary.log`
- Check for failed email deliveries
- Review new feedback in database

### Monthly Tasks

- Verify monthly summary email received
- Review AI categorization accuracy
- Adjust categories/priorities if needed
- Archive or resolve old feedback

### Quarterly Reviews

- Analyze feedback trends
- Update AI prompts for better categorization
- Review and optimize database indexes
- Audit retention and privacy compliance

---

## Troubleshooting

### Issue: Emails Not Sending

**Check:**
1. Verify SMTP credentials in `.env.local`
2. Check SMTP server logs: `tail -f ~/.local/log/feedback-summary.log`
3. Test SMTP connection:
   ```bash
   node -e "require('nodemailer').createTransport({host:'smtp.gmail.com',port:587,auth:{user:'email',pass:'pass'}}).verify((e,s)=>console.log(e||'OK'))"
   ```

**Solutions:**
- Gmail: Ensure App Password is generated (not regular password)
- Check firewall allows outbound port 587
- Verify email address is correct in script

### Issue: Claude AI Analysis Failing

**Check:**
1. Verify `ANTHROPIC_API_KEY` in `.env.local`
2. Check API quota: https://console.anthropic.com/
3. Review error logs in console

**Fallback:**
- System automatically falls back to basic categorization
- Feedback still saved and emailed without AI analysis

### Issue: Database Connection Errors

**Check:**
1. Verify database credentials
2. Check SSL certificate validity
3. Test connection: `node scripts/create-feedback-table.js`

**Solutions:**
- Regenerate SSL certificates if expired
- Verify firewall allows Azure database port
- Check database permissions for user

### Issue: Monthly Summary Not Running

**Check:**
1. Verify cron job: `crontab -l | grep feedback`
2. Check logs: `tail -f ~/.local/log/feedback-summary.log`
3. Test manually: `node scripts/send-monthly-feedback-summary.js`

**Solutions:**
- Re-run setup: `./scripts/setup-feedback-cron.sh`
- Ensure node path is correct in cron: `which node`
- Check cron service is running: `ps aux | grep cron`

---

## Future Enhancements

### Planned Features

1. **Admin Dashboard**
   - View all feedback in dashboard UI
   - Mark as resolved/acknowledged
   - Add admin notes
   - Filter by category/priority/status

2. **User Feedback History**
   - Show user their past feedback
   - Status updates ("We fixed this!")
   - Upvote/comment on others' feedback

3. **Advanced Analytics**
   - Sentiment analysis
   - Topic clustering
   - User engagement metrics
   - Feature request voting

4. **Integrations**
   - Slack notifications for critical issues
   - Jira/Linear ticket creation
   - GitHub issue auto-creation
   - Webhook for external systems

5. **Smart Routing**
   - Auto-assign to team members
   - Escalation rules for critical bugs
   - Integration with on-call rotation

---

## Files Created

### Database
- `database/create-feedback-table.sql` - Table schema
- `scripts/create-feedback-table.js` - Table creation script

### Frontend
- `src/components/dashboard/FeedbackCard.tsx` - User feedback form

### Backend
- `src/app/api/feedback/route.ts` - API endpoint for submissions

### Automation
- `scripts/send-monthly-feedback-summary.js` - Monthly summary generator
- `scripts/setup-feedback-cron.sh` - Cron job setup

### Documentation
- `FEEDBACK_SYSTEM.md` - This file (complete system docs)

---

## Support

For issues or questions about the feedback system:
- **Technical**: Review logs in `~/.local/log/feedback-summary.log`
- **Email**: bgellie@mecone.com.au
- **System Status**: Check database and SMTP service health

---

## Changelog

### v1.0.0 (2026-02-06)
- ✅ Initial feedback system implementation
- ✅ Claude AI categorization and prioritization
- ✅ Immediate email notifications
- ✅ Monthly summary reports
- ✅ Database schema and indexing
- ✅ Automated cron job setup
- ✅ Comprehensive documentation
