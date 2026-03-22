import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { executeQuery } from '@/lib/db-pool';
import 'isomorphic-fetch';

// Initialize Graph client with application credentials
function getGraphClient() {
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const fromEmail = process.env.SMTP_FROM || 'researchandinsights@mecone.com.au';

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured');
  }

  const credential = new ClientSecretCredential(
    tenantId,
    clientId,
    clientSecret
  );

  return {
    client: Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const tokenResponse = await credential.getToken(
            'https://graph.microsoft.com/.default'
          );
          return tokenResponse.token;
        }
      }
    }),
    fromEmail
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to submit feedback' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subject, message, userAgent, url } = body;

    // Validate required fields
    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const userName = session.user.name || 'Unknown User';
    const userEmail = session.user.email || 'no-email@unknown.com';

    const { client, fromEmail } = getGraphClient();

    // Store in database for weekly/monthly reports
    await executeQuery(
      `INSERT INTO housing_dashboard.user_feedback
       (user_id, user_name, user_email, subject, feedback_text, user_agent, page_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [session.user.id, userName, userEmail, subject, message, userAgent || null, url || null]
    );

    // Compose email body with feedback details
    const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #22c55e; border-bottom: 2px solid #22c55e; padding-bottom: 10px;">
    New Feedback Submission
  </h2>

  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #555;">Contact Information</h3>
    <p><strong>Name:</strong> ${userName}</p>
    <p><strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
    <p><strong>User ID:</strong> ${session.user.id}</p>
  </div>

  <div style="background-color: #fff; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #555;">Subject</h3>
    <p>${subject}</p>
  </div>

  <div style="background-color: #fff; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #555;">Message</h3>
    <p style="white-space: pre-wrap;">${message}</p>
  </div>

  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 30px; font-size: 12px; color: #666;">
    <h4 style="margin-top: 0;">Technical Details</h4>
    <p><strong>Submitted from:</strong> ${url || 'N/A'}</p>
    <p><strong>User Agent:</strong> ${userAgent || 'N/A'}</p>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
  </div>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

  <p style="font-size: 12px; color: #999;">
    This is an automated message from the Housing Insights Dashboard feedback system.
  </p>
</body>
</html>
    `.trim();

    // Send email via Microsoft Graph API
    const emailMessage = {
      subject: `[Dashboard Feedback] ${subject}`,
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
      },
      replyTo: [
        {
          emailAddress: {
            address: userEmail,
            name: userName
          }
        }
      ]
    };

    await client
      .api(`/users/${fromEmail}/sendMail`)
      .post({
        message: emailMessage,
        saveToSentItems: true
      });

    console.log(`[Feedback] Email sent successfully from ${userEmail} (User ID: ${session.user.id})`);

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback sent successfully'
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Feedback] Error sending email:', error);

    // Handle specific Graph API errors
    if (error.statusCode === 401) {
      return NextResponse.json(
        { error: 'Authentication failed. Check Microsoft OAuth credentials.' },
        { status: 500 }
      );
    }

    if (error.statusCode === 403) {
      return NextResponse.json(
        { error: 'Permission denied. Ensure Mail.Send permission is granted.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to send feedback',
        details: error.message
      },
      { status: 500 }
    );
  }
}
