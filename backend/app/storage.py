"""SQLite persistence boundary for the single-user local application."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import sqlite3


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Storage:
    SCHEMA_VERSION = 2

    def __init__(self, database_path: Path):
        self.database_path = database_path

    @contextmanager
    def connection(self):
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def initialize(self) -> None:
        with self.connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS profile (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, headline TEXT NOT NULL,
                    summary TEXT NOT NULL, contact TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, goal TEXT NOT NULL, role TEXT NOT NULL,
                    status TEXT NOT NULL, summary TEXT NOT NULL, is_public INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS materials (
                    id TEXT PRIMARY KEY, kind TEXT NOT NULL, body TEXT NOT NULL, source_type TEXT NOT NULL,
                    source_url TEXT, project_id TEXT REFERENCES projects(id), ai_allowed INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS commits (
                    id TEXT PRIMARY KEY, title TEXT NOT NULL, before_text TEXT NOT NULL, after_text TEXT NOT NULL,
                    project_id TEXT NOT NULL REFERENCES projects(id), occurred_at TEXT NOT NULL, created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS drafts (
                    id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, source_text TEXT NOT NULL,
                    status TEXT NOT NULL, created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS agent_runs (
                    id TEXT PRIMARY KEY, task TEXT NOT NULL, material_ids_json TEXT NOT NULL,
                    status TEXT NOT NULL, started_at TEXT, finished_at TEXT, exit_code INTEGER,
                    output TEXT NOT NULL DEFAULT '', error_text TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS one_active_agent_run
                    ON agent_runs(status) WHERE status IN ('queued', 'running');
                CREATE INDEX IF NOT EXISTS materials_project_created
                    ON materials(project_id, created_at DESC);
                CREATE INDEX IF NOT EXISTS commits_project_occurred
                    ON commits(project_id, occurred_at DESC);
                CREATE INDEX IF NOT EXISTS drafts_status_created
                    ON drafts(status, created_at DESC);
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY, title TEXT NOT NULL, company TEXT NOT NULL,
                    source_url TEXT, description TEXT NOT NULL, created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS job_analyses (
                    id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id),
                    project_ids_json TEXT NOT NULL, material_ids_json TEXT NOT NULL,
                    body TEXT NOT NULL, created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS jobs_created
                    ON jobs(created_at DESC);
                CREATE INDEX IF NOT EXISTS job_analyses_created
                    ON job_analyses(created_at DESC);
                """
            )
            self._migrate(conn)
            if conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0] == 0:
                self._seed(conn)
            self._migrate_resume_demo(conn)
            if conn.execute("SELECT COUNT(*) FROM drafts").fetchone()[0] == 0:
                conn.execute(
                    "INSERT INTO drafts VALUES (?, ?, ?, ?, ?, ?)",
                    ("ddddddd1-dddd-4ddd-8ddd-ddddddddddd1", "确认今日记录的知识卡片", "状态约束降低 Agent 重复追问。建议沉淀为「提示词与行为约束」主题下的结论。", "来源：8 月 4 日 · Prompt / Agent 优化记录", "pending", now()),
                )

    def recover_agent_runs(self) -> int:
        """Mark tasks left active by a previous process as failed; tasks are not resumable."""
        with self.connection() as conn:
            result = conn.execute(
                """UPDATE agent_runs
                   SET status='failed', finished_at=?, error_text=?
                 WHERE status IN ('queued', 'running')""",
                (now(), "服务已重启，未完成的编码任务未恢复。"),
            )
            return result.rowcount

    def _migrate(self, conn: sqlite3.Connection) -> None:
        version = conn.execute("PRAGMA user_version").fetchone()[0]
        if version > self.SCHEMA_VERSION:
            raise RuntimeError(f"数据库版本 {version} 高于当前程序支持的版本 {self.SCHEMA_VERSION}")
        if version < self.SCHEMA_VERSION:
            # Keep schema upgrades explicit and ordered without adding a migration dependency.
            conn.execute(f"PRAGMA user_version = {self.SCHEMA_VERSION}")

    def _seed(self, conn: sqlite3.Connection) -> None:
        timestamp = now()
        conn.execute(
            "INSERT OR IGNORE INTO profile VALUES (?, ?, ?, ?, ?, ?)",
            ("default", "提示词工程师", "Prompt · Agent · Vibe Coding", "围绕真实业务问题，持续把 Prompt、Agent 工作流和可运行的 AI 应用沉淀为可验证的项目能力。", "可在正式版本填写邮箱 / 作品链接", timestamp),
        )
        projects = [
            ("11111111-1111-4111-8111-111111111111", "销售 Agent 稳定性优化", "减少重复追问与流程漂移", "分析问题、设计状态约束并验证结果", "进行中", "把 Prompt、状态约束和边界样例沉淀为稳定的 Agent 流程。", 1),
            ("22222222-2222-4222-8222-222222222222", "RAG Demo", "验证 RAG 的完整链路", "完成检索链路实验、结果记录与复盘", "进行中", "从学习笔记走向可运行的检索增强应用。", 1),
            ("33333333-3333-4333-8333-333333333333", "信息系统项目 A", "整理历史项目的业务价值与职责", "待从方案与交付资料中确认", "待整理", "历史项目材料已进入系统，等待补齐完整的项目叙事。", 0),
        ]
        conn.executemany("INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [(*project, timestamp, timestamp) for project in projects])
        materials = [
            ("aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "资料", "Prompt 优化复盘", "外部笔记", None, projects[0][0], 1, timestamp),
            ("aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2", "资料", "RAG 切分学习笔记", "外部笔记", None, projects[1][0], 1, timestamp),
            ("aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3", "资料", "会议结论：评估方案", "项目文档", None, projects[1][0], 1, timestamp),
            ("aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4", "资料", "历史项目方案.docx", "本地文件", None, projects[2][0], 0, timestamp),
        ]
        conn.executemany("INSERT INTO materials VALUES (?, ?, ?, ?, ?, ?, ?, ?)", materials)
        commits = [
            ("ccccccc1-cccc-4ccc-8ccc-ccccccccccc1", "feat(agent): 增加状态约束", "只能依靠单轮 Prompt 约束行为", "将状态条件写入流程，减少重复追问", projects[0][0], "2026-08-04T00:00:00+00:00", timestamp),
            ("ccccccc2-cccc-4ccc-8ccc-ccccccccccc2", "build(rag): 跑通检索链路", "停留在文档切分学习", "开始用可运行 Demo 验证检索方案", projects[1][0], "2026-08-01T00:00:00+00:00", timestamp),
        ]
        conn.executemany("INSERT INTO commits VALUES (?, ?, ?, ?, ?, ?, ?)", commits)

    def _migrate_resume_demo(self, conn: sqlite3.Connection) -> None:
        """Replace only the untouched demo records with the imported resume projects."""
        legacy = {
            "11111111-1111-4111-8111-111111111111": "销售 Agent 稳定性优化",
            "22222222-2222-4222-8222-222222222222": "RAG Demo",
            "33333333-3333-4333-8333-333333333333": "信息系统项目 A",
        }
        rows = conn.execute("SELECT id, name FROM projects WHERE id IN (?, ?, ?)", tuple(legacy)).fetchall()
        if {row["id"]: row["name"] for row in rows} != legacy:
            return

        projects = [
            ("AI 创作古诗辅助教学", "让古诗创作从单次生成变成可用于分龄教学的互动体验。", "完成模型对比、提示词设计、Flask 交互流程与 API 联调。", "已完成", "完成主题选择、关键词输入、诗句生成与背景图联动的四步教学流程。", 1, "11111111-1111-4111-8111-111111111111"),
            ("PE 提示词优化", "降低复杂任务的推理成本，并提升输出准确性和格式稳定性。", "完成原型验证、结构化提示词设计、数据预处理与 Dify JSON 工作流配置。", "已完成", "推理成本降低 60%，准确率达到 92% 以上，并建立人工与脚本双重核验。", 1, "22222222-2222-4222-8222-222222222222"),
            ("基于大语言模型中医智能交互系统", "让中医知识问答同时支持复杂诊疗推理与短文本快速检索。", "主导项目方案、结构化提示词设计、BERT 向量检索与术语库整理。", "已完成", "问答响应准确率提升 40%，检索准确率达 85%，用户满意度提升 30%。", 1, "33333333-3333-4333-8333-333333333333"),
        ]
        conn.executemany(
            "UPDATE projects SET name=?, goal=?, role=?, status=?, summary=?, is_public=?, updated_at=? WHERE id=?",
            [(*project[:-1], now(), project[-1]) for project in projects],
        )
        conn.executemany(
            "UPDATE materials SET body=?, source_type=?, project_id=?, ai_allowed=? WHERE id=?",
            [
                ("模型对比与古诗教学流程说明", "项目文档", projects[0][-1], 1, "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1"),
                ("PE 提示词优化与成本准确率复盘", "项目文档", projects[1][-1], 1, "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2"),
                ("中医智能交互系统方案与检索记录", "项目文档", projects[2][-1], 1, "aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3"),
                ("中医术语库与 BERT 检索说明", "项目文档", projects[2][-1], 0, "aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4"),
            ],
        )
        conn.execute(
            "UPDATE profile SET name=?, headline=?, summary=?, contact=?, updated_at=? WHERE id='default' AND name='提示词工程师'",
            ("门璐", "AI 应用 · 数据可视化 · 前端开发", "具备 AI 应用、数据可视化与前端开发实践经验，持续将模型、数据与交互能力落为可交付项目。", "15114962153 · AROCS8-8@outlook.com", now()),
        )

    def one(self, query: str, values: tuple = ()) -> dict | None:
        with self.connection() as conn:
            row = conn.execute(query, values).fetchone()
            return self._row(row) if row else None

    def many(self, query: str, values: tuple = ()) -> list[dict]:
        with self.connection() as conn:
            return [self._row(row) for row in conn.execute(query, values).fetchall()]

    @staticmethod
    def _row(row: sqlite3.Row) -> dict:
        value = dict(row)
        for key in ("is_public", "ai_allowed"):
            if key in value:
                value[key] = bool(value[key])
        return value

    def execute(self, query: str, values: tuple = ()) -> None:
        with self.connection() as conn:
            conn.execute(query, values)

    def export(self) -> dict:
        return {
            "schema_version": self.SCHEMA_VERSION,
            "profile": self.many("SELECT * FROM profile"),
            "projects": self.many("SELECT * FROM projects"),
            "materials": self.many("SELECT * FROM materials"),
            "commits": self.many("SELECT * FROM commits"),
            "drafts": self.many("SELECT * FROM drafts"),
            "agent_runs": self.many("SELECT * FROM agent_runs"),
            "jobs": self.many("SELECT * FROM jobs"),
            "job_analyses": self.many("SELECT * FROM job_analyses"),
        }
