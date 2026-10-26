# 配置与秘密

实现时提交 `.env.example`，忽略 `.env`、`data/`、`logs/` 与 `.pids/`。前端 bundle 不读取任何秘密。

| 变量 | 使用方 | 默认值 | 秘密 | 说明 |
|---|---|---|---:|---|
| `APP_ENV` | 后端 | `local` | 否 | 运行环境标签 |
| `HOST` | start.sh、FastAPI、Vite | `127.0.0.1` | 否 | 本地安全边界；不能在首版改为公网地址 |
| `BACKEND_PORT` | start.sh、FastAPI | `6400` | 否 | 后端端口 |
| `FRONTEND_PORT` | start.sh、Vite | `6401` | 否 | 开发服务器端口 |
| `START_MODE` | start.sh | `dev` | 否 | `dev` 使用 Vite；`stable` 由 FastAPI 托管构建产物 |
| `DATABASE_PATH` | 后端 storage | `data/career-os.db` | 否 | 必须是项目数据目录内的固定路径 |
| `LOG_LEVEL` | 后端 | `INFO` | 否 | 默认不输出原始资料 |
| `ENABLE_DEEPSEEK_AGENT` | 后端 Agent runner | `false` | 否 | 必须显式开启编码 Agent |
| `DEEPSEEK_API_KEY` | dsh 子进程、手动岗位分析 | 空 | 是 | 仅由后端使用，泄露后立即轮换 |
| `DEEPSEEK_BASE_URL` | dsh 子进程 | 空 | 可能 | 可选兼容端点；不发送到前端 |
| `DEEPSEEK_MODEL` | 手动岗位分析 | `deepseek-chat` | 否 | DeepSeek Chat Completions 模型 ID |
| `DEEPSEEK_AGENT_TIMEOUT_SECONDS` | 后端 Agent runner | `600` | 否 | 编码任务最大运行秒数 |

上线前检查：`.env` 不进版本库；启动日志不打印密钥或完整资料；`HOST` 保持 loopback；模型功能未配置完整密钥时必须快速失败或保持关闭；前端 API 基址使用相对路径而非环境内嵌的秘密地址。
