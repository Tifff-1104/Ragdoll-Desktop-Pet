import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { pathToFileURL } from 'node:url';
import service from './reminders-service.cjs';

export function createServer(query = service.queryReminders, calendarQuery = service.queryCalendar) {
  const server = new McpServer({ name: 'ragdoll-reminders', version: '1.0.0' });
  const tools = [
    {
      name: 'get_upcoming_reminders',
      title: '查询 Mac 提醒事项',
      description: '读取 Mac 提醒事项所有清单中未来 N 个24小时内到期的未完成任务，按到期时间排序。排除逾期、已完成和未设日期的任务。仅日期的任务按本地零点计算。',
      query
    },
    {
      name: 'get_upcoming_calendar_events',
      title: '查询 Mac 日历',
      description: '读取 Mac「工作」和「个人」日历未来 N 个24小时内的活动，包括重复活动、全天及仍在进行的活动，按开始时间排序。两个日历名称必须与系统中的名称完全一致。',
      query: calendarQuery
    }
  ];
  for (const tool of tools) {
    server.registerTool(tool.name, {
      title: tool.title,
      description: tool.description + ' 每次重新读取，只查询，不修改数据。',
      inputSchema: {
        days: z.number().int().min(1).max(30).describe('查询未来天数，1到30的整数')
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    }, async ({ days }) => {
      try {
        const structuredContent = { items: await tool.query(days) };
        return { structuredContent, content: [{ type: 'text', text: JSON.stringify(structuredContent) }] };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: error.message || '查询失败。' }] };
      }
    });
  }
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await createServer().connect(new StdioServerTransport());
}
