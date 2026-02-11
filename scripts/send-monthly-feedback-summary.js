const { Client } = require('pg');
const nodemailer = require('nodemailer');
const Anthropic = require('@anthropic-ai/sdk').default;
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function getLastMonthFeedback() {
  const client = new Client({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'mosaic_readonly',
    password: process.env.DB_READONLY_PASSWORD || fs.readFileSync('/users/ben/permissions/.env.readonly', 'utf8').trim(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    const result = await client.query(`
      SELECT
        id,
        user_email,
        user_name,
        feedback_text,
        category,
        priority,
        ai_summary,
        selected_lga,
        created_at,
        status
      FROM housing_dashboard.user_feedback
      WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        AND created_at < DATE_TRUNC('month', NOW())
        AND (included_in_monthly_summary IS FALSE OR included_in_monthly_summary IS NULL)
      ORDER BY priority DESC, created_at DESC
    `);

    return result.rows;
  } finally {
    await client.end();
  }
}

async function generateMonthlySummary(feedbackItems) {
  if (feedbackItems.length === 0) {
    return {
      executiveSummary: 'No feedback received this month.',
      keyInsights: [],
      trends: 'No trends to report.',
      recommendations: 'Continue monitoring user feedback.'
    };
  }

  try {
    const feedbackSummary = feedbackItems.map((item, idx) => `
${idx + 1}. [${item.priority}] ${item.category}
   Summary: ${item.ai_summary}
   User: ${item.user_name || 'Anonymous'} (${item.user_email || 'N/A'})
   Date: ${new Date(item.created_at).toLocaleDateString('en-AU')}
   Full text: ${item.feedback_text.substring(0, 200)}${item.feedback_text.length > 200 ? '...' : ''}
`).join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Analyze this month's user feedback for a housing insights dashboard and provide:

1. Executive Summary (2-3 sentences overview)
2. Key Insights (3-5 bullet points of the most important themes)
3. Trends (patterns, recurring issues, common requests)
4. Recommendations (actionable next steps for the development team)

Total feedback items: ${feedbackItems.length}

Breakdown by category:
${Object.entries(feedbackItems.reduce((acc, item) => {
  acc[item.category] = (acc[item.category] || 0) + 1;
  return acc;
}, {})).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}

Breakdown by priority:
${Object.entries(feedbackItems.reduce((acc, item) => {
  acc[item.priority] = (acc[item.priority] || 0) + 1;
  return acc;
}, {})).map(([pri, count]) => `- ${pri}: ${count}`).join('\n')}

Feedback details:
${feedbackSummary}

Respond in this exact JSON format:
{
  "executiveSummary": "...",
  "keyInsights": ["...", "...", "..."],
  "trends": "...",
  "recommendations": "..."
}`
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating summary with Claude:', error);
    return {
      executiveSummary: `Received ${feedbackItems.length} feedback items this month.`,
      keyInsights: ['Unable to generate AI insights'],
      trends: 'Analysis unavailable',
      recommendations: 'Manual review required'
    };
  }
}

async function sendMonthlySummaryEmail(feedbackItems, aiSummary) {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const monthName = lastMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  const categoryBreakdown = feedbackItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const priorityBreakdown = feedbackItems.reduce((acc, item) => {
    acc[item.priority] = (acc[item.priority] || 0) + 1;
    return acc;
  }, {});

  const emailSubject = `Monthly Feedback Summary - ${monthName} (${feedbackItems.length} items)`;

  const emailBody = `
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h1 style="color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 10px;">
      Monthly Feedback Summary - ${monthName}
    </h1>

    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h2 style="margin-top: 0; color: #1e40af;">📊 Overview</h2>
      <p style="font-size: 18px;"><strong>Total Feedback Items:</strong> ${feedbackItems.length}</p>
    </div>

    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
      <h2 style="margin-top: 0; color: #15803d;">🤖 AI Executive Summary</h2>
      <p style="font-size: 16px;">${aiSummary.executiveSummary}</p>
    </div>

    <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #eab308;">
      <h2 style="margin-top: 0; color: #a16207;">💡 Key Insights</h2>
      <ul style="font-size: 15px;">
        ${aiSummary.keyInsights.map(insight => `<li>${insight}</li>`).join('')}
      </ul>
    </div>

    <div style="background: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #a855f7;">
      <h2 style="margin-top: 0; color: #7e22ce;">📈 Trends & Patterns</h2>
      <p style="font-size: 15px;">${aiSummary.trends}</p>
    </div>

    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
      <h2 style="margin-top: 0; color: #c2410c;">🎯 Recommendations</h2>
      <p style="font-size: 15px;">${aiSummary.recommendations}</p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
      <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #1f2937;">Category Breakdown</h3>
        <ul style="list-style: none; padding: 0;">
          ${Object.entries(categoryBreakdown)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => `<li style="padding: 5px 0;">
              <span style="background: #dbeafe; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${count}</span>
              ${cat}
            </li>`).join('')}
        </ul>
      </div>

      <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #1f2937;">Priority Breakdown</h3>
        <ul style="list-style: none; padding: 0;">
          ${Object.entries(priorityBreakdown)
            .sort((a, b) => {
              const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
              return order[a[0]] - order[b[0]];
            })
            .map(([pri, count]) => `<li style="padding: 5px 0;">
              <span style="background: ${
                pri === 'Critical' ? '#fee2e2' :
                pri === 'High' ? '#fed7aa' :
                pri === 'Medium' ? '#fef3c7' : '#dbeafe'
              }; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${count}</span>
              ${pri}
            </li>`).join('')}
        </ul>
      </div>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h2 style="margin-top: 0; color: #1f2937;">📝 All Feedback Items</h2>
      ${feedbackItems.map((item, idx) => `
        <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${
          item.priority === 'Critical' ? '#ef4444' :
          item.priority === 'High' ? '#f97316' :
          item.priority === 'Medium' ? '#eab308' : '#3b82f6'
        };">
          <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <span style="background: ${
              item.priority === 'Critical' ? '#fee2e2' :
              item.priority === 'High' ? '#fed7aa' :
              item.priority === 'Medium' ? '#fef3c7' : '#dbeafe'
            }; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${item.priority}</span>
            <span style="background: #e0e7ff; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${item.category}</span>
          </div>
          <p style="margin: 10px 0;"><strong>Summary:</strong> ${item.ai_summary}</p>
          <p style="margin: 10px 0; white-space: pre-wrap; background: white; padding: 10px; border-radius: 4px;">${item.feedback_text}</p>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; margin-top: 10px;">
            <span><strong>User:</strong> ${item.user_name || 'Anonymous'} (${item.user_email || 'N/A'})</span>
            <span><strong>Date:</strong> ${new Date(item.created_at).toLocaleDateString('en-AU')}</span>
          </div>
          ${item.selected_lga ? `<div style="font-size: 12px; color: #6b7280; margin-top: 5px;"><strong>LGA:</strong> ${item.selected_lga}</div>` : ''}
        </div>
      `).join('')}
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #6b7280; font-size: 12px;">
      This summary was automatically generated by Claude AI on ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}.<br>
      All feedback has been marked as included in this monthly summary.
    </p>
  </body>
</html>
`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: 'bgellie@mecone.com.au',
    subject: emailSubject,
    html: emailBody,
  });
}

async function markFeedbackAsSummarized(feedbackIds) {
  const client = new Client({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: process.env.DB_ADMIN_PASSWORD || fs.readFileSync('/users/ben/permissions/.env.admin', 'utf8').trim(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    await client.query(`
      UPDATE housing_dashboard.user_feedback
      SET included_in_monthly_summary = TRUE,
          monthly_summary_date = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
      WHERE id = ANY($1::int[])
    `, [feedbackIds]);

    console.log(`✓ Marked ${feedbackIds.length} feedback items as summarized`);
  } finally {
    await client.end();
  }
}

async function sendMonthlySummary() {
  console.log('🚀 Starting monthly feedback summary generation...\n');

  try {
    // Get last month's feedback
    console.log('📊 Fetching feedback from last month...');
    const feedbackItems = await getLastMonthFeedback();
    console.log(`✓ Found ${feedbackItems.length} feedback items\n`);

    if (feedbackItems.length === 0) {
      console.log('ℹ️  No feedback to summarize. Exiting.');
      return;
    }

    // Generate AI summary
    console.log('🤖 Generating AI summary with Claude...');
    const aiSummary = await generateMonthlySummary(feedbackItems);
    console.log('✓ AI summary generated\n');

    // Send email
    console.log('📧 Sending monthly summary email...');
    await sendMonthlySummaryEmail(feedbackItems, aiSummary);
    console.log('✓ Email sent successfully\n');

    // Mark feedback as summarized
    console.log('💾 Marking feedback as included in summary...');
    const feedbackIds = feedbackItems.map(item => item.id);
    await markFeedbackAsSummarized(feedbackIds);

    console.log('\n✅ Monthly feedback summary completed successfully!');
  } catch (error) {
    console.error('❌ Error generating monthly summary:', error);
    process.exit(1);
  }
}

sendMonthlySummary();
