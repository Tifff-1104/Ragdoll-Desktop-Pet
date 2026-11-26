const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');

const runFile = promisify(execFile);

async function readItems(source, days) {
  let stdout;
  try {
    ({ stdout } = await runFile(path.join(__dirname, 'calendar-reader'), [source, String(days)],
      { timeout: 60000, maxBuffer: 8 * 1024 * 1024 }));
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('请先运行 npm run build:reader 编译 Mac 读取组件。');
    throw new Error('Mac 读取组件启动失败或查询超时，请检查系统隐私权限后重试。');
  }
  const result = JSON.parse(stdout);
  if (result.error) throw new Error(result.error);
  if (!Array.isArray(result.items)) throw new Error('Mac 读取组件返回格式错误。');
  return result.items;
}

function validateDays(days) {
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    throw new Error('days 必须是 1 到 30 的整数。');
  }
}

async function queryReminders(days, { read = () => readItems('reminders', days), now = Date.now() } = {}) {
  validateDays(days);
  const end = now + days * 86400000;
  const reminders = await read();
  return reminders.filter((item) => {
    const due = Date.parse(item.startsAt);
    return due >= now && due < end;
  }).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

async function queryCalendar(days, { read = () => readItems('calendar', days), now = Date.now() } = {}) {
  validateDays(days);
  const end = now + days * 86400000;
  const events = await read();
  return events.filter(item => Date.parse(item.startsAt) < end &&
    Date.parse(item.endsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

module.exports = { queryReminders, queryCalendar };
