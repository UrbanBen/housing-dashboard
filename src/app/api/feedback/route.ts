import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import Anthropic from '@anthropic-ai/sdk';
import nodemailer from 'nodemailer';
import { executeQuery, getAdminPool } from '@/lib/db-pool';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface FeedbackAnalysis {
  category: string;
  priority: string;
  summary: string;
}

async function analyzeFeedbackWithClaude(feedbackText: string): Promise<FeedbackAnalysis> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analyze this user feedback for a housing insights dashboard and provide:
1. Category (one of: Bug Report, Feature Request, UX Improvement, Data Issue, Performance, Documentation, General Feedback)
2. Priority (one of: Critical, High, Medium, Low)
3. A concise summary (max 100 characters)

Feedback: "${feedbackText}"

Respond in this exact JSON format:
{
  "category": "...",
  "priority": "...",
  "summary": "..."
}`
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      category: analysis.category || 'General Feedback',
      priority: analysis.priority || 'Medium',
      summary: analysis.summary || feedbackText.substring(0, 100)
    };
  } catch (error) {
    console.error('Error analyzing feedback with Claude:', error);
    return {
      category: 'General Feedback',
      priority: 'Medium',
      summary: feedbackText.substring(0, 100)
    };
  }
}

async function sendFeedbackEmail(
  feedbackText: string,
  analysis: FeedbackAnalysis,
  userInfo: any,
  contextInfo: any
): Promise<void> {
  const emailSubject = `[${analysis.priority}] [${analysis.category}] ${analysis.summary}`;

  const emailBody = `
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #4f46e5;">New User Feedback Received</h2>

    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1f2937;">Feedback Details</h3>
      <p><strong>Category:</strong> <span style="background: #dbeafe; padding: 2px 8px; border-radius: 4px;">${analysis.category}</span></p>
      <p><strong>Priority:</strong> <span style="background: ${
        analysis.priority === 'Critical' ? '#fee2e2' :
        analysis.priority === 'High' ? '#fed7aa' :
        analysis.priority === 'Medium' ? '#fef3c7' : '#dbeafe'
      }; padding: 2px 8px; border-radius: 4px;">${analysis.priority}</span></p>
      <p><strong>AI Summary:</strong> ${analysis.summary}</p>
    </div>

    <div style="background: white; padding: 15px; border-left: 4px solid #4f46e5; margin: 20px 0;">
      <h4 style="margin-top: 0;">Full Feedback:</h4>
      <p style="white-space: pre-wrap;">${feedbackText}</p>
    </div>

    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1f2937;">User Information</h3>
      <p><strong>Name:</strong> ${userInfo.name || 'Anonymous'}</p>
      <p><strong>Email:</strong> ${userInfo.email || 'Not provided'}</p>
      <p><strong>User ID:</strong> ${userInfo.id || 'N/A'}</p>
    </div>

    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1f2937;">Context Information</h3>
      <p><strong>Time:</strong> ${new Date(contextInfo.timestamp).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>
      <p><strong>Page:</strong> <a href="${contextInfo.pageUrl}">${contextInfo.pageUrl}</a></p>
      <p><strong>Selected LGA:</strong> ${contextInfo.selectedLGA || 'None'}</p>
      <p><strong>User Agent:</strong> ${contextInfo.userAgent}</p>
      <p><strong>IP Address:</strong> ${contextInfo.ipAddress || 'N/A'}</p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #6b7280; font-size: 12px;">
      This feedback was automatically analyzed and categorized by Claude AI.<br>
      View all feedback in the dashboard admin panel.
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

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);

    // Parse request body
    const body = await request.json();
    const { feedback, selectedLGA, pageUrl, userAgent, timestamp } = body;

    if (!feedback || !feedback.trim()) {
      return NextResponse.json(
        { error: 'Feedback text is required' },
        { status: 400 }
      );
    }

    // Get IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || null;

    // Analyze feedback with Claude
    console.log('📝 Analyzing feedback with Claude...');
    const analysis = await analyzeFeedbackWithClaude(feedback);
    console.log('✓ Analysis complete:', analysis);

    // User information
    const userInfo = {
      email: session?.user?.email || null,
      name: session?.user?.name || null,
      id: session?.user?.id || null,
    };

    // Context information
    const contextInfo = {
      timestamp,
      pageUrl,
      selectedLGA,
      userAgent,
      ipAddress,
    };

    // Store feedback in database
    console.log('💾 Storing feedback in database...');
    const pool = getAdminPool();
    await executeQuery(
      pool,
      `INSERT INTO housing_dashboard.user_feedback (
        user_email, user_name, user_id,
        feedback_text, category, priority, ai_summary,
        page_url, user_agent, ip_address, selected_lga,
        created_at, processed_at, email_sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW())`,
      [
        userInfo.email,
        userInfo.name,
        userInfo.id,
        feedback,
        analysis.category,
        analysis.priority,
        analysis.summary,
        pageUrl,
        userAgent,
        ipAddress,
        selectedLGA,
      ]
    );
    console.log('✓ Feedback stored');

    // Send immediate email
    console.log('📧 Sending email notification...');
    await sendFeedbackEmail(feedback, analysis, userInfo, contextInfo);
    console.log('✓ Email sent');

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      analysis
    });

  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
