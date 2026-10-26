from fastapi import APIRouter, Request

from ..schemas import ProfileInput
from .common import success

router = APIRouter(prefix="/api")


@router.get("/profile")
def get_profile(request: Request):
    return success(request, request.app.state.service.profile())


@router.patch("/profile")
def update_profile(request: Request, payload: ProfileInput):
    return success(request, request.app.state.service.update_profile(payload.model_dump()))
