#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$ROOT_DIR"

export PATH="$HOME/Library/Python/3.9/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
if ! command -v uv >/dev/null 2>&1; then
  echo "❌ 未找到 uv，请先安装：python3 -m pip install --user uv" >&2
  exit 1
fi

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

HOST="${HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-6400}"
FRONTEND_PORT="${FRONTEND_PORT:-6401}"
START_MODE="${START_MODE:-dev}"
LOG_DIR="$ROOT_DIR/logs"
PID_DIR="$ROOT_DIR/.pids"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR" "$PID_DIR"

if [[ "$HOST" != "127.0.0.1" && "$HOST" != "localhost" ]]; then
  echo "❌ 首版仅允许绑定 127.0.0.1 或 localhost。" >&2
  exit 1
fi
if [[ "$START_MODE" != "dev" && "$START_MODE" != "stable" ]]; then
  echo "❌ START_MODE 只能是 dev 或 stable。" >&2
  exit 1
fi

port_owner() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltnpH "sport = :$1" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -n 1 || true
  elif command -v lsof >/dev/null 2>&1; then
    lsof -t -iTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
  fi
}

"$ROOT_DIR/stop.sh" >/dev/null
sleep 0.3

ports=("$BACKEND_PORT")
[[ "$START_MODE" == "dev" ]] && ports+=("$FRONTEND_PORT")
for port in "${ports[@]}"; do
  pid="$(port_owner "$port")"
  if [[ -n "$pid" ]]; then
    cwd="$(readlink "/proc/$pid/cwd" 2>/dev/null || true)"
    if [[ -z "$cwd" ]] && command -v lsof >/dev/null 2>&1; then
      cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | awk '/^n/{sub(/^n/, ""); print; exit}')"
    fi
    [[ -n "$cwd" ]] || cwd="?"
    echo "❌ 端口 $port 被 pid=$pid 占用 (cwd=$cwd)，不会终止外部进程。" >&2
    exit 1
  fi
done

echo "安装并校验后端依赖…"
uv sync
if [[ ! -d "$ROOT_DIR/frontend/node_modules" ]]; then
  echo "安装前端依赖…"
  (cd "$ROOT_DIR/frontend" && bun install)
fi
if [[ "${ENABLE_DEEPSEEK_AGENT:-false}" == "true" && ! -d "$ROOT_DIR/agent-runtime/node_modules" ]]; then
  echo "安装 DeepSeek Agent 运行时…"
  (cd "$ROOT_DIR/agent-runtime" && bun install)
fi
if [[ "$START_MODE" == "stable" ]]; then
  echo "构建前端静态文件…"
  (cd "$ROOT_DIR/frontend" && bun run build)
fi

BACKEND_LOG="$LOG_DIR/backend-$RUN_ID.log"
FRONTEND_LOG="$LOG_DIR/frontend-$RUN_ID.log"
ln -sfn "$(basename "$BACKEND_LOG")" "$LOG_DIR/backend.log"
ln -sfn "$(basename "$FRONTEND_LOG")" "$LOG_DIR/frontend.log"

echo "启动后端：http://$HOST:$BACKEND_PORT"
backend_args=(uv run uvicorn app.main:app --app-dir backend --host "$HOST" --port "$BACKEND_PORT")
[[ "$START_MODE" == "dev" ]] && backend_args+=(--reload)
nohup "${backend_args[@]}" > "$BACKEND_LOG" 2>&1 &
echo $! > "$PID_DIR/backend.pid"

if [[ "$START_MODE" == "dev" ]]; then
  echo "启动前端：http://$HOST:$FRONTEND_PORT"
  (
    cd "$ROOT_DIR/frontend"
    nohup npm run dev -- --host "$HOST" --port "$FRONTEND_PORT" --strictPort > "$FRONTEND_LOG" 2>&1 &
    echo $! > "$PID_DIR/frontend.pid"
  )
fi

sleep 1
if ! curl --fail --silent "http://$HOST:$BACKEND_PORT/health" >/dev/null; then
  echo "❌ 后端未通过健康检查，请查看 $BACKEND_LOG" >&2
  exit 1
fi
frontend_url="http://$HOST:$BACKEND_PORT"
if [[ "$START_MODE" == "dev" ]]; then
  frontend_url="http://$HOST:$FRONTEND_PORT"
fi
if ! curl --fail --silent "${frontend_url}" >/dev/null; then
  echo "frontend failed; see ${FRONTEND_LOG}" >&2
  exit 1
fi
echo "started: frontend ${frontend_url}, backend http://${HOST}:${BACKEND_PORT}"
