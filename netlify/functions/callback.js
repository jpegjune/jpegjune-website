// Netlify Function: /netlify/functions/callback
// Handles the callback from GitHub, exchanges code for token

const https = require('https');
const querystring = require('querystring');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// Helper function to parse cookies from request headers
function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.match(/(.*?)=(.*)$/);
      if (parts) {
        cookies[parts[1].trim()] = (parts[2] || '').trim();
      }
    });
  }
  return cookies;
}

exports.handler = async (event, context) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return { statusCode: 500, body: 'GitHub OAuth environment variables not set.' };
  }

  const { code, state } = event.queryStringParameters;
  const cookies = parseCookies(event.headers.cookie);
  const expectedState = cookies['csrf_state'];

  // --- State Verification ---
  if (!state || !expectedState || state !== expectedState) {
    console.error('State mismatch error:', { received: state, expected: expectedState });
    return { statusCode: 401, body: 'Authentication error: State mismatch. Please try logging in again.' };
  }

  // State matches, proceed to exchange code for token
  const postData = querystring.stringify({
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
    code: code,
  });

  const tokenPromise = new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'github.com',
      port: 443,
      path: '/login/oauth/access_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json', // Request JSON response
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const responseJson = JSON.parse(responseBody);
          if (res.statusCode === 200 && responseJson.access_token) {
            resolve(responseJson.access_token);
          } else {
            console.error('GitHub token exchange error:', responseBody);
            reject(new Error(`GitHub error: ${responseJson.error_description || responseBody}`));
          }
        } catch (e) {
          console.error('Error parsing GitHub response:', e);
          reject(new Error('Failed to parse GitHub response.'));
        }
      });
    });
    req.on('error', (e) => {
      console.error('Error requesting GitHub token:', e);
      reject(new Error('Network error during token exchange.'));
    });
    req.write(postData);
    req.end();
  });

  try {
    const accessToken = await tokenPromise;

    // --- Success: Send token back to CMS window ---
    const responseHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body>
        <script>
          // Send token to the parent window (the CMS)
          if (window.opener) {
            window.opener.postMessage(
              'authorization:github:success:{"token":"${accessToken}","provider":"github"}',
              window.location.origin // Send only to same origin
            );
          } else {
            document.write("Error: Could not find opener window.");
          }
          // Close the popup window
          // window.close(); // Often blocked by browsers, but worth trying
        </script>
        <p>Authentication successful. Please wait...</p>
      </body>
      </html>
    `;

    // Clear the state cookie
    const clearCookie = `csrf_state=; Max-Age=0; HttpOnly; Path=/; SameSite=Lax`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Set-Cookie': clearCookie
      },
      body: responseHtml,
    };

  } catch (error) {
    // --- Error Handling ---
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `<html><body>Authentication failed: ${error.message || 'Unknown error'}. Please close this window and try again.</body></html>`,
    };
  }
};