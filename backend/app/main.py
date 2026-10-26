from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .advisor import AdviceUnavailableError, CareerAdvisor
from .agent import AgentUnavailableError, DeepSeekAgent
from .config import settings
from .services import CareerService, ConflictError, InvalidActionError, NotFoundError
from .storage import Storage
from .routes import agent_runs, career, materials, opportunities, profile, projects, resume
from .routes.common import request_id_for


logging.basicConfig(level=settings.log_level, format="%(levelname)s event=%(message)s")
logger = logging.getLogger(__name__)
storage = Storage(settings.database_path)
service = CareerService(storage)
agent = DeepSeekAgent(settings, storage)
advisor = CareerAdvisor(settings)


@asynccontextmanager
async def lifespan(_: FastAPI):
    app.state.storage = storage
    app.state.service = service
    app.state.agent = agent
    app.state.advisor = advisor
    storage.initialize()
    recovered_runs = storage.recover_agent_runs()
    if recovered_runs:
        logger.warning("agent_runs_recovered count=%s", recovered_runs)
    logger.info("app_started env=%s database=%s", settings.app_env, settings.database_path.name)
    try:
        yield
    finally:
        agent.shutdown()


app = FastAPI(title="Career OS", docs_url=None, redoc_url=None, lifespan=lifespan)
app.state.storage = storage
app.state.service = service
app.state.agent = agent
app.state.advisor = advisor


@app.middleware("http")
async def request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", f"req_{uuid4().hex}")
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


def success(request: Request, data, status_code: int = 200) -> JSONResponse:
    return JSONResponse({"data": data, "error": None, "request_id": request_id_for(request)}, status_code=status_code)


@app.exception_handler(NotFoundError)
async def not_found(request: Request, error: NotFoundError):
    return JSONResponse({"data": None, "error": {"code": "not_found", "message": str(error)}, "request_id": request_id_for(request)}, status_code=404)


@app.exception_handler(InvalidActionError)
@app.exception_handler(AgentUnavailableError)
@app.exception_handler(AdviceUnavailableError)
async def invalid_action(request: Request, error: Exception):
    return JSONResponse({"data": None, "error": {"code": "invalid_action", "message": str(error)}, "request_id": request_id_for(request)}, status_code=422)


@app.exception_handler(ConflictError)
async def conflict(request: Request, error: ConflictError):
    return JSONResponse({"data": None, "error": {"code": "conflict", "message": str(error)}, "request_id": request_id_for(request)}, status_code=409)


@app.exception_handler(RequestValidationError)
async def invalid_input(request: Request, error: RequestValidationError):
    return JSONResponse({"data": None, "error": {"code": "invalid_input", "message": "请检查输入内容。"}, "request_id": request_id_for(request)}, status_code=422)


@app.exception_handler(HTTPException)
async def http_error(request: Request, error: HTTPException):
    message = "资源不存在" if error.status_code == 404 else "请求无法完成。"
    return JSONResponse({"data": None, "error": {"code": "not_found" if error.status_code == 404 else "request_error", "message": message}, "request_id": request_id_for(request)}, status_code=error.status_code)


@app.exception_handler(Exception)
async def unexpected_error(request: Request, error: Exception):
    logger.exception("request_failed request_id=%s error_class=%s", request_id_for(request), type(error).__name__)
    return JSONResponse({"data": None, "error": {"code": "internal_error", "message": "服务暂时不可用，请稍后再试。"}, "request_id": request_id_for(request)}, status_code=500)


@app.get("/health")
def health(request: Request):
    return success(request, {"status": "ok"})


for route_module in (profile, projects, materials, career, agent_runs, opportunities, resume):
    app.include_router(route_module.router)


if settings.frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=settings.frontend_dist / "assets"), name="assets")

    @app.get("/{path:path}")
    def frontend(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(settings.frontend_dist / "index.html")
