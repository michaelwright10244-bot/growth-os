# DeepSeek 编码 Agent

## 范围

本系统通过项目内锁定的官方 `@deepseek-ai/dsh` 执行 `dsh --profile headless`。它是用户主动启动的单次编码任务，不会自动运行、不会创建公开内容，也不会绕过现有草稿审核流程。

| 项目 | 约束 |
|---|---|
| 触发者 | 本机所有者在“设置与导出”的 DeepSeek 编码 Agent 面板点击开始 |
| 工作目录 | 固定为仓库根目录 `growth-os`，浏览器不能传入路径 |
| 可写内容 | 工作区源码；由用户任务决定具体改动 |
| 不可见内容 | `data/`、`.env`、`logs/`、`.pids/` 和 `.git/` 在 bubblewrap 中被隐藏 |
| 资料输入 | 仅本次勾选且 `ai_allowed=true` 的资料；服务端重新查询，不信任前端标记 |
| CLI 命令 | 固定的 `agent-runtime/node_modules/.bin/dsh --profile headless --patch agent-runtime/career-os.patch.yml <task>` |
| 禁用能力 | dsh 内置 Web、子 Agent、工作流和 Ralph 工具由 patch 禁用 |
| 输出 | 运行中持续保存并展示最多 48,000 字符的 CLI 输出、退出码和状态；dsh 会话使用每任务临时目录和 `0600` 受管凭据文件，结束后删除，不记录 API key |

## 运行流程

1. 浏览器提交任务与可选资料 ID 到 `POST /api/agent-runs`。
2. FastAPI 检查功能开关、`DEEPSEEK_API_KEY`、项目内 dsh 运行时、`bwrap` 和当前运行任务数。
3. `CareerService` 查询每个资料 ID；不存在、重复或未授权资料均以 `422 invalid_action` 拒绝。
4. 服务端写入 `agent_runs` 的 `queued` 记录；SQLite 部分唯一索引拒绝第二个 queued/running 任务。
5. `DeepSeekAgent` 在独立进程组启动 `bwrap` 与固定 dsh 命令；Python `shell=False`，不拼接用户命令或路径。

服务启动时会把上一次进程遗留的 `queued`/`running` 任务标记为失败，并说明任务未恢复；首版不尝试跨进程续跑。
6. `bwrap` 挂载代码工作区并遮蔽本地职业数据与秘密；dsh 接收包含任务和已授权资料的提示。
7. 浏览器轮询 `GET /api/agent-runs/{id}`；`POST /api/agent-runs/{id}/stop` 向受管理进程组发送 `SIGTERM`。
8. 任务完成、失败、超时或停止后，服务端记录状态和有限输出。模型的建议和代码改动仍由本机所有者审查。

## 非提示词的硬护栏

- 运行路径、CLI 路径、profile、patch、环境变量和工作目录由服务端固定。
- `bwrap` 不存在时拒绝启动；不会降级为裸进程。
- 子进程环境只含 `HOME`、`DSH_HOME`、受限 PATH、无交互 dsh 权限、可选 Base URL；API key 仅写入任务临时目录的 dsh 受管凭据文件，不进入子进程环境。
- 超时由 `DEEPSEEK_AGENT_TIMEOUT_SECONDS` 限定；应用关闭时终止仍在运行的受管理进程。
- dsh 的 Web/子 Agent 工具被关闭，但编码 Agent 仍需要网络访问 DeepSeek API；不要把不应交给该 Agent 的源码放入此工作区。

## 输出与失败处理

- dsh 正常退出：`completed`；非零退出：`failed`；用户停止：`cancelled`；超时：`failed`。
- API key、完整环境变量、被隐藏目录的内容不写入任务输出或应用日志。
- CLI 输出只是操作记录，不是可信的资料或自动发布内容。
- 首次启用前在 `.env` 设置 `ENABLE_DEEPSEEK_AGENT=true` 和 `DEEPSEEK_API_KEY`；密钥缺失时状态面板显示原因，不创建任务。

## 已知边界

- 当前只限制一个本地用户和一个进程内任务；服务重启不会恢复执行中的任务，但会回收其状态，避免旧任务永久占用并发锁。
- bubblewrap 限制文件视图与写入范围，但为了调用 DeepSeek API 保留网络命名空间；需要域名级出网控制时，必须加独立代理或网络策略。
