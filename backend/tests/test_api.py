from io import StringIO

import pytest
from fastapi.testclient import TestClient

from app import main
from app.agent import DeepSeekAgent
from app.config import Settings
from app.services import CareerService, ConflictError, InvalidActionError
from app.storage import Storage


@pytest.fixture(autouse=True)
def isolated_database(tmp_path):
    main.storage = Storage(tmp_path / "career-os.db")
    main.service = CareerService(main.storage)
    yield


def test_resume_only_exposes_public_projects():
    with TestClient(main.app) as client:
        response = client.get("/api/resume")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["projects"]
        assert all(project["is_public"] for project in data["projects"])
        assert "materials" not in data


def test_export_includes_schema_version_and_agent_runs():
    with TestClient(main.app) as client:
        response = client.get("/api/exports/career-data")
        assert response.status_code == 200
        data = response.json()
        assert data["schema_version"] == Storage.SCHEMA_VERSION
        assert "agent_runs" in data


def test_existing_database_records_schema_version(tmp_path):
    storage = Storage(tmp_path / "career-os.db")
    storage.initialize()
    assert storage.one("PRAGMA user_version")["user_version"] == Storage.SCHEMA_VERSION
    indexes = {row["name"] for row in storage.many("SELECT name FROM sqlite_master WHERE type='index'")}
    assert {"materials_project_created", "commits_project_occurred", "drafts_status_created"} <= indexes


def test_agent_runs_left_by_previous_process_are_marked_failed(tmp_path):
    storage = Storage(tmp_path / "career-os.db")
    storage.initialize()
    storage.execute(
        "INSERT INTO agent_runs (id, task, material_ids_json, status, created_at) VALUES (?, ?, ?, ?, ?)",
        ("stale", "check", "[]", "running", "now"),
    )
    assert storage.recover_agent_runs() == 1
    run = storage.one("SELECT status, error_text, finished_at FROM agent_runs WHERE id=?", ("stale",))
    assert run["status"] == "failed"
    assert run["error_text"] == "服务已重启，未完成的编码任务未恢复。"
    assert run["finished_at"]


def test_imported_resume_projects_replace_the_original_demo_records():
    with TestClient(main.app) as client:
        projects = client.get("/api/projects").json()["data"]["items"]
        assert {project["name"] for project in projects} == {
            "AI 创作古诗辅助教学",
            "PE 提示词优化",
            "基于大语言模型中医智能交互系统",
        }


def test_material_rejects_unknown_project():
    with TestClient(main.app) as client:
        response = client.post("/api/materials", json={"body": "一条待保存的记录", "project_id": "00000000-0000-4000-8000-000000000000"})
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "not_found"


def test_confirming_a_draft_removes_it_from_pending_queue_only():
    with TestClient(main.app) as client:
        draft = client.get("/api/drafts").json()["data"][0]
        response = client.patch(f"/api/drafts/{draft['id']}", json={"status": "confirmed"})
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "confirmed"
        assert client.get("/api/drafts").json()["data"] == []


def test_agent_refuses_runs_until_explicitly_enabled():
    with TestClient(main.app) as client:
        response = client.post("/api/agent-runs", json={"task": "检查项目结构", "material_ids": []})
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "invalid_action"


def test_agent_run_guards_authorization_concurrency_and_stop():
    with TestClient(main.app):
        allowed = main.service.list_materials()[0]
        with pytest.raises(InvalidActionError):
            main.service.create_agent_run("检查项目", [allowed["id"], allowed["id"]])
        run, _ = main.service.create_agent_run("检查项目", [allowed["id"]])
        with pytest.raises(ConflictError):
            main.service.create_agent_run("第二个任务", [])
        assert main.service.request_agent_stop(run["id"])["status"] == "cancelled"
        assert main.service.create_agent_run("停止后可再开始", [])[0]["status"] == "queued"


def test_agent_keeps_key_out_of_environment_and_redacts_output(tmp_path):
    secret = "unit-test-secret"
    settings = Settings(
        app_env="test", database_path=tmp_path / "career-os.db", frontend_dist=tmp_path,
        log_level="INFO", enable_deepseek_agent=True, deepseek_api_key=secret,
        deepseek_base_url="", deepseek_model="deepseek-chat", deepseek_agent_timeout_seconds=10, agent_runtime_dir=tmp_path / "runtime",
    )
    agent = DeepSeekAgent(settings, Storage(settings.database_path))
    environment = agent._environment("run")
    credentials = settings.agent_runtime_dir / "sessions" / "run" / ".credentials.yaml"
    assert "DEEPSEEK_API_KEY" not in environment
    assert credentials.read_text(encoding="utf-8") == 'version: 1\nrefs:\n  DEEPSEEK_API_KEY: "unit-test-secret"\n'
    assert credentials.stat().st_mode & 0o777 == 0o600
    assert secret not in agent._safe_output(f"before {secret} after")


def test_agent_output_is_bounded(tmp_path):
    settings = Settings(
        app_env="test", database_path=tmp_path / "career-os.db", frontend_dist=tmp_path,
        log_level="INFO", enable_deepseek_agent=True, deepseek_api_key="secret",
        deepseek_base_url="", deepseek_model="deepseek-chat", deepseek_agent_timeout_seconds=10, agent_runtime_dir=tmp_path / "runtime",
    )
    agent = DeepSeekAgent(settings, Storage(settings.database_path))
    output = agent._safe_output("x" * 60_000)
    assert len(output) <= 48_000
    assert "输出已截断" in output


def test_agent_saves_live_cli_output(tmp_path):
    settings = Settings(
        app_env="test", database_path=tmp_path / "career-os.db", frontend_dist=tmp_path,
        log_level="INFO", enable_deepseek_agent=True, deepseek_api_key="secret",
        deepseek_base_url="", deepseek_model="deepseek-chat", deepseek_agent_timeout_seconds=10, agent_runtime_dir=tmp_path / "runtime",
    )
    storage = Storage(settings.database_path)
    storage.initialize()
    storage.execute("INSERT INTO agent_runs (id, task, material_ids_json, status, created_at) VALUES (?, ?, ?, ?, ?)", ("run", "check", "[]", "running", "now"))
    agent = DeepSeekAgent(settings, storage)
    agent._stream_output("run", StringIO("first step\nsecret\n"))
    assert "first step" in storage.one("SELECT output FROM agent_runs WHERE id=?", ("run",))["output"]
    assert "secret" not in storage.one("SELECT output FROM agent_runs WHERE id=?", ("run",))["output"]


def test_job_analysis_only_runs_after_explicit_request():
    class AdvisorStub:
        def __init__(self):
            self.calls = 0

        def analyze(self, job, profile, projects, materials, commits):
            self.calls += 1
            assert job["title"] == "AI 应用工程师"
            assert projects
            assert all(commit["project_id"] == projects[0]["id"] for commit in commits)
            return "已有匹配证据\n- 可运行 RAG Demo\n\n关键缺口\n- 补评测记录"

    stub, previous = AdvisorStub(), main.advisor
    main.advisor = stub
    try:
        with TestClient(main.app) as client:
            job = client.post("/api/jobs", json={"title": "AI 应用工程师", "company": "示例公司", "description": "负责 AI 应用开发、RAG 评测与上线迭代，具备 Python 和工程化经验。"})
            assert job.status_code == 201
            assert stub.calls == 0
            project = main.service.list_projects()[0]
            response = client.post(f"/api/jobs/{job.json()['data']['id']}/analyses", json={"project_ids": [project["id"]], "material_ids": []})
            assert response.status_code == 201
            assert "补评测记录" in response.json()["data"]["body"]
            assert stub.calls == 1
            assert len(client.get("/api/job-analyses").json()["data"]) == 1
    finally:
        main.advisor = previous


def test_job_analysis_rejects_oversized_context():
    storage = main.storage
    with TestClient(main.app):
        job = main.service.create_job({"title": "AI 应用工程师", "company": "示例公司", "source_url": None, "description": "岗位要求 " * 4_000})
        project = main.service.list_projects()[0]
        for index in range(2):
            main.service.create_material({"kind": "资料", "body": "职业证据 " * 2_000, "source_type": "手工记录", "source_url": None, "project_id": None, "ai_allowed": True})
        materials = main.service.list_materials()[:2]
        with pytest.raises(InvalidActionError, match="资料过长"):
            main.service.analysis_context(job["id"], [project["id"]], [material["id"] for material in materials])
