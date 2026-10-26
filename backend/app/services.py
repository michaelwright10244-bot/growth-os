"""Career use cases; HTTP and SQLite details stay at the edges."""

from __future__ import annotations

from datetime import datetime, timezone
import json
import sqlite3
from uuid import UUID, uuid4

from .storage import Storage, now


class NotFoundError(Exception):
    pass


class InvalidActionError(Exception):
    pass


class ConflictError(Exception):
    pass


def iso(value: object) -> object:
    return value.isoformat() if isinstance(value, datetime) else value


class CareerService:
    MAX_ANALYSIS_CONTEXT_CHARS = 36_000

    def __init__(self, storage: Storage):
        self.storage = storage

    def profile(self) -> dict:
        return self.storage.one("SELECT name, headline, summary, contact, updated_at FROM profile WHERE id = 'default'")

    def update_profile(self, payload: dict) -> dict:
        timestamp = now()
        self.storage.execute(
            "UPDATE profile SET name=?, headline=?, summary=?, contact=?, updated_at=? WHERE id='default'",
            (payload["name"], payload["headline"], payload["summary"], payload["contact"], timestamp),
        )
        return self.profile()

    def list_projects(self, public_only: bool = False) -> list[dict]:
        where = "WHERE p.is_public = 1" if public_only else ""
        return self.storage.many(
            f"""SELECT p.*, COUNT(m.id) AS evidence_count FROM projects p
                LEFT JOIN materials m ON m.project_id = p.id {where}
                GROUP BY p.id ORDER BY p.updated_at DESC"""
        )

    def project(self, project_id: UUID) -> dict:
        project = self.storage.one(
            """SELECT p.*, COUNT(m.id) AS evidence_count FROM projects p
               LEFT JOIN materials m ON m.project_id = p.id WHERE p.id=? GROUP BY p.id""", (str(project_id),)
        )
        if not project:
            raise NotFoundError("项目不存在")
        return project

    def create_project(self, payload: dict) -> dict:
        project_id, timestamp = str(uuid4()), now()
        self.storage.execute(
            "INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (project_id, payload["name"], payload["goal"], payload["role"], payload["status"], payload["summary"], int(payload["is_public"]), timestamp, timestamp),
        )
        return self.project(UUID(project_id))

    def update_project(self, project_id: UUID, payload: dict) -> dict:
        self.project(project_id)
        self.storage.execute(
            "UPDATE projects SET name=?, goal=?, role=?, status=?, summary=?, is_public=?, updated_at=? WHERE id=?",
            (payload["name"], payload["goal"], payload["role"], payload["status"], payload["summary"], int(payload["is_public"]), now(), str(project_id)),
        )
        return self.project(project_id)

    def set_visibility(self, project_id: UUID, is_public: bool) -> dict:
        project = self.project(project_id)
        payload = {key: project[key] for key in ("name", "goal", "role", "status", "summary")}
        payload["is_public"] = is_public
        return self.update_project(project_id, payload)

    def list_materials(self, project_id: UUID | None = None) -> list[dict]:
        if project_id:
            self.project(project_id)
            return self.storage.many("SELECT * FROM materials WHERE project_id=? ORDER BY created_at DESC", (str(project_id),))
        return self.storage.many("SELECT * FROM materials ORDER BY created_at DESC")

    def create_material(self, payload: dict) -> dict:
        if project_id := payload["project_id"]:
            self.project(project_id)
        material_id, timestamp = str(uuid4()), now()
        self.storage.execute(
            "INSERT INTO materials VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (material_id, payload["kind"], payload["body"], payload["source_type"], str(payload["source_url"]) if payload["source_url"] else None, str(project_id) if project_id else None, int(payload["ai_allowed"]), timestamp),
        )
        return self.storage.one("SELECT * FROM materials WHERE id=?", (material_id,))

    def list_commits(self) -> list[dict]:
        return self.storage.many("SELECT * FROM commits ORDER BY occurred_at DESC")

    def create_commit(self, payload: dict) -> dict:
        self.project(payload["project_id"])
        commit_id, timestamp = str(uuid4()), now()
        occurred_at = iso(payload["occurred_at"]) or timestamp
        self.storage.execute(
            "INSERT INTO commits VALUES (?, ?, ?, ?, ?, ?, ?)",
            (commit_id, payload["title"], payload["before_text"], payload["after_text"], str(payload["project_id"]), occurred_at, timestamp),
        )
        return self.storage.one("SELECT * FROM commits WHERE id=?", (commit_id,))

    def list_drafts(self) -> list[dict]:
        return self.storage.many("SELECT * FROM drafts WHERE status='pending' ORDER BY created_at DESC")

    def set_draft_status(self, draft_id: UUID, status: str) -> dict:
        draft = self.storage.one("SELECT * FROM drafts WHERE id=?", (str(draft_id),))
        if not draft:
            raise NotFoundError("草稿不存在")
        self.storage.execute("UPDATE drafts SET status=? WHERE id=?", (status, str(draft_id)))
        return self.storage.one("SELECT * FROM drafts WHERE id=?", (str(draft_id),))

    def create_draft_from_agent_run(self, run_id: UUID) -> dict:
        run = self.storage.one("SELECT * FROM agent_runs WHERE id=?", (str(run_id),))
        if not run:
            raise NotFoundError("Agent 任务不存在")
        if run["status"] != "completed":
            raise InvalidActionError("只有已完成的 Agent 任务才能生成草稿。")
        if not run["output"].strip():
            raise InvalidActionError("Agent 没有生成可审核的内容。")
        draft_id = str(uuid4())
        self.storage.execute(
            "INSERT INTO drafts (id, title, body, source_text, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
            (draft_id, "工作经验整理草稿", run["output"], run["task"], now()),
        )
        return self.storage.one("SELECT * FROM drafts WHERE id=?", (draft_id,))

    def create_agent_run(self, task: str, material_ids: list[UUID]) -> tuple[dict, list[dict]]:
        materials = self._selected_materials(material_ids)
        unique_ids = [material["id"] for material in materials]
        run_id, timestamp = str(uuid4()), now()
        try:
            self.storage.execute(
                "INSERT INTO agent_runs (id, task, material_ids_json, status, created_at) VALUES (?, ?, ?, 'queued', ?)",
                (run_id, task, json.dumps(unique_ids), timestamp),
            )
        except sqlite3.IntegrityError as error:
            raise ConflictError("已有 DeepSeek 编码任务正在运行，请先等待或停止它。") from error
        return self.agent_run(UUID(run_id)), materials

    def agent_run(self, run_id: UUID) -> dict:
        run = self.storage.one("SELECT * FROM agent_runs WHERE id=?", (str(run_id),))
        if not run:
            raise NotFoundError("编码任务不存在")
        run["material_ids"] = json.loads(run.pop("material_ids_json"))
        return run

    def request_agent_stop(self, run_id: UUID) -> dict:
        run = self.agent_run(run_id)
        if run["status"] not in {"queued", "running"}:
            raise InvalidActionError("任务未在运行，无法停止。")
        self.storage.execute("UPDATE agent_runs SET status='cancelled', finished_at=? WHERE id=?", (now(), str(run_id)))
        return self.agent_run(run_id)

    def list_jobs(self) -> list[dict]:
        return self.storage.many("SELECT * FROM jobs ORDER BY created_at DESC")

    def job(self, job_id: UUID) -> dict:
        job = self.storage.one("SELECT * FROM jobs WHERE id=?", (str(job_id),))
        if not job:
            raise NotFoundError("目标岗位不存在")
        return job

    def create_job(self, payload: dict) -> dict:
        job_id, timestamp = str(uuid4()), now()
        self.storage.execute(
            "INSERT INTO jobs VALUES (?, ?, ?, ?, ?, ?)",
            (job_id, payload["title"], payload["company"], str(payload["source_url"]) if payload["source_url"] else None, payload["description"], timestamp),
        )
        return self.job(UUID(job_id))

    def analysis_context(self, job_id: UUID, project_ids: list[UUID], material_ids: list[UUID]) -> tuple[dict, list[dict], list[dict], list[dict]]:
        job = self.job(job_id)
        project_values = list(dict.fromkeys(str(project_id) for project_id in project_ids))
        if not project_values or len(project_values) != len(project_ids):
            raise InvalidActionError("至少选择一个项目，且项目不能重复。")
        projects = self.storage.many(f"SELECT id, name, goal, role, status, summary FROM projects WHERE id IN ({','.join('?' for _ in project_values)})", tuple(project_values))
        if len(projects) != len(project_values):
            raise InvalidActionError("只能分析当前存在的项目。")
        materials = self._selected_materials(material_ids)
        commits = self.storage.many(f"SELECT project_id, title, before_text, after_text FROM commits WHERE project_id IN ({','.join('?' for _ in project_values)})", tuple(project_values))
        evidence = [str(value) for value in self.profile().values()] + [job["title"], job["company"], job["description"]]
        for item in projects + materials + commits:
            evidence.extend(str(value) for value in item.values() if isinstance(value, str))
        if sum(map(len, evidence)) > self.MAX_ANALYSIS_CONTEXT_CHARS:
            raise InvalidActionError("本次岗位分析资料过长；请减少项目或资料后再试。")
        return job, projects, materials, commits

    def create_job_analysis(self, job_id: UUID, project_ids: list[UUID], material_ids: list[UUID], body: str) -> dict:
        analysis_id, timestamp = str(uuid4()), now()
        self.storage.execute(
            "INSERT INTO job_analyses VALUES (?, ?, ?, ?, ?, ?)",
            (analysis_id, str(job_id), json.dumps([str(value) for value in project_ids]), json.dumps([str(value) for value in material_ids]), body, timestamp),
        )
        return self.job_analysis(UUID(analysis_id))

    def job_analysis(self, analysis_id: UUID) -> dict:
        analysis = self.storage.one("SELECT * FROM job_analyses WHERE id=?", (str(analysis_id),))
        if not analysis:
            raise NotFoundError("岗位分析不存在")
        analysis["project_ids"] = json.loads(analysis.pop("project_ids_json"))
        analysis["material_ids"] = json.loads(analysis.pop("material_ids_json"))
        return analysis

    def list_job_analyses(self) -> list[dict]:
        rows = self.storage.many("SELECT * FROM job_analyses ORDER BY created_at DESC")
        for row in rows:
            row["project_ids"] = json.loads(row.pop("project_ids_json"))
            row["material_ids"] = json.loads(row.pop("material_ids_json"))
        return rows

    def _selected_materials(self, material_ids: list[UUID]) -> list[dict]:
        unique_ids = list(dict.fromkeys(str(material_id) for material_id in material_ids))
        if len(unique_ids) != len(material_ids):
            raise InvalidActionError("同一条资料不能重复授权。")
        if not unique_ids:
            return []
        placeholders = ",".join("?" for _ in unique_ids)
        materials = self.storage.many(f"SELECT id, body, source_type, ai_allowed FROM materials WHERE id IN ({placeholders})", tuple(unique_ids))
        if len(materials) != len(unique_ids) or any(not material["ai_allowed"] for material in materials):
            raise InvalidActionError("只能发送本次选择且标记为“允许 AI 整理”的资料。")
        return materials
