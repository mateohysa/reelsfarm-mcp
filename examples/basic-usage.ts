import { ReelsFarmClient } from '../src/index.js';

const rf = new ReelsFarmClient({ apiKey: process.env.REELSFARM_API_KEY });
const account = await rf.account.get();
console.log(account);
await rf.close();
