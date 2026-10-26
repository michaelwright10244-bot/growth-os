from fastapi import APIRouter, Request

from ..schemas import CommitInput, DraftStatusInput
from .common import success

router = APIRouter(prefix="/api")


@router.get("/commits")
def list_commits(request: Request):
    return success(request, request.app.state.service.list_commits())


@router.post("/commits", status_code=201)
def create_commit(request: Request, payload: CommitInput):
    return success(request, request.app.state.service.create_commit(payload.model_dump()), 201)


@router.get("/drafts")
def list_drafts(request: Request):
    return success(request, request.app.state.service.list_drafts())


@router.patch("/drafts/{draft_id}")
def set_draft_status(request: Request, draft_id, payload: DraftStatusInput):
    return success(request, request.app.state.service.set_draft_status(draft_id, payload.status))
