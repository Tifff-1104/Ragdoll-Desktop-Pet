# 布偶猫桌宠

一个运行在 Mac 桌面上的 Electron 小猫。猫咪默认在右下角睡觉，鼠标移上去会抬头，按住猫咪可以拖动。右键菜单可以切换法语互动、日历和提醒事项。

## 功能

| 模式 | 点猫咪后的反应 |
| --- | --- |
| 问候（默认） | 轮流显示四句法语问候，附中文翻译 |
| 喂小鱼 | 挥爪并用法语道谢 |
| 猜法语 | 显示一个法语词，点气泡看中文，12 个词循环 |
| 提醒事项 | 查询 Mac 所有提醒事项清单，显示未来十天内最近三项未完成任务 |
| 日历 | 查询 Mac「工作」和「个人」两个日历，显示未来十天内最近三项安排 |

猫咪使用项目内的四张透明 PNG。法语互动使用本地词表。日历和提醒事项通过同一个本地 MCP server 查询，每次查询都会重新读取 Mac 数据。气泡较长时可以滚动查看，鼠标离开桌宠区域后会收起。

## 运行环境

- macOS 14 或更新版本。
- Node.js 24 或更新版本，包含 npm。
- Xcode Command Line Tools，用于编译读取 Mac 数据的 Swift 组件。
- 首次安装需要联网下载 Electron 和 npm 依赖。

先在终端检查：

```sh
node -v
npm -v
xcode-select -p
```

如果没有 Xcode 命令行工具，执行下面的命令，按系统提示安装完成后再继续：

```sh
xcode-select --install
```

## 安装和启动

下载或克隆项目，在终端进入项目文件夹，然后执行：

```sh
npm ci
npm start
```

`npm ci` 安装锁定版本的依赖，并自动编译当前 Mac 使用的 `calendar-reader`。第一次编译可能需要几分钟。编译后的文件和 `node_modules` 已加入忽略列表，每台 Mac 安装时自行生成。

如果修改了 Swift 源码，重新编译：

```sh
npm run build:reader
```

停止桌宠时，回到启动它的终端，按 **Control + C**。修改代码后也需要停止并重新启动。

## 如何操作

- 左键轻点猫咪，执行当前模式。
- 按住猫咪拖动，或拖动猫咪脚下的小横条。
- 右键点猫咪切换模式，Mac 触控板可以双指轻点。
- 猜法语时，点头顶气泡显示答案。
- 日历和提醒事项模式下，点一次会重新查询。

首次查询日历或提醒事项时，在 macOS 的权限提示中允许访问。如果没有读到数据，检查「系统设置 → 隐私与安全性 → 日历 / 提醒事项」里对应应用的权限。通过终端、Electron 或 Codex 启动时，系统显示的应用名称可能不同。

## 查询范围

两个 MCP 工具的 `days` 都必须是 1–30 的整数。范围是从查询时刻起往后 N × 24 小时，结束时刻不包含在内。猫咪固定传入 `10`，并只显示前三项；MCP 工具返回范围内所有符合条件的事项。

### 提醒事项

读取所有清单中的未完成任务，按到期时间排序。逾期、已完成和没有设到期日期的任务不在结果中。只设日期、没有具体时间的任务按当天本地零点计算，因此当天零点已过去的任务也会被排除。

### 日历

读取名称完全匹配「工作」和「个人」的日历，包括同名日历。按活动开始时间排序，包含重复活动、全天活动和仍在进行的活动。两个名称中任意一个不存在，会提示核对名称。

如果你的日历名称不同，可以修改 `calendar-reader.swift` 里的 `names`，再运行 `npm run build:reader`。

## 在终端查询

```sh
# 查询未来 7 天的提醒事项
npm run query -- 7 reminders

# 查询未来 10 天的日历
npm run query -- 10 calendar
```

结果为 JSON，包含 `items` 数组。每项有 `title`、带时区的 `startsAt`、`allDay` 和所属清单或日历 `calendar`。日历活动还包含 `endsAt`。无结果时返回空数组，权限或读取失败时返回错误。

## 在 Codex 中连接 MCP

安装完成后，在项目文件夹执行下面两条命令，取得当前电脑的 Node 和 server 路径：

```sh
node -p "process.execPath"
node -p "require('node:path').resolve('server.mjs')"
```

在 Codex 的 MCP 设置中添加 STDIO server：

- 名称可填 `ragdoll-reminders`。
- 启动命令填第一条命令输出的 Node 绝对路径。
- 参数填第二条命令输出的 `server.mjs` 绝对路径，作为一个参数。

也可以将下面的配置合并到自己的 Codex 配置文件，替换其中路径：

```toml
[mcp_servers.ragdoll-reminders]
command = "/你的/Node/绝对路径"
args = ["/你的/项目文件夹/server.mjs"]
```

已有 `ragdoll-reminders` 配置时直接更新该条目。保存后重启或重新加载 Codex 的 MCP 连接，即可发现两个工具：

| 工具 | 参数 | 数据源 |
| --- | --- | --- |
| `get_upcoming_reminders` | `days`，1–30 的整数 | Mac 提醒事项 |
| `get_upcoming_calendar_events` | `days`，1–30 的整数 | Mac 日历 |

可以在聊天里说「用 ragdoll-reminders 查未来 7 天的提醒事项」，或「查未来 10 天的工作和个人日历」。也可以要求先查 1 天，没有结果再查 7 天。

MCP 使用本地标准输入输出通信。成功结果同时通过 `structuredContent` 和 JSON 文本返回，错误标记为 `isError`。日历和提醒事项里的文字作为数据返回，在界面中用纯文本显示。

## 数据与权限

读取组件只执行查询。项目源码不包含你的日历和提醒事项数据，也不保存查询结果。数据源可以来自你在 Mac 上配置的 iCloud 或其他账号。

猫咪独立查询时，结果用于本地气泡显示。在 Codex 聊天中调用 MCP 时，返回的标题和日期会进入聊天，供 AI 回答。macOS 为读取数据申请的授权名称可能包含“完全访问”，本项目的实现只使用读取操作。

## 项目文件

| 文件 | 用途 |
| --- | --- |
| `main.js`、`preload.js` | Electron 窗口、右键菜单、拖动和进程通信 |
| `index.html`、`pet.js` | 猫咪、气泡、法语互动 |
| `assets/` | 四张布偶猫透明图片 |
| `server.mjs` | 两个 MCP 查询工具 |
| `reminders-client.cjs` | 桌宠与命令行使用的 MCP 客户端 |
| `reminders-service.cjs` | 调用 Mac 读取组件并筛选时间范围 |
| `calendar-query.js` | 查询合并、前三项格式化 |
| `calendar-reader.swift`、`calendar-reader-info.plist` | EventKit 读取代码和权限说明 |
| `scripts/build-reader.cjs` | 在当前 Mac 编译读取组件 |
| `test/` | 查询范围及 MCP 通信测试 |
| `AGENTS.md` | 协作开发要求 |

## 检查与上传 GitHub

运行自动测试：

```sh
npm test
```

测试使用模拟数据，不需要访问私人日历。真实权限和数据可用前面的终端查询命令检查。

上传源码时保留 `package-lock.json`、Swift 源码、权限说明和四张图片。`.gitignore` 已排除依赖、编译后的读取组件、Mac 杂项文件、日志和本机 Codex 配置。

目前提供的是需要 Node.js 启动的项目源码，还没有制作可双击安装的 Mac 应用安装包。
