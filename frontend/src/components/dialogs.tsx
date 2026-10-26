import { FormEvent } from "react";
import { ApiError, api, Project } from "../api";
import { AppContext, Dialog } from "../types";
import { Button, Label } from "./ui";

export function DialogPanel({
  kind,
  onClose,
  context,
}: {
  kind: Dialog;
  onClose: () => void;
  context: AppContext;
}) {
  if (!kind) return null;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const projectPayload = {
        name: String(form.get("name")),
        goal: String(form.get("goal")),
        role: String(form.get("role")),
        status: form.get("status") as Project["status"],
        summary: String(form.get("summary")),
        is_public: form.get("is_public") === "true",
      };
      if (kind === "project") await api.createProject(projectPayload);
      if (kind === "project-edit" && context.editingProject)
        await api.updateProject(context.editingProject.id, projectPayload);
      if (kind === "commit")
        await api.createCommit({
          title: String(form.get("title")),
          before_text: String(form.get("before_text")),
          after_text: String(form.get("after_text")),
          project_id: String(form.get("project_id")),
          occurred_at: new Date().toISOString(),
        });
      await context.refresh(kind === "commit" ? "commits" : "projects");
      onClose();
      context.setNotice("已保存到职业工作台。");
    } catch (error) {
      context.setNotice(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "请求失败，请稍后再试。",
      );
    }
  };
  const title = {
    project: "新建项目",
    "project-edit": "编辑项目",
    commit: "记录一次能力变化",
  }[kind];
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2>{title}</h2>
            <p>只填写当前必要的信息，之后可以继续补充。</p>
          </div>
          <button onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <form onSubmit={submit}>
          {(kind === "project" || kind === "project-edit") && (
            <ProjectForm project={context.editingProject} />
          )}
          {kind === "commit" && (
            <CommitForm projects={context.dashboard.projects} />
          )}
          <footer>
            <Button type="button" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" variant="primary">
              保存
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ProjectForm({ project }: { project: Project | null }) {
  return (
    <>
      <Label label="项目名称">
        <input
          name="name"
          required
          defaultValue={project?.name}
          placeholder="例如：客户问答 Agent"
        />
      </Label>
      <Label label="背景与目标">
        <textarea
          name="goal"
          required
          defaultValue={project?.goal}
          placeholder="要解决什么问题，或想验证什么？"
        />
      </Label>
      <Label label="我的职责">
        <input
          name="role"
          required
          defaultValue={project?.role}
          placeholder="例如：设计流程、开发原型、验证效果"
        />
      </Label>
      <div className="form-row">
        <Label label="当前状态">
          <select name="status" defaultValue={project?.status ?? "进行中"}>
            <option>进行中</option>
            <option>已完成</option>
            <option>待整理</option>
          </select>
        </Label>
        <Label label="详情权限">
          <select
            name="is_public"
            defaultValue={String(project?.is_public ?? false)}
          >
            <option value="false">无权查看详情</option>
            <option value="true">允许查看详情</option>
          </select>
        </Label>
      </div>
      <Label label="项目摘要（可选）">
        <textarea
          name="summary"
          defaultValue={project?.summary}
          placeholder="用一两句说明项目现在证明了什么。"
        />
      </Label>
    </>
  );
}
function CommitForm({ projects }: { projects: Project[] }) {
  return (
    <>
      <Label label="提交说明">
        <input
          name="title"
          required
          placeholder="例如：feat(agent): 增加状态约束"
        />
      </Label>
      <div className="form-row">
        <Label label="变化前">
          <textarea name="before_text" required />
        </Label>
        <Label label="变化后">
          <textarea name="after_text" required />
        </Label>
      </div>
      <Label label="关联项目">
        <select name="project_id" required>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </Label>
    </>
  );
}
