import { ReelsFarmClient } from '../src/index.js';

const rf = new ReelsFarmClient({ apiKey: process.env.REELSFARM_API_KEY });

const avatar = await rf.avatars.generate({
  prompt: 'Creator holding a phone, bright UGC style',
});

if ('wait' in avatar) {
  const result = await avatar.wait();
  console.log(result);
}

await rf.close();
