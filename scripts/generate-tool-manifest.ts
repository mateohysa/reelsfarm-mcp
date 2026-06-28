import { ReelsFarmClient } from '../src/index.js';

const serverUrl = process.env.REELSFARM_MCP_TEST_URL || process.env.REELSFARM_MCP_URL;
const apiKey = process.env.REELSFARM_MCP_TEST_API_KEY || process.env.REELSFARM_API_KEY;

if (!serverUrl || !apiKey) {
  throw new Error('Set REELSFARM_MCP_TEST_URL and REELSFARM_MCP_TEST_API_KEY to generate the manifest');
}

const client = new ReelsFarmClient({ serverUrl, apiKey, validateToolSurface: 'off' });
const tools = await client.raw.listTools();
await client.close();

const names = tools.map((tool) => String(tool.name)).sort();
console.log(JSON.stringify(names, null, 2));
