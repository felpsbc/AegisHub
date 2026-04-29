from __future__ import annotations

from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

from audit.context import AuditContext, set_audit_context


def _client_ip(request: HttpRequest) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class AuditContextMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        set_audit_context(
            AuditContext(ip=_client_ip(request), user_agent=request.headers.get("User-Agent", ""))
        )
        try:
            return self.get_response(request)
        finally:
            set_audit_context(None)
