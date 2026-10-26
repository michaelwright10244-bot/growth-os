from fastapi import APIRouter, Request

from ..schemas import ProjectInput, VisibilityInput
from .common import success

router = APIRouter(prefix="/api")


@router.get("/projects")
def list_projects(request: Request):
    items = request.app.state.service.list_projects()
    return success(request, {"items": items, "page": 1, "page_size": len(items), "total": len(items)})


@router.post("/projects", status_code=201)
def create_project(request: Request, payload: ProjectInput):
    return success(request, request.app.state.service.create_project(payload.model_dump()), 201)


@router.get("/projects/{project_id}")
def get_project(request: Request, project_id):
    return success(request, request.app.state.service.project(project_id))


@router.patch("/projects/{project_id}")
def update_project(request: Request, project_id, payload: ProjectInput):
    return success(request, request.app.state.service.update_project(project_id, payload.model_dump()))


@router.patch("/projects/{project_id}/visibility")
def set_visibility(request: Request, project_id, payload: VisibilityInput):
    return success(request, request.app.state.service.set_visibility(project_id, payload.is_public))


@router.get("/projects/{project_id}/materials")
def project_materials(request: Request, project_id):
    return success(request, request.app.state.service.list_materials(project_id))
