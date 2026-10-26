import { useState } from "react";
import { api, Project } from "../api";
import { AppContext } from "../types";
import { Button, Card, SectionTitle } from "../components/ui";
import { messageFor } from "../utils";

function ProjectDetail({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  return (
    <Card className="project-detail">
      <header>
        <div>
          <small>项目详情</small>
          <h3>{project.name}</h3>
        </div>
        <button className="text-button" onClick={onClose}>
          关闭
        </button>
      </header>
      <dl>
        <div>
          <dt>要解决的问题</dt>
          <dd>{project.goal}</dd>
        </div>
        <div>
          <dt>我的贡献</dt>
          <dd>{project.role}</dd>
        </div>
        <div>
          <dt>结果</dt>
          <dd>{project.summary || "待补充"}</dd>
        </div>
      </dl>
    </Card>
  );
}

export function Projects({ context }: { context: AppContext }) {
  const { dashboard, evidence, setDialog, refresh, setNotice } = context;
  const [detail, setDetail] = useState<Project | null>(null);
  const toggle = async (project: Project) => {
    try {
      await api.toggleProject(project.id, !project.is_public);
      await refresh("projects");
      setNotice(
        project.is_public ? "已收回详情查看权限。" : "已允许查看项目详情。",
      );
    } catch (error) {
      setNotice(messageFor(error));
    }
  };
  const openDetail = (project: Project) => {
    if (!project.is_public) {
      setNotice("你无权观看该项目详情。");
      return;
    }
    setDetail(project);
  };

  return (
    <>
      <SectionTitle
        title="项目档案"
        text="这里只展示你的项目资产；详情权限由“可展示”状态控制。"
        action={
          <Button variant="primary" onClick={() => setDialog("project")}>
            新建项目
          </Button>
        }
      />
      {detail && (
        <ProjectDetail project={detail} onClose={() => setDetail(null)} />
      )}
      <div className="project-grid">
        {dashboard.projects.map((project) => (
          <Card key={project.id} className="project-card">
            <div className="card-top">
              <span>{project.status}</span>
              <span>
                <button
                  className="text-button"
                  onClick={() => openDetail(project)}
                >
                  详情
                </button>
                <button
                  className="text-button"
                  onClick={() => context.editProject(project)}
                >
                  编辑
                </button>
                <button
                  className="text-button"
                  onClick={() => void toggle(project)}
                >
                  {project.is_public ? "收回权限" : "允许详情"}
                </button>
              </span>
            </div>
            <h3>{project.name}</h3>
            <p>{project.summary || project.goal}</p>
            <dl>
              <div>
                <dt>我的职责</dt>
                <dd>{project.role}</dd>
              </div>
              <div>
                <dt>过程证据</dt>
                <dd>{evidence(project.id).length} 条资料</dd>
              </div>
            </dl>
            <footer>
              <span
                className={
                  project.is_public ? "status-public" : "status-private"
                }
              >
                {project.is_public ? "● 可查看详情" : "○ 无查看权限"}
              </span>
            </footer>
          </Card>
        ))}
      </div>
    </>
  );
}
