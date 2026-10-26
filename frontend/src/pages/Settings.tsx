import { useCallback, useEffect, useState } from "react";
import { AgentRun, AgentStatus, api } from "../api";
import { AppContext } from "../types";
import { Button, Card, SectionTitle } from "../components/ui";
import { exportResumeData } from "../resume/storage";

export function Settings({ context }: { context: AppContext }) {
  const exportAll = async () => {
    try {
      const response = await fetch(api.exportUrl);
      if (!response.ok) throw new Error("导出失败，请稍后再试。");
      const backend = await response.json();
      const backup = { ...backend, resume: exportResumeData() };
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      link.download = `career-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      context.setNotice("完整备份已下载。");
    } catch (error) {
      context.setNotice(error instanceof Error ? error.message : "导出失败，请稍后再试。");
    }
  };
  return <><SectionTitle title="数据设置" text="职业数据保存在本机 SQLite；简历编辑内容保存在当前浏览器。完整备份会合并两部分数据。" /><Card className="settings-card"><div><b>导出完整备份</b><p>导出含原始资料和简历编辑内容，请保存到你信任的位置。</p></div><Button variant="outline" onClick={() => void exportAll()}>下载 JSON →</Button></Card><DeepSeekAgentPanel context={context} /></>;
}

function DeepSeekAgentPanel({ context }: { context: AppContext }) {
  const [status, setStatus] = useState<AgentStatus | null>(null), [task, setTask] = useState(""), [materialIds, setMaterialIds] = useState<string[]>([]), [run, setRun] = useState<AgentRun | null>(null);
  const loadStatus = useCallback(async () => { try { setStatus(await api.agentStatus()); } catch (error) { context.setNotice(error instanceof Error ? error.message : "请求失败，请稍后再试。"); } }, [context]);
  useEffect(() => { void loadStatus(); }, [loadStatus]);
  useEffect(() => { if (!run || !["queued", "running"].includes(run.status)) return; const timer = window.setInterval(() => api.agentRun(run.id).then(setRun).catch((error) => context.setNotice(error instanceof Error ? error.message : "请求失败，请稍后再试。")), 1500); return () => window.clearInterval(timer); }, [run, context]);
  const toggleMaterial = (id: string) => setMaterialIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const start = async () => { try { setRun(await api.createAgentRun({ task, material_ids: materialIds })); context.setNotice("DeepSeek 正在整理这条工作经验。"); } catch (error) { context.setNotice(error instanceof Error ? error.message : "请求失败，请稍后再试。"); await loadStatus(); } };
  const stop = async () => { if (!run) return; try { setRun(await api.stopAgentRun(run.id)); } catch (error) { context.setNotice(error instanceof Error ? error.message : "请求失败，请稍后再试。"); } };
  const createDraft = async () => { if (!run || run.status !== "completed") return; try { await api.createAgentDraft(run.id); await context.refresh("drafts"); context.setNotice("经验草稿已生成，请前往内容确认审核。"); } catch (error) { context.setNotice(error instanceof Error ? error.message : "请求失败，请稍后再试。"); } };
  const allowedMaterials = context.dashboard.materials.filter((material) => material.ai_allowed);
  return <Card className="agent-panel"><div className="agent-head"><div><small>DEEPSEEK EXPERIENCE AGENT</small><h3>整理一条工作经验</h3></div><span className={status?.ready ? "agent-ready" : "agent-offline"}>{status?.ready ? "● 已就绪" : "○ 未就绪"}</span></div><p>把工作中的碎片整理成待确认的经验草稿。Agent 只分析和提炼，不修改项目代码，也不会读取 `data/`、`.env`、日志或 PID。</p>{status && !status.ready ? <div className="agent-notice">{status.reason}</div> : <><label className="agent-task">任务说明<textarea value={task} onChange={(event) => setTask(event.target.value)} placeholder="例如：今天排查了线上接口超时，最后发现是数据库连接池配置问题，调整后接口恢复。" maxLength={3000} /></label><details><summary>本次可发送的职业资料（可选，已授权 {materialIds.length} 条）</summary><div className="agent-materials">{allowedMaterials.length ? allowedMaterials.map((material) => <label key={material.id}><input type="checkbox" checked={materialIds.includes(material.id)} onChange={() => toggleMaterial(material.id)} /> <span>{material.body}<small>{material.source_type}</small></span></label>) : <p>没有允许 AI 使用的资料；仍可只整理你当前输入的经验。</p>}</div></details><div className="agent-actions"><Button variant="primary" disabled={!task.trim() || run?.status === "queued" || run?.status === "running"} onClick={() => void start()}>开始整理经验</Button>{run && ["queued", "running"].includes(run.status) ? <Button onClick={() => void stop()}>停止任务</Button> : null}</div></>}{run && <div className="agent-result"><span className={`run-${run.status}`}>{run.status}</span><b>{run.task}</b>{run.error_text && <p>{run.error_text}</p>}{run.output && <><small>{["queued", "running"].includes(run.status) ? "实时 CLI 输出（每 1.5 秒刷新）" : "CLI 输出"}</small><pre>{run.output}</pre>{run.status === "completed" ? <Button variant="primary" onClick={() => void createDraft()}>生成待审核经验草稿</Button> : null}</>}</div>}</Card>;
}
