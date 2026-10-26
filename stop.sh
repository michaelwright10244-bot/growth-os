#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$ROOT_DIR"
PID_DIR="$ROOT_DIR/.pids"

stop_tracked_process() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 0
  local pid
  pid="$(cat "$pid_file")"
  if kill -0 "$pid" 2>/dev/null; then
    local cwd
    cwd="$(readlink "/proc/$pid/cwd" 2>/dev/null || true)"
    if [[ -z "$cwd" ]] && command -v lsof >/dev/null 2>&1; then
      cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | grep '^n' | head -n 1 | cut -c2-)"
    fi
    if [[ "$cwd" == "$ROOT_DIR"* ]]; then
      kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
      if command -v pkill >/dev/null 2>&1; then
        pkill -TERM -P "$pid" 2>/dev/null || true
      fi
      echo "已停止 pid=$pid"
    else
      echo "⚠️ 跳过非本项目进程 pid=$pid (cwd=$cwd)"
    fi
  fi
  rm -f "$pid_file"
}

stop_tracked_process "$PID_DIR/backend.pid"
stop_tracked_process "$PID_DIR/frontend.pid"
echo "✅ 已停止项目服务。"
