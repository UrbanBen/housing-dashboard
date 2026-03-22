/**
 * Test script to verify Microsoft Graph API permissions
 * Run with: node scripts/test-graph-api.js
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
require('isomorphic-fetch');

async function testGraphAPI() {
  console.log('\n🔍 Testing Microsoft Graph API Configuration...\n');

  // Check environment variables
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  const fromEmail = process.env.SMTP_FROM;

  console.log('✅ Environment Variables:');
  console.log(`   MICROSOFT_CLIENT_ID: ${clientId ? '✓ Set' : '✗ Missing'}`);
  console.log(`   MICROSOFT_CLIENT_SECRET: ${clientSecret ? '✓ Set' : '✗ Missing'}`);
  console.log(`   MICROSOFT_TENANT_ID: ${tenantId}`);
  console.log(`   SMTP_FROM: ${fromEmail}\n`);

  if (!clientId || !clientSecret || !fromEmail) {
    console.error('❌ Missing required environment variables!\n');
    return;
  }

  try {
    console.log('🔐 Authenticating with Azure AD...');

    const credential = new ClientSecretCredential(
      tenantId,
      clientId,
      clientSecret
    );

    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const tokenResponse = await credential.getToken(
            'https://graph.microsoft.com/.default'
          );
          return tokenResponse.token;
        }
      }
    });

    console.log('✅ Authentication successful!\n');

    // Test 1: Check if we can access the user
    console.log('📧 Testing access to mailbox...');
    try {
      const user = await client.api(`/users/${fromEmail}`).get();
      console.log(`✅ Mailbox access confirmed: ${user.displayName} (${user.mail})\n`);
    } catch (error) {
      console.log(`⚠️  Could not access mailbox: ${error.message}`);
      console.log('   (This is okay if using service principal)\n');
    }

    // Test 2: Attempt to send a test email
    console.log('📤 Testing Mail.Send permission...');

    const testMessage = {
      subject: '[Test] Graph API Permission Check',
      body: {
        contentType: 'HTML',
        content: '<p>This is a test email to verify Mail.Send permissions are working.</p>'
      },
      toRecipients: [
        {
          emailAddress: {
            address: fromEmail
          }
        }
      ]
    };

    try {
      await client
        .api(`/users/${fromEmail}/sendMail`)
        .post({
          message: testMessage,
          saveToSentItems: true
        });

      console.log('✅ Mail.Send permission is working!\n');
      console.log(`   Test email sent to ${fromEmail}`);
      console.log('   Check the inbox to confirm delivery.\n');

    } catch (error) {
      if (error.statusCode === 403) {
        console.error('❌ Mail.Send permission is NOT granted!\n');
        console.error('   Error: Permission denied (403 Forbidden)\n');
        console.error('📋 To fix this:');
        console.error('   1. Go to https://portal.azure.com/');
        console.error('   2. Navigate to: Azure Active Directory → App registrations');
        console.error(`   3. Find your app: ${clientId}`);
        console.error('   4. Click: "API permissions"');
        console.error('   5. Check if "Mail.Send" (Application) is listed');
        console.error('   6. If not listed, add it:');
        console.error('      - Click "+ Add a permission"');
        console.error('      - Select "Microsoft Graph"');
        console.error('      - Choose "Application permissions"');
        console.error('      - Search for "Mail.Send"');
        console.error('      - Click "Add permissions"');
        console.error('   7. CRITICAL: Click "Grant admin consent for [Your Org]"');
        console.error('   8. Confirm and wait for green checkmark ✅\n');
      } else if (error.statusCode === 401) {
        console.error('❌ Authentication failed!\n');
        console.error('   Error: Invalid credentials (401 Unauthorized)\n');
        console.error('   Check your MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET\n');
      } else {
        console.error(`❌ Unexpected error: ${error.message}\n`);
        console.error(`   Status Code: ${error.statusCode || 'N/A'}`);
        console.error(`   Details: ${JSON.stringify(error.body || {}, null, 2)}\n`);
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(`   ${error.message}\n`);

    if (error.message.includes('AADSTS')) {
      console.error('   This looks like an Azure AD authentication error.');
      console.error('   Check your tenant ID and credentials.\n');
    }
  }
}

// Run the test
testGraphAPI().catch(console.error);
