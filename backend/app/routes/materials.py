from fastapi import APIRouter, Request

from ..schemas import MaterialInput
from .common import success

router = APIRouter(prefix="/api")


@router.get("/materials")
def list_materials(request: Request):
    items = request.app.state.service.list_materials()
    return success(request, {"items": items, "page": 1, "page_size": len(items), "total": len(items)})


@router.post("/materials", status_code=201)
def create_material(request: Request, payload: MaterialInput):
    return success(request, request.app.state.service.create_material(payload.model_dump()), 201)
