const assert = require('node:assert/strict');
const test = require('node:test');

test('MCP lists the tool, validates days, returns structured data and propagates source errors', async () => {
  const { createServer } = await import('../server.mjs');
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');
  let fail = false;
  const items = [{ title: 'Test task', startsAt: '2026-11-24T12:00:00Z' }];
  const server = createServer(async days => {
    if (fail) throw new Error('读取失败');
    return days === 1 ? [] : items;
  }, async () => [{ title: 'Calendar test', startsAt: '2026-11-24T14:00:00Z' }]);
  const client = new Client({ name: 'tests', version: '1.0' });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverSide);
    await client.connect(clientSide);
    assert.deepEqual((await client.listTools()).tools.map(tool => tool.name),
      ['get_upcoming_reminders', 'get_upcoming_calendar_events']);
    const calendar = await client.callTool({
      name: 'get_upcoming_calendar_events', arguments: { days: 10 }
    });
    assert.equal(calendar.structuredContent.items[0].title, 'Calendar test');
    const invalidCalendar = await client.callTool({
      name: 'get_upcoming_calendar_events', arguments: { days: 31 }
    });
    assert.equal(invalidCalendar.isError, true);
    const call = days => client.callTool({ name: 'get_upcoming_reminders', arguments: { days } });
    assert.deepEqual((await call(1)).structuredContent.items, []);
    const result = await call(7);
    assert.deepEqual(result.structuredContent.items, items);
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    for (const days of [0, 31, 1.5, '2']) assert.equal((await call(days)).isError, true);
    fail = true;
    assert.equal((await call(2)).isError, true);
  } finally {
    await client.close();
    await server.close();
  }
});
