import { ChangeEvent, useState } from "react";
import { api, Material, Project } from "../../api";
import { Button, Label } from "../../components/ui";
import { readWorkFile, WORK_FILE_ACCEPT } from "./fileImport";

export function WorkFileUpload({
  projects,
  materials,
  onSaved,
  onError,
}: {
  projects: Project[];
  materials: Material[];
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState("");
  const [aiAllowed, setAiAllowed] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null);
  const upload = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const body = await readWorkFile(file);
      if (materials.some((item) => item.source_type === "手工记录" && item.body === body)) {
        throw new Error("这份工作记录已经保存过了。");
      }
      await api.createMaterial({
        kind: "经历",
        body,
        source_type: "手工记录",
        project_id: projectId || null,
        ai_allowed: aiAllowed,
      });
      setFile(null);
      setProjectId("");
      setAiAllowed(false);
      await onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "上传失败，请稍后再试。");
    } finally {
      setSaving(false);
    }
  };
  return <div><Label label="选择工作记录文件"><input type="file" accept={WORK_FILE_ACCEPT} onChange={selectFile} /></Label>{file && <p>{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}<Label label="关联项目（可选）"><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">暂不关联</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Label><label><input type="checkbox" checked={aiAllowed} onChange={(event) => setAiAllowed(event.target.checked)} /> 允许 AI 帮我整理这份记录</label><Button type="button" variant="outline" disabled={!file || saving} onClick={() => void upload()}>{saving ? "正在上传…" : "上传记录"}</Button></div>;
}
