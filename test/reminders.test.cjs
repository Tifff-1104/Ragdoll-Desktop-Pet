const assert = require('node:assert/strict');
const test = require('node:test');
const { queryReminders } = require('../reminders-service.cjs');

const now = Date.parse('2026-11-23T12:00:00Z');
const item = (title, hours) => ({
  title, startsAt: new Date(now + hours * 3600000).toISOString()
});

test('range boundaries, undated tasks, and chronological ordering', async () => {
  const read = async () => [
    item('later', 30), item('end', 48), item('overdue', -1),
    { title: 'undated' }, item('now', 0), item('soon', 2)
  ];
  assert.deepEqual((await queryReminders(2, { now, read })).map(i => i.title),
    ['now', 'soon', 'later']);
  assert.equal((await queryReminders(1, { now, read })).length, 2);
  assert.equal((await queryReminders(30, { now, read })).length, 4);
});

test('empty results and refreshing changed data', async () => {
  let reminders = [];
  const read = async () => reminders;
  assert.deepEqual(await queryReminders(1, { now, read }), []);
  reminders = [item('moved', 4)];
  assert.equal((await queryReminders(1, { now, read }))[0].title, 'moved');
});

test('invalid days and source errors', async () => {
  for (const days of [0, 31, 1.5, '7', undefined]) {
    await assert.rejects(queryReminders(days), /1 到 30/);
  }
  await assert.rejects(queryReminders(1, {
    read: async () => { throw new Error('permission denied'); }
  }), /permission denied/);
});

test('calendar includes ongoing events, excludes ended/out-of-range events, and sorts', async () => {
  const { queryCalendar } = require('../reminders-service.cjs');
  const event = (title, start, end) => ({
    ...item(title, start), endsAt: new Date(now + end * 3600000).toISOString()
  });
  const read = async () => [
    event('future', 20, 21), event('ongoing', -3, 1),
    event('ended', -2, 0), event('outside', 24, 25)
  ];
  assert.deepEqual((await queryCalendar(1, { now, read })).map(i => i.title),
    ['ongoing', 'future']);
  await assert.rejects(queryCalendar(31, { now, read }), /1 到 30/);
});
