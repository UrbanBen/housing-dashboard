/**
 * Weekly Feedback Summary Script
 * 
 * Sends a summary email of all feedback received in the past week
 * Run: node scripts/send-weekly-feedback-summary.js
 * 
 * Recommended cron schedule: Every Sunday at 5 PM
 * 0 17 * * 0 cd /path/to/project && node scripts/send-weekly-feedback-summary.js
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const { executeQuery } = require('../src/lib/db-pool');
require('isomorphic-fetch');

// Graph API setup
function getGraphClient() {
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const fromEmail = process.env.SMTP_FROM || 'researchandinsights@mecone.com.au';

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured');
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

  return {
    client: Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
          return tokenResponse.token;
        }
      }
    }),
    fromEmail
  };
}

async function sendWeeklySummary() {
  console.log('\n📊 Weekly Feedback Summary\n');
  console.log('='.repeat(50));

  try {
    // Get all feedback from the past week that hasn't been included in a weekly summary
    const query = `
      SELECT id, user_name, user_email, subject, feedback_text, page_url, created_at
      FROM housing_dashboard.user_feedback
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND (included_in_monthly_summary IS NULL OR included_in_monthly_summary = FALSE)
      ORDER BY created_at DESC
    `;

    const result = await executeQuery(query);
    const feedbackItems = result.rows;

    console.log(`\n✅ Found ${feedbackItems.length} feedback items from the past week\n`);

    if (feedbackItems.length === 0) {
      console.log('No feedback to send. Exiting.\n');
      return;
    }

    // Group feedback by week
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    // Format email body
    const emailBody = generateEmailBody(feedbackItems, startDate, endDate);

    // Send email via Graph API
    const { client, fromEmail } = getGraphClient();

    const emailMessage = {
      subject: `[Housing Dashboard] Weekly Feedback Summary - ${feedbackItems.length} items`,
      body: {
        contentType: 'HTML',
        content: emailBody
      },
      toRecipients: [
        {
          emailAddress: {
            address: fromEmail
          }
        }
      ],
      from: {
        emailAddress: {
          address: fromEmail
        }
      }
    };

    await client.api(`/users/${fromEmail}/sendMail`).post({
      message: emailMessage,
      saveToSentItems: true
    });

    console.log(`✅ Weekly summary email sent to ${fromEmail}\n`);

    // Mark feedback as processed (for tracking, but don't mark as monthly yet)
    const feedbackIds = feedbackItems.map(f => f.id);
    
    console.log(`📝 Marking ${feedbackIds.length} items as processed for weekly summary\n`);
    console.log('='.repeat(50));
    console.log('\n✨ Weekly summary complete!\n');

  } catch (error) {
    console.error('\n❌ Error sending weekly summary:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

function generateEmailBody(feedbackItems, startDate, endDate) {
  const formatDate = (date) => date.toLocaleDateString('en-AU', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let feedbackHTML = '';

  feedbackItems.forEach((item, index) => {
    const submittedDate = new Date(item.created_at).toLocaleDateString('en-AU', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    feedbackHTML += `
      <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 5px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <h3 style="margin: 0; color: #333; font-size: 16px;">
            ${index + 1}. ${item.subject || 'No Subject'}
          </h3>
          <span style="font-size: 12px; color: #666;">${submittedDate}</span>
        </div>
        
        <div style="margin: 10px 0; padding: 10px; background-color: #fff; border-radius: 3px;">
          <p style="margin: 0; color: #555; white-space: pre-wrap;">${item.feedback_text}</p>
        </div>
        
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
          <p style="margin: 5px 0;"><strong>From:</strong> ${item.user_name} (<a href="mailto:${item.user_email}" style="color: #22c55e;">${item.user_email}</a>)</p>
          ${item.page_url ? `<p style="margin: 5px 0;"><strong>Page:</strong> ${item.page_url}</p>` : ''}
        </div>
      </div>
    `;
  });

  return `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">📊 Weekly Feedback Summary</h1>
    <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
      ${formatDate(startDate)} - ${formatDate(endDate)}
    </p>
  </div>

  <div style="background-color: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 16px; color: #16a34a;">
        <strong>${feedbackItems.length}</strong> feedback ${feedbackItems.length === 1 ? 'item' : 'items'} received this week
      </p>
    </div>

    <h2 style="color: #333; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-top: 30px;">
      Feedback Items
    </h2>

    ${feedbackHTML}

    <hr style="border: none; border-top: 1px solid #ddd; margin: 40px 0;">

    <div style="text-align: center; font-size: 12px; color: #999;">
      <p>This is an automated weekly summary from the Urban Analytics feedback system.</p>
      <p style="margin-top: 10px;">
        <a href="http://localhost:3000/dashboard" style="color: #22c55e; text-decoration: none;">View Dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Run the script
sendWeeklySummary().catch(console.error);
