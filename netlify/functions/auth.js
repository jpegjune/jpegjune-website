// Netlify Function: /netlify/functions/auth
// Initiates the GitHub OAuth flow

const crypto = require('crypto');
const querystring = require('querystring');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
// IMPORTANT: Callback URL must match the path to your *callback* function
// and your Netlify site's primary domain.
const OAUTH_CALLBACK_URL = `https://jpegjune.com/.netlify/functions/callback`; // Adjust domain if needed

exports.handler = async (event, context) => {
  if (!GITHUB_CLIENT_ID) {
    return {
      statusCode: 500,
      body: 'GITHUB_CLIENT_ID environment variable is not set.',
    };
  }

  // Generate a random state verification token
  const state = crypto.randomBytes(16).toString('hex');

  // Set the state in a secure, HttpOnly cookie
  // Netlify automatically makes function cookies secure on HTTPS sites
  const cookie = `csrf_state=${state}; Max-Age=300; HttpOnly; Path=/; SameSite=Lax`;

  // Construct the GitHub authorization URL
  const params = querystring.stringify({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: OAUTH_CALLBACK_URL,
    scope: 'repo', // Request repository access (needed by Decap CMS)
    state: state,
  });
  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params}`;

  // Redirect the user to GitHub
  return {
    statusCode: 302, // Found (Redirect)
    headers: {
      'Location': githubAuthUrl,
      'Set-Cookie': cookie,
      'Cache-Control': 'no-cache', // Prevent caching of this redirect
    },
    body: '', // No body needed for redirect
  };
};