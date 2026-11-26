const { queryThroughMcp } = require('./reminders-client.cjs');
const pending = new Map();

async function readCalendar(source) {
  try {
    const items = await queryThroughMcp(10, source);
    if (!items.length) return source === 'calendar'
      ? '未来十天没有查到日历安排。' : '未来十天没有查到待完成的提醒事项。';
    return items.slice(0, 3).map((item, index) => {
      const options = item.allDay
        ? { month: 'numeric', day: 'numeric' }
        : { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      const date = item.startsAt
        ? new Date(item.startsAt).toLocaleString('zh-CN', options)
        : '未设日期';
      return (index + 1) + '. ' + item.title + '\n' + date +
        (item.startsAt && item.allDay ? '（仅日期）' : '') + ' · ' + item.calendar;
    }).join('\n\n');
  } catch (error) {
    return error.message || '提醒事项查询失败，请稍后重试。';
  }
}

function getNextCalendarEvent(source = 'reminders') {
  if (!pending.has(source)) {
    pending.set(source, readCalendar(source).finally(() => pending.delete(source)));
  }
  return pending.get(source);
}

module.exports = { getNextCalendarEvent };
