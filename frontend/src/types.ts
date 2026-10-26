import { CareerCommit, Draft, Material, Profile, Project } from "./api";

export type Page =
  | "overview"
  | "projects"
  | "resume"
  | "opportunities"
  | "git"
  | "library"
  | "review"
  | "settings";
export type Dialog = "project" | "project-edit" | "commit" | null;
export type Dashboard = {
  profile: Profile;
  projects: Project[];
  materials: Material[];
  commits: CareerCommit[];
  drafts: Draft[];
};
export type RefreshArea = "profile" | "projects" | "materials" | "commits" | "drafts";
export type AppContext = {
  dashboard: Dashboard;
  publicProjects: Project[];
  evidence: (projectId: string) => Material[];
  setDialog: (dialog: Dialog) => void;
  refresh: (...areas: RefreshArea[]) => Promise<void>;
  setNotice: (message: string) => void;
  editingProject: Project | null;
  editProject: (project: Project) => void;
};
