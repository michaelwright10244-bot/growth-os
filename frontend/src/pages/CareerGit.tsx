import { FormEvent, useState } from "react";
import { api } from "../api";
import { AppContext } from "../types";
import { Button, Card, Label, SectionTitle } from "../components/ui";
import { formatDate } from "../utils";
import { WorkFileUpload } from "../modules/work-records/WorkFileUpload";

export function CareerGit({ context }: { context: AppContext }) {
  const [saving, setSaving] = useState(false);
  const logs = context.dashboard.materials.filter((item) => item.source_type === "手工记录");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await api.createMaterial({
        kind: "经历",
        body: String(form.get("body")),
        source_type: "手工记录",
        project_id: String(form.get("project_id") || "") || null,
        ai_allowed: form.get("ai_allowed") === "on",
      });
      event.currentTarget.reset();
      await context.refresh("materials");
      context.setNotice("今天的工作已保存。");
    } catch (error) {
      context.setNotice(error instanceof Error ? error.message : "保存失败，请稍后再试。");
    } finally {
      setSaving(false);
    }
  };
  return <><SectionTitle title="工作记录" text="记录今天做了什么、遇到什么问题，以及哪些内容值得以后回看。" /><Card className="job-form"><form onSubmit={(event) => void save(event)}><Label label="今天做了什么"><textarea name="body" required minLength={1} placeholder="例如：完成了岗位分析接口的上下文限制，并补了异常测试。" /></Label><Label label="关联项目（可选）"><select name="project_id"><option value="">暂不关联</option>{context.dashboard.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Label><label><input type="checkbox" name="ai_allowed" /> 允许 AI 帮我整理这条记录</label><Button type="submit" variant="primary" disabled={saving}>{saving ? "正在保存…" : "保存今天"}</Button></form><div className="work-file-upload"><b>上传定时生成的文件</b><p>支持 TXT、Markdown 和 JSON。文件只会保存到当前本地系统。</p><WorkFileUpload projects={context.dashboard.projects} materials={context.dashboard.materials} onSaved={async () => { await context.refresh("materials"); context.setNotice("工作记录文件已保存。"); }} onError={context.setNotice} /></div></Card><SectionTitle title="最近记录" text="这些记录会成为后续项目整理、岗位对照和简历制作的基础。" /><Card className="material-list">{logs.length ? logs.map((log) => <article key={log.id}><span className="material-kind">工作</span><div><b>{log.body}</b><p>{formatDate(log.created_at)} {log.project_id ? "· 已关联项目" : "· 待整理"}</p></div><mark>{log.ai_allowed ? "允许 AI 整理" : "仅自己查看"}</mark></article>) : <p>还没有工作记录。</p>}</Card><SectionTitle title="能力变化" text="保留已经确认的阶段性变化，帮助回看成长过程。" action={<Button variant="outline" onClick={() => context.setDialog("commit")}>记录变化</Button>} /><Card className="commit-list">{context.dashboard.commits.map((commit) => <article key={commit.id}><small>{formatDate(commit.occurred_at)}</small><div><b>{commit.title}</b><p><span>变化前</span>{commit.before_text}</p><p><span>变化后</span>{commit.after_text}</p></div></article>)}</Card></>;
}
