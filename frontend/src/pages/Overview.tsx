import { AppContext, Page } from "../types";
import { Button, Card, SectionTitle } from "../components/ui";

export function Overview({ context, onNavigate }: { context: AppContext; onNavigate: (page: Page) => void }) {
  const { dashboard } = context;
  const workLogs = dashboard.materials.filter((item) => item.source_type === "手工记录");
  return <><section className="hero"><div><span className="eyebrow">● 我的职业档案</span><h1>让每一份经历，成为你的<br /><em>职业地图</em>。</h1><p>{dashboard.profile.summary}</p></div><div className="identity"><small>CURRENT IDENTITY</small><b>{dashboard.profile.name}</b><span>{dashboard.profile.headline}</span></div></section>
    <SectionTitle title="职业总览" text="这里查看你的项目、工作记录和下一步方向；当天工作请到工作记录页面填写。" action={<Button variant="primary" onClick={() => onNavigate("git")}>记录今天</Button>} />
    <div className="flow"><FlowStep index="01" title="建一个项目" text="写清背景、目标和你的职责，不需要一次写完。" /><FlowStep index="02" title="关联过程资料" text="笔记、文档、仓库和结果都回到该项目，保留来源。" /><FlowStep index="03" title="选择公开展示" text="确认可展示后，项目自动进入电子简历和面试页。" /></div>
    <SectionTitle title="正在沉淀的项目" text="项目是职业故事的骨架，不是待办清单。" action={<Button onClick={() => onNavigate("projects")}>查看项目 →</Button>} />
    <Card className="project-list">{dashboard.projects.slice(0, 3).map((project) => <ProjectRow key={project.id} project={project} evidence={context.evidence(project.id).length} />)}</Card>
    <div className="stats"><Card><b>{dashboard.projects.length}</b><span>个项目档案</span></Card><Card><b>{workLogs.length}</b><span>条工作记录</span></Card><Card><b>{dashboard.materials.length - workLogs.length}</b><span>份工作资料</span></Card></div>
  </>;
}

function FlowStep({ index, title, text }: { index: string; title: string; text: string }) { return <article><small>{index}</small><b>{title}</b><p>{text}</p></article>; }
function ProjectRow({ project, evidence }: { project: { id: string; name: string; goal: string; is_public: boolean; status: string }; evidence: number }) { return <article className="project-row"><i className={project.is_public ? "public-dot" : "private-dot"} /><div><b>{project.name}</b><p>{project.goal}</p><span>{project.status} · {evidence} 条过程资料</span></div><mark>{project.is_public ? "可展示" : "私密"}</mark></article>; }
