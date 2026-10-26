import { api, Draft } from "../api";
import { AppContext } from "../types";
import { Button, Card, Empty, SectionTitle } from "../components/ui";
import { messageFor } from "../utils";

export function Review({ context }: { context: AppContext }) {
  const update = async (draft: Draft, status: "confirmed" | "rejected") => {
    try { await api.setDraftStatus(draft.id, status); await context.refresh("drafts"); context.setNotice(status === "confirmed" ? "草稿已确认沉淀。" : "草稿已拒绝，原始资料保持不变。"); } catch (error) { context.setNotice(messageFor(error)); }
  };
  return <><SectionTitle title="内容确认" text="AI 整理结果必须经过人工确认；原始资料始终只读保留。" /><div className="review-list">{context.dashboard.drafts.length ? context.dashboard.drafts.map((draft) => <Card key={draft.id} className="review-card"><div><small>来源（只读）</small><p>{draft.source_text}</p></div><div><small>整理结果</small><h3>{draft.title}</h3><p>{draft.body}</p><footer><Button onClick={() => void update(draft, "rejected")}>拒绝</Button><Button variant="primary" onClick={() => void update(draft, "confirmed")}>确认沉淀</Button></footer></div></Card>) : <Card><Empty text="没有待确认内容。" /></Card>}</div></>;
}
