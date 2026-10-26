import { AppContext } from "../types";
import { Card, Empty, SectionTitle } from "../components/ui";
import { formatDate } from "../utils";

export function Library({ context }: { context: AppContext }) {
  const materials = context.dashboard.materials.filter((material) => material.source_type !== "手工记录");
  return <><SectionTitle title="工作资料" text="集中查看工作文档、外部笔记、代码仓库和链接等原始资料。当天工作请到工作记录页面填写。" /><Card className="material-list">{materials.length ? materials.map((material) => <article key={material.id}><span className="material-kind">{material.kind}</span><div><b>{material.body}</b><p>{material.source_type} · {formatDate(material.created_at)} {material.project_id ? "· 已关联项目" : "· 待整理"}</p></div><mark>{material.ai_allowed ? "允许 AI 整理" : "禁止 AI 使用"}</mark></article>) : <Empty text="还没有工作资料。" />}</Card></>;
}
