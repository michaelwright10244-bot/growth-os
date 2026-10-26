import { useCallback, useEffect, useState } from "react";
import { api, Project } from "./api";
import { DialogPanel } from "./components/dialogs";
import { Button, Card } from "./components/ui";
import { CareerGit } from "./pages/CareerGit";
import { Library } from "./pages/Library";
import { Opportunities } from "./pages/Opportunities";
import { Overview } from "./pages/Overview";
import { Projects } from "./pages/Projects";
import { Review } from "./pages/Review";
import { Settings } from "./pages/Settings";
import { Resume } from "./resume/Resume";
import { AppContext, Dashboard, Dialog, Page, RefreshArea } from "./types";
import { messageFor } from "./utils";

const navigation: Array<[Page, string, string]> = [
  ["overview", "职业首页", "▣"],
  ["library", "工作资料", "▤"],
  ["projects", "项目档案", "◫"],
  ["git", "工作记录", "⌘"],
  ["opportunities", "岗位对照", "⌁"],
  ["resume", "简历制作", "↗"],
];
const pageMeta: Record<Page, [string, string]> = {
  overview: ["CAREER VIEW", "职业首页"],
  projects: ["PROJECT HUB", "项目档案"],
  resume: ["INTERVIEW READY", "简历制作"],
  git: ["WORK LOG", "工作记录"],
  library: ["WORK FILES", "工作资料"],
  review: ["CONTENT REVIEW", "内容确认"],
  settings: ["LOCAL DATA", "数据设置"],
  opportunities: ["JOB FIT", "岗位对照"],
};
const emptyDashboard: Dashboard = {
  profile: { name: "", headline: "", summary: "", contact: "", updated_at: "" },
  projects: [],
  materials: [],
  commits: [],
  drafts: [],
};

function currentPage(): Page {
  const page = location.hash.replace(/^#\/?/, "") as Page;
  return pageMeta[page] ? page : "overview";
}
function Nav({
  active,
  icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      <span>
        <i>{icon}</i>
        {label}
      </span>
      {badge ? <b>{badge}</b> : null}
    </button>
  );
}

function App() {
  const [page, setPage] = useState<Page>(currentPage),
    [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard),
    [dialog, setDialog] = useState<Dialog>(null),
    [editingProject, setEditingProject] = useState<Project | null>(null),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState<string | null>(null);
  const refresh = useCallback(async (...requested: RefreshArea[]) => {
    const areas = requested.length ? new Set(requested) : new Set<RefreshArea>(["profile", "projects", "materials", "commits", "drafts"]);
    const initialLoad = requested.length === 0;
    if (initialLoad) setLoading(true);
    try {
      const next: Partial<Dashboard> = {};
      await Promise.all([
        areas.has("profile") ? api.profile().then((value) => { next.profile = value; }) : Promise.resolve(),
        areas.has("projects") ? api.projects().then((value) => { next.projects = value.items; }) : Promise.resolve(),
        areas.has("materials") ? api.materials().then((value) => { next.materials = value.items; }) : Promise.resolve(),
        areas.has("commits") ? api.commits().then((value) => { next.commits = value; }) : Promise.resolve(),
        areas.has("drafts") ? api.drafts().then((value) => { next.drafts = value; }) : Promise.resolve(),
      ]);
      setDashboard((current) => ({ ...current, ...next }));
    } catch (error) {
      setNotice(messageFor(error));
    } finally {
      if (initialLoad) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const sync = () => setPage(currentPage());
    addEventListener("hashchange", sync);
    return () => removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const go = (next: Page) => {
      location.hash = next;
    },
    publicProjects = dashboard.projects.filter((project) => project.is_public),
    evidence = (projectId: string) =>
      dashboard.materials.filter((item) => item.project_id === projectId),
    editProject = (project: Project) => {
      setEditingProject(project);
      setDialog("project-edit");
    },
    closeDialog = () => {
      setDialog(null);
      setEditingProject(null);
    };
  const context: AppContext = {
    dashboard,
    publicProjects,
    evidence,
    setDialog,
    refresh,
    setNotice,
    editingProject,
    editProject,
  };
  const views: Record<Page, React.ReactNode> = {
    overview: <Overview context={context} onNavigate={go} />,
    projects: <Projects context={context} />,
    resume: <Resume context={context} />,
    opportunities: <Opportunities context={context} />,
    git: <CareerGit context={context} />,
    library: <Library context={context} />,
    review: <Review context={context} />,
    settings: <Settings context={context} />,
  };
  return (
    <>
      <div
        className={`app-shell ${page === "overview" ? "" : "without-context"}`}
      >
        <aside className="sidebar">
          <div className="brand">
            <b>职</b>
            <span>
              职业操作系统<small>CAREER OS / PRIVATE</small>
            </span>
          </div>
          <p className="nav-label">职业工作</p>
          <nav>
            {navigation.map(([id, label, icon]) => (
              <Nav
                key={id}
                active={page === id}
                icon={icon}
                label={label}
                onClick={() => go(id)}
              />
            ))}
          </nav>
          <p className="nav-label">确认设置</p>
          <nav>
            <Nav
              active={page === "review"}
              icon="◷"
              label="内容确认"
              badge={dashboard.drafts.length}
              onClick={() => go("review")}
            />
          </nav>
          <button className="settings-link" onClick={() => go("settings")}>
            数据设置
          </button>
        </aside>
        <main className="main">
          <header className="topbar">
            <span>{pageMeta[page][0]}</span>
          </header>
          {loading ? (
            <div className="loading">正在打开你的职业工作台…</div>
          ) : (
            views[page]
          )}
        </main>
        {page === "overview" && (
          <aside className="context-panel">
            <h2>当前工作台</h2>
            <span className="local-tag">本地保存</span>
            <Card className="inbox-card">
              <small>工作资料</small>
              <h3>先保留来源，再形成判断。</h3>
              <p>笔记、项目文档、代码仓库和本地文件都能成为将来的面试证据。</p>
              <b>{String(dashboard.materials.length).padStart(2, "0")}</b>
              <span> 条已留存资料</span>
            </Card>
            <Card>
              <small>对外展示</small>
              <p>
                <strong>{publicProjects.length}</strong>{" "}
                个项目已明确设为可展示，会进入简历制作。
              </p>
              <Button variant="outline" onClick={() => go("resume")}>
                查看简历制作
              </Button>
            </Card>
            <blockquote>
              “资料被关联到项目，并选择公开后，才会成为可展示的职业证据。”
            </blockquote>
          </aside>
        )}
      </div>
      <DialogPanel kind={dialog} onClose={closeDialog} context={context} />
      {notice && <div className="toast">{notice}</div>}
    </>
  );
}

export default App;
