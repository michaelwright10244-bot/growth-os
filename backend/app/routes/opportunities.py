from fastapi import APIRouter, Request

from ..schemas import JobAnalysisInput, JobInput
from .common import success

router = APIRouter(prefix="/api")


@router.get("/jobs")
def list_jobs(request: Request):
    return success(request, request.app.state.service.list_jobs())


@router.post("/jobs", status_code=201)
def create_job(request: Request, payload: JobInput):
    return success(request, request.app.state.service.create_job(payload.model_dump()), 201)


@router.get("/job-analyses")
def list_job_analyses(request: Request):
    return success(request, request.app.state.service.list_job_analyses())


@router.post("/jobs/{job_id}/analyses", status_code=201)
def create_job_analysis(request: Request, job_id, payload: JobAnalysisInput):
    service = request.app.state.service
    job, projects, materials, commits = service.analysis_context(job_id, payload.project_ids, payload.material_ids)
    body = request.app.state.advisor.analyze(job, service.profile(), projects, materials, commits)
    return success(request, service.create_job_analysis(job_id, payload.project_ids, payload.material_ids, body), 201)
