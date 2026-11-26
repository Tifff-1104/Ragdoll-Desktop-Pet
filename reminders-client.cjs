const path = require('node:path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function queryThroughMcp(days, source = 'reminders') {
  if (!['reminders', 'calendar'].includes(source)) throw new Error('未知查询来源。');
  const client = new Client({ name: 'ragdoll-pet', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(__dirname, 'server.mjs')],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    cwd: __dirname
  });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: source === 'calendar' ? 'get_upcoming_calendar_events' : 'get_upcoming_reminders', arguments: { days }
    }, undefined, { timeout: 75000 });
    if (result.isError) {
      throw new Error(result.content.find(item => item.type === 'text')?.text || '提醒事项查询失败。');
    }
    if (!Array.isArray(result.structuredContent?.items)) throw new Error('MCP 返回格式错误。');
    return result.structuredContent.items;
  } finally {
    await transport.close();
  }
}

if (require.main === module) {
  queryThroughMcp(Number(process.argv[2] ?? 10), process.argv[3] ?? 'reminders').then(
    items => console.log(JSON.stringify({ items }, null, 2)),
    error => { console.error(error.message); process.exitCode = 1; }
  );
}

module.exports = { queryThroughMcp };
