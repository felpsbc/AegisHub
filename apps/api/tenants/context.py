"""Contexto de tenant ativo para a request atual.

Uso:
- TenantMiddleware faz set_current_tenant_id(...) por request.
- Managers/services chamam current_tenant_id() para escopar queries.
"""

from __future__ import annotations

from contextvars import ContextVar

_tenant_id: ContextVar[int | None] = ContextVar("current_tenant_id", default=None)


def set_current_tenant_id(tenant_id: int | None) -> None:
    _tenant_id.set(tenant_id)


def current_tenant_id() -> int | None:
    return _tenant_id.get()
