import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Get unread messages
export async function getUnreadMessages() {
  try {
    // The current Gmail integration scopes only support:
    // - Sending emails (gmail.send)
    // - Gmail add-on specific actions (addon scopes)
    // 
    // Reading messages requires 'gmail.readonly' scope which is not available.
    // Return an informative message instead of trying to fetch messages.
    
    throw new Error(
      'Reading emails is not available with the current Gmail integration permissions. ' +
      'The integration is configured for sending emails only. ' +
      'To read emails, the Gmail connection would need to be reconfigured with additional permissions.'
    );
  } catch (error) {
    console.error('Error fetching unread messages:', error);
    throw error;
  }
}

// Send an email
export async function sendEmail(to: string, subject: string, body: string) {
  try {
    const gmail = await getUncachableGmailClient();
    
    // Create email content
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');

    // Encode email to base64
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    return {
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}