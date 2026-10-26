import { ApiError } from "./api";

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(value));
}

export function messageFor(error: unknown) { return error instanceof ApiError || error instanceof Error ? `${error.message}${error instanceof ApiError && error.requestId ? `（${error.requestId}）` : ""}` : "请求失败，请稍后再试。"; }
