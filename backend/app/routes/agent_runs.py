from fastapi import APIRouter, Request

from ..schemas import AgentRunInput
from .common import success

router = APIRouter(prefix="/api")


@router.get("/agent/status")
def agent_status(request: Request):
    return success(request, request.app.state.agent.status())


@router.post("/agent-runs", status_code=201)
def create_agent_run(request: Request, payload: AgentRunInput):
    agent = request.app.state.agent
    agent.require_ready()
    run, materials = request.app.state.service.create_agent_run(payload.task, payload.material_ids)
    agent.start(run["id"], payload.task, materials)
    return success(request, run, 201)


@router.get("/agent-runs/{run_id}")
def get_agent_run(request: Request, run_id):
    return success(request, request.app.state.service.agent_run(run_id))


@router.post("/agent-runs/{run_id}/stop")
def stop_agent_run(request: Request, run_id):
    run = request.app.state.service.request_agent_stop(run_id)
    request.app.state.agent.stop(str(run_id))
    return success(request, run)


@router.post("/agent-runs/{run_id}/draft", status_code=201)
def create_agent_draft(request: Request, run_id):
    return success(request, request.app.state.service.create_draft_from_agent_run(run_id), 201)
