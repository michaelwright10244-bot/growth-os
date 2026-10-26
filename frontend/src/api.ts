export type Profile = {
  name: string;
  headline: string;
  summary: string;
  contact: string;
  updated_at: string;
};
export type Project = {
  id: string;
  name: string;
  goal: string;
  role: string;
  status: "进行中" | "已完成" | "待整理";
  summary: string;
  is_public: boolean;
  evidence_count: number;
  created_at: string;
  updated_at: string;
};
export type Material = {
  id: string;
  kind: "经历" | "资料" | "想法";
  body: string;
  source_type: string;
  source_url: string | null;
  project_id: string | null;
  ai_allowed: boolean;
  created_at: string;
};
export type CareerCommit = {
  id: string;
  title: string;
  before_text: string;
  after_text: string;
  project_id: string;
  occurred_at: string;
  created_at: string;
};
export type Draft = {
  id: string;
  title: string;
  body: string;
  source_text: string;
  status: "pending" | "confirmed" | "rejected";
  created_at: string;
};
export type AgentStatus = {
  enabled: boolean;
  ready: boolean;
  reason: string | null;
};
export type AgentRun = {
  id: string;
  task: string;
  material_ids: string[];
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  started_at: string | null;
  finished_at: string | null;
  exit_code: number | null;
  output: string;
  error_text: string;
  created_at: string;
};
export type Job = {
  id: string;
  title: string;
  company: string;
  source_url: string | null;
  description: string;
  created_at: string;
};
export type JobAnalysis = {
  id: string;
  job_id: string;
  project_ids: string[];
  material_ids: string[];
  body: string;
  created_at: string;
};
type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  request_id: string;
};
type Page<T> = { items: T[]; page: number; page_size: number; total: number };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    const result = (await response.json()) as Envelope<T>;
    if (!response.ok || result.error || result.data === null) {
      throw new ApiError(
        result.error?.message ?? "请求失败，请稍后再试。",
        result.request_id,
      );
    }
    return result.data;
  } catch (error) {
    if (controller.signal.aborted)
      throw new ApiError("请求超时，请检查本地后端是否已启动。");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  profile: () => request<Profile>("/api/profile"),
  projects: () => request<Page<Project>>("/api/projects"),
  createProject: (
    payload: Omit<
      Project,
      "id" | "evidence_count" | "created_at" | "updated_at"
    >,
  ) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateProject: (
    id: string,
    payload: Omit<
      Project,
      "id" | "evidence_count" | "created_at" | "updated_at"
    >,
  ) =>
    request<Project>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  toggleProject: (id: string, is_public: boolean) =>
    request<Project>(`/api/projects/${id}/visibility`, {
      method: "PATCH",
      body: JSON.stringify({ is_public }),
    }),
  materials: () => request<Page<Material>>("/api/materials"),
  createMaterial: (payload: {
    kind: Material["kind"];
    body: string;
    source_type: "手工记录" | "外部笔记" | "项目文档" | "代码仓库" | "本地文件";
    source_url?: string | null;
    project_id?: string | null;
    ai_allowed: boolean;
  }) => request<Material>("/api/materials", { method: "POST", body: JSON.stringify(payload) }),
  commits: () => request<CareerCommit[]>("/api/commits"),
  createCommit: (payload: Omit<CareerCommit, "id" | "created_at">) =>
    request<CareerCommit>("/api/commits", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  drafts: () => request<Draft[]>("/api/drafts"),
  setDraftStatus: (id: string, status: "confirmed" | "rejected") =>
    request<Draft>(`/api/drafts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  agentStatus: () => request<AgentStatus>("/api/agent/status"),
  createAgentRun: (payload: { task: string; material_ids: string[] }) =>
    request<AgentRun>("/api/agent-runs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  agentRun: (id: string) => request<AgentRun>(`/api/agent-runs/${id}`),
  stopAgentRun: (id: string) =>
    request<AgentRun>(`/api/agent-runs/${id}/stop`, { method: "POST" }),
  createAgentDraft: (id: string) =>
    request<Draft>(`/api/agent-runs/${id}/draft`, { method: "POST" }),
  jobs: () => request<Job[]>("/api/jobs"),
  createJob: (payload: Omit<Job, "id" | "created_at">) =>
    request<Job>("/api/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  jobAnalyses: () => request<JobAnalysis[]>("/api/job-analyses"),
  analyzeJob: (
    id: string,
    payload: { project_ids: string[]; material_ids: string[] },
  ) =>
    request<JobAnalysis>(`/api/jobs/${id}/analyses`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  exportUrl: "/api/exports/career-data",
};
