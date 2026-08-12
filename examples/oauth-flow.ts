import { ReelsFarmClient } from '../src/index.js';

const rf = new ReelsFarmClient({
  oauth: {
    redirectUri: 'http://127.0.0.1:3456/callback',
    onAuthorizationUrl: (url) => console.log('Open:', url),
  },
});

await rf.raw.listTools();

// After the browser redirects, pass the complete URL so state and issuer are checked.
// await rf.completeOAuthCallback('http://127.0.0.1:3456/callback?code=...&state=...&iss=...');
