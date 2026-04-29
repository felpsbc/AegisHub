from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass


@dataclass(frozen=True)
class AuditContext:
    ip: str | None = None
    user_agent: str = ""


_ctx: ContextVar[AuditContext | None] = ContextVar("audit_ctx", default=None)


def set_audit_context(ctx: AuditContext | None) -> None:
    _ctx.set(ctx)


def current_audit_context() -> AuditContext | None:
    return _ctx.get()
