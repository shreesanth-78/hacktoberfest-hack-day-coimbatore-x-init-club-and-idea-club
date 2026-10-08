"""Standard error format for every endpoint: {"error": {"code", "message"}}."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class APIError(Exception):
    def __init__(self, status, code, message):
        self.status = status
        self.code = code
        self.message = message


def error_response(status, code, message):
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


def _validation_message(exc):
    """Short message naming the bad field. Never echoes the submitted value."""
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", ()) if p != "body") or "body"
    return f"Invalid value for '{field}': {first.get('msg', 'invalid request')}"


def install_error_handlers(app: FastAPI):
    @app.exception_handler(APIError)
    async def _api_error(request: Request, exc: APIError):
        return error_response(exc.status, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError):
        return error_response(400, "invalid_request", _validation_message(exc))

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException):
        code = "not_found" if exc.status_code == 404 else "invalid_request"
        return error_response(exc.status_code, code, str(exc.detail))
