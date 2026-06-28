import { ReelsFarmClient } from '../src/index.js';

const rf = new ReelsFarmClient({
  oauth: {
    redirectUri: 'http://127.0.0.1:3456/callback',
    onAuthorizationUrl: (url) => console.log('Open:', url),
  },
});

await rf.raw.listTools();
