"""RFC 7807 Problem Details handler para DRF."""

from __future__ import annotations

from rest_framework.response import Response
from rest_framework.views import exception_handler


def _problem_type(code: str) -> str:
    return f"https://pentesthub.com.br/problems/{code}"


def problem_details_handler(exc, context) -> Response | None:
    response = exception_handler(exc, context)
    if response is None:
        return None
    detail = response.data
    request = context.get("request")
    instance = getattr(request, "path", "")
    body = {
        "type": _problem_type(_code_for_status(response.status_code)),
        "title": _title_for_status(response.status_code),
        "status": response.status_code,
        "instance": instance,
    }
    if isinstance(detail, dict) and "detail" in detail:
        body["detail"] = str(detail["detail"])
    elif isinstance(detail, dict):
        body["detail"] = "Validation error"
        body["errors"] = [{"field": k, "code": _first_code(v)} for k, v in detail.items()]
    elif isinstance(detail, list):
        body["detail"] = "; ".join(str(item) for item in detail)
    else:
        body["detail"] = str(detail)
    response.data = body
    response["Content-Type"] = "application/problem+json"
    return response


def _code_for_status(status: int) -> str:
    return {
        400: "validation",
        401: "authentication",
        403: "forbidden",
        404: "not-found",
        405: "method-not-allowed",
        409: "conflict",
        422: "validation",
        429: "rate-limit",
    }.get(status, "error")


def _title_for_status(status: int) -> str:
    return {
        400: "Bad request",
        401: "Authentication required",
        403: "Forbidden",
        404: "Not found",
        405: "Method not allowed",
        409: "Conflict",
        422: "Validation error",
        429: "Rate limit exceeded",
    }.get(status, "Server error")


def _first_code(value) -> str:
    if isinstance(value, list) and value:
        first = value[0]
        return getattr(first, "code", "invalid")
    return getattr(value, "code", "invalid")
