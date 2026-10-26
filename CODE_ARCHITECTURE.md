# 代码架构说明

## 系统概览

个人职业操作系统是一个本地优先的单用户工作台：记录项目、职业资料、能力变化，并按用户明确的公开选择生成电子简历。React 负责语雀式文档界面，FastAPI 提供稳定 API，SQLite 保存本地数据。原始资料默认私密，前端不再用 `localStorage` 保存业务数据。

## 运行流程

1. 用户打开 `http://127.0.0.1:6401` 的 React 开发页面。
2. `frontend/src/api.ts` 通过相对 `/api/...` 请求数据；Vite 仅在开发时代理到 FastAPI。
3. FastAPI 在路由中校验 DTO，调用 `CareerService` 执行业务规则。
4. `Storage` 使用 SQLite 事务保存数据，路由以统一 `data/error/request_id` 信封返回结果。
5. 构建后 FastAPI 托管 `frontend/dist`，页面和 API 同源于 `6400`。

## 入口文件

| 入口 | 作用 |
|---|---|
| `start.sh` | 安全启动本地前后端服务并记录 PID、日志 |
| `stop.sh` | 只停止由项目启动的服务 |
| `backend/app/main.py` | FastAPI 应用、错误信封、健康检查和静态文件托管 |
| `frontend/src/main.tsx` | React 入口 |
| `frontend/src/App.tsx` | 应用壳、页面原型、表单和局部状态 |

## 文件地图

| 路径 | 作用 | 备注 |
|---|---|---|
| `backend/app/config.py` | 读取并验证环境变量 | 其他模块不直接读取 env |
| `backend/app/schemas.py` | Pydantic DTO | API 输入契约 |
| `backend/app/services.py` | 职业用例与状态规则 | 不依赖 FastAPI Request |
| `backend/app/storage.py` | SQLite 初始化、查询、导出 | 唯一数据库边界 |
| `backend/app/agent.py` | 受控 dsh 子进程、bubblewrap 与任务停止 | 固定工作区和运行时 |
| `backend/tests/test_api.py` | 关键隐私与关联规则测试 | 每个测试使用临时 SQLite |
| `frontend/src/api.ts` | 前端唯一 HTTP 调用点 | 统一处理响应信封与错误 |
| `frontend/src/styles.css` | 语雀式设计 token、布局与响应式样式 | 不依赖 UI 库 |

## 后端设计

- 路由：`main.py` 只负责 HTTP 输入、响应和错误翻译。
- 服务：`CareerService` 负责项目、资料和能力提交的关联与公开状态。
- 存储/模型：SQLite 表由 `Storage.initialize()` 可重复创建，首次启动写入当前 Demo 的种子数据。
- 外部集成：当前没有；AI 整理功能关闭，之后单独增加 integration 边界。
- 配置/env：`config.py` 集中读取，`.env.example` 是配置契约。

## 前端设计

- 页面/视图：`App.tsx` 基于 hash 切换职业全景、项目中心、简历、能力地图、职业 Git、资料收件箱和设置。
- 组件：当前只有真实复用的 `Button`、`Card` 和表单字段；页面变大后再拆 `components/`。
- API 客户端：`api.ts` 使用相对路径，不内嵌主机或正式域名。
- 状态：React state；加载时并行读取所需资源，不引入全局状态库。
- 样式：暖白底、文档纸张卡片、绿色动作和衬线标题，保留现有 Demo 的信息层级。

## 数据和外部服务

- 本地数据库：`data/career-os.db`，被 `.gitignore` 忽略。
- 导出：`GET /api/exports/career-data` 生成 JSON。
- 编码 Agent：项目内 `agent-runtime/` 锁定官方 dsh；仅在 `ENABLE_DEEPSEEK_AGENT=true` 且配置 `DEEPSEEK_API_KEY` 时运行，见 `documentation/automation.md`。

## 日志和运维

- 日志事件和级别：启动和意外请求错误写入后端日志；不记录原始资料和秘密。
- 日志目录：`logs/`。
- PID 目录：`.pids/`。
- 本地端口：后端 `6400`，前端 `6401`，可由 `.env` 覆盖。
- 常见失败：端口被外部进程占用时，`start.sh` 失败而不会终止对方；查看 `logs/backend.log` 或 `logs/frontend.log`。

## 注释规则

- 业务规则注释：解释资料授权、原始资料不可覆盖和公开字段过滤的原因。
- workaround/已知上限：SQLite 仅适用于本机单用户；多人或跨设备同步时迁移 PostgreSQL。
- prompt/解析器假设：AI 功能实现时记录在独立 integration 与 `documentation/automation.md`。

## 扩展规则

- 什么时候新增 service：出现无法由现有 `CareerService` 清晰表达的独立用例时。
- 什么时候新增 storage/repository：出现第二种真实存储或第三方持久化边界时。
- 什么时候新增路由模块：`main.py` 同时包含多个难以扫描的资源组时。
- 什么时候新增前端 route/store：需要权限路由、可索引公开页或跨页面复杂并发状态时。
