# 个人职业操作系统架构

配套的可视化导航见 [`architecture-map.html`](architecture-map.html)：系统分层、前后端模块对应、核心数据流和每个目录的职责都可从图中直接跳转到源码。

## 系统概览

本系统把项目、职业资料、能力变化和电子简历放在同一个本地工作台中。它不替代 Get、Notion、Obsidian 或代码仓库的原始内容；系统只保存必要的原始记录、来源地址、关联关系和用户明确允许生成的草稿。

首个可用版本覆盖职业首页、项目档案、简历制作、工作记录、工作资料、岗位对照、内容确认和数据设置。当天工作记录与原始工作资料分开维护，AI 整理与 Codex 接入按明确操作触发。

系统是单机、单用户应用，默认仅监听 `127.0.0.1`。本地版本不提供线上公开链接；电子简历可打印或导出。正式部署与可撤销分享是后续独立能力，不能用当前的 URL hash 直接承载资料数据。

## 架构决策

- 前端：Vite + React + TypeScript，原生 CSS；用浏览器 hash 路由，不引入路由、状态管理或 UI 组件库。
- 后端：Python FastAPI + Pydantic + uvicorn；路由、业务服务、SQLite 存储边界保持分离。
- 数据/存储：本地 SQLite（Python 标准库 `sqlite3`），数据库位于 `data/career-os.db`；导出为 JSON。
- 包管理器：Python 用 `uv`；前端和项目内 `agent-runtime/` 用 Bun，锁文件必须提交。
- 生命周期脚本：根目录 `start.sh`、`stop.sh`；默认 `START_MODE=dev` 启动后端热重载和 Vite，`START_MODE=stable` 构建前端并由 FastAPI 同端口托管，日志放 `logs/`，PID 放 `.pids/`。
- 文件布局：前后端分目录；后端先使用小型 FastAPI 布局，前端仅在页面与复用组件实际出现后拆目录。
- README/代码说明书：README 记录真实安装、环境变量和运行命令；`CODE_ARCHITECTURE.md` 在实现首个可运行版本时记录真实入口和文件地图。
- 明确跳过：账号体系、云数据库、ORM、迁移框架、Redis、后台队列、对象存储、SSR、多 Agent、向量检索、自动评分和线上作品集。
- 以后何时升级：多用户或跨设备同步时迁移 PostgreSQL 并加入鉴权；长任务跨重启或需要重试时再引入任务表和 worker；公开分享有真实需求时才增加分享快照和撤销能力。

## 运行拓扑

开发时，浏览器只访问 Vite；Vite 将 `/api` 和 `/health` 代理到 FastAPI。这样浏览器始终同源访问，不需要宽松 CORS。

```text
浏览器
  -> http://127.0.0.1:6401  React + Vite 开发服务器
  -> /api (Vite proxy)
  -> http://127.0.0.1:6400  FastAPI
  -> data/career-os.db      SQLite
```

本地构建预览时，FastAPI 托管 `frontend/dist`，页面与 API 同源于 `http://127.0.0.1:6400`。前端不得拼接域名；API 客户端只使用相对路径 `/api/...`。这也让后续部署能由反向代理或正式域名自然决定来源地址。

```text
浏览器 -> http://127.0.0.1:6400 -> FastAPI -> SQLite
                                  -> frontend/dist
```

## 用户界面

界面采用语雀式知识工作台，不复制其品牌资产：浅灰页面底、白色内容纸张、细边框、克制阴影、绿色用于主操作和链接，信息以文档层级而非仪表盘数字组织。保留现有页面的信息架构和“资料来源可追溯、默认私密”的产品规则。

| 视图 | 核心操作 | 数据来源 |
|---|---|---|
| 职业首页 | 查看身份、项目和下一步；当天工作在工作记录单独填写 | profile、projects、materials、commits |
| 项目档案 | 新建、编辑、补充资料、选择公开 | projects、materials |
| 简历制作 | 编辑简历、打印、导出 | profile、公开 projects |
| 能力地图 | 按已有项目、资料标签和能力提交聚合 | projects、materials、commits |
| 工作记录 | 记录当天工作和阶段性能力变化 | materials、commits |
| 工作资料 | 查看原始文档、笔记和链接 | materials |
| 内容确认 | 查看、编辑、确认或拒绝整理结果 | drafts、draft_sources |
| 数据设置 | 导出完整备份 | SQLite 数据与浏览器简历数据 |

桌面端使用左侧导航与中央内容区；右侧上下文面板只在资料录入、项目详情和草稿审核出现。移动端将导航压缩为底部入口，录入和审核使用全屏抽屉。每屏最多一个绿色主按钮，状态必须同时有文字与颜色。

## 前端边界

首版的目标文件布局如下；只在对应页面真实实现时创建目录和文件。

```text
pyproject.toml
frontend/
├── package.json
├── bun.lock
├── vite.config.ts             # /api、/health 仅在开发期代理
└── src/
    ├── main.tsx               # React 入口
    ├── App.tsx                # 应用壳与 hash 路由分发
    ├── api.ts                 # 唯一 HTTP 客户端与 API 类型适配
    ├── styles.css             # 语雀式设计 token 与全局样式
    ├── resume/                # 电子简历页面、拖拽布局与本地偏好
    ├── pages/                 # 出现多个独立视图后创建
    └── components/            # 仅放至少两处复用的表单、状态或布局组件
```

- `api.ts` 负责解包统一 API 响应、传递 `X-Request-ID`、将错误转换为用户可行动提示；页面组件不直接调用 `fetch`。
- 前端页面按业务域放在 `pages/`，跨页面 UI 放在 `components/`，电子简历的专属状态与样式放在 `resume/`；`App.tsx` 只保留壳、路由和共享上下文。
- 页面数据使用 React state；首次打开全量加载，写操作只刷新受影响的数据域。跨页面共享状态、缓存失效或并发编辑真正复杂后，再评估状态库或请求缓存库。
- 资料、项目和简历表单只做体验层校验；所有约束由后端再次校验。
- 页面路由暂用 `#/overview`、`#/projects`、`#/projects/:id` 等 hash。只有需要可索引公开页面或服务端权限路由时，才引入路由库和服务端路由。

## 后端边界

HTTP 路由按业务域拆在 `backend/app/routes/`（profile、projects、materials、career、agent、opportunities、resume）；`main.py` 只负责应用生命周期、中间件、异常映射和路由注册。

```text
backend/
└── app/
│   ├── main.py        # 应用、健康检查、中间件和静态文件托管
│   ├── config.py      # 一次性读取并校验环境变量
│   ├── schemas.py     # Pydantic 请求/响应 DTO 与统一响应信封
│   ├── services.py    # 用例、状态流转和业务校验
│   └── storage.py     # SQLite 初始化、查询和原子导入/导出
└── tests/             # 真实业务规则出现时加入最小 pytest
```

- `main.py` 只负责 HTTP：解析 DTO、创建 request id、调用 service、翻译业务错误。
- `services.py` 不依赖 FastAPI Request；它保证“资料先保存、草稿后生成”“原始记录不可被草稿覆盖”“只有公开项目进入简历”等业务规则。
- `storage.py` 是唯一接触 SQLite 和文件系统的位置。不抽象通用 repository；当前只有一个本地存储实现。
- `config.py` 是唯一读取环境变量的位置。启动时记录安全的端口、环境和版本信息，不记录原始资料或秘密。

## 数据模型

所有 ID 都使用 UUID 字符串；时间用带时区的 ISO 8601 UTC 字符串。SQLite 开启 foreign keys，并在每个写入用例中使用事务。

| 表 | 关键字段 | 规则 |
|---|---|---|
| `profile` | `id`, `name`, `headline`, `summary`, `contact`, `updated_at` | 单用户仅保留一条档案 |
| `projects` | `id`, `name`, `goal`, `role`, `status`, `is_public`, `summary`, `created_at`, `updated_at` | 默认私密；公开仅影响简历读取 |
| `materials` | `id`, `kind`, `body`, `source_type`, `source_url`, `project_id`, `ai_allowed`, `created_at` | 原始正文优先；URL 只记录，不自动抓取或读取本地路径 |
| `commits` | `id`, `title`, `before_text`, `after_text`, `project_id`, `occurred_at` | 表示可回看的能力变化，不做评分 |
| `drafts` | `id`, `title`, `body`, `source_text`, `status`, `created_at` | 当前展示并审核种子草稿；AI 阶段再加入模型、指令版本与来源关系 |

能力地图是 `projects`、`materials` 的标签和 `commits` 的派生视图，首版不单独建“能力评分”或知识图谱表。职业计划在确有编辑和关联需求前，先作为资料正文或项目目标保留。

数据库初始化使用可重复执行的建表 SQL，并用 SQLite `PRAGMA user_version` 记录当前结构版本。结构升级在 `storage.py` 中按顺序加入；首版不引入 Alembic。项目、资料和分析数据以 SQLite 为准，电子简历编辑正文、模板和头像暂保存在浏览器 localStorage；设置页完整备份会合并两部分数据。

## API 契约

所有响应都使用统一形状：

```json
{"data": {}, "error": null, "request_id": "req_..."}
```

错误响应为 `{"data": null, "error": {"code": "...", "message": "..."}, "request_id": "req_..."}`。列表从第一版即支持 `page`、`page_size`，返回 `items`、`total`、`page`、`page_size`。

| 资源 | 首版接口 |
|---|---|
| 健康 | `GET /health` |
| 档案 | `GET /api/profile`，`PATCH /api/profile` |
| 项目 | `GET/POST /api/projects`，`GET/PATCH /api/projects/{id}`，`PATCH /api/projects/{id}/visibility` |
| 职业资料 | `GET/POST /api/materials`，`GET /api/projects/{id}/materials` |
| 能力提交 | `GET/POST /api/commits` |
| 简历 | `GET /api/resume`，仅返回档案与 `is_public = true` 项目 |
| 导出 | `GET /api/exports/career-data`，附件为时间戳 JSON 文件 |
| 草稿 | `GET /api/drafts`，`PATCH /api/drafts/{id}`；第 3 阶段才增加受控的 `POST` 生成接口 |

## 实施顺序

1. 建立 React + FastAPI + SQLite 骨架、启动脚本、健康检查和统一 API 响应；把现有 Demo 的种子数据迁入 SQLite。
2. 完成档案、项目、工作资料、工作记录、岗位对照、公开简历和 JSON 导出；简历编辑数据暂保留在浏览器，并由完整备份合并导出。
3. 完成资料搜索/筛选、项目时间线和手工周回顾；依据一周真实使用删除无效字段。
4. 加入受控的记录整理草稿：选择已授权来源、服务端调用模型、校验输出、人工确认/拒绝。Codex 桥接服务只在这条流程稳定后按 `CODEX_CLI_INTEGRATION.md` 单独接入。

## 已知边界与风险

- 本机无登录不等于可公开：监听地址必须保持 `127.0.0.1`，不能为了远程预览改为公网监听。
- SQLite 适合单机单进程；并发写入、多人协作或远程部署是迁移 PostgreSQL 的触发条件。
- 导出 JSON 可能含原始资料，下载前需提示其保存位置；导入必须先校验、写临时文件并原子替换。
- LLM 输出不是事实；必须通过 Pydantic 校验，作为待审核草稿保存，永远不能直接发布或覆盖原文。
- 公开链接目前不在范围内。之后需要独立的、随机且可撤销的分享令牌和只含公开字段的快照，不能复用当前前端 hash 方案。

## 相关文档

- `documentation/flows.md`：关键数据与隐私流程。
- `documentation/permissions.md`：本地单用户权限边界。
- `documentation/variables.md`：环境变量与秘密边界。
- `documentation/tests.md`：当前与计划中的验证映射。
- `documentation/automation.md`：DeepSeek 编码 Agent 的工具面、审批与停止边界。
