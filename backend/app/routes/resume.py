import json

from fastapi import APIRouter, Request, Response

from .common import request_id_for, success

router = APIRouter(prefix="/api")


@router.get("/resume")
def resume(request: Request):
    service = request.app.state.service
    return success(request, {"profile": service.profile(), "projects": service.list_projects(public_only=True)})


@router.get("/exports/career-data")
def export_data(request: Request):
    return Response(content=json.dumps(request.app.state.storage.export(), ensure_ascii=False, indent=2), media_type="application/json", headers={"Content-Disposition": "attachment; filename=career-os-export.json", "X-Request-ID": request_id_for(request)})
