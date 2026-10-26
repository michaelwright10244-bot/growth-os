from fastapi import Request
from fastapi.responses import JSONResponse


def request_id_for(request: Request) -> str:
    return request.state.request_id


def success(request: Request, data, status_code: int = 200) -> JSONResponse:
    return JSONResponse({"data": data, "error": None, "request_id": request_id_for(request)}, status_code=status_code)
