from __future__ import annotations

from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

from tenants.context import set_current_tenant_id
from tenants.models import Membership


class TenantMiddleware:
    """Resolve o tenant ativo da request a partir da sessão.

    Regras:
    - Header `X-Tenant-Id` (UUID público) prevalece se o usuário pertencer ao tenant.
    - Caso contrário, usa o primeiro membership do usuário autenticado.
    - Anônimos: tenant_id = None (catálogos públicos só leem campos públicos).
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        tenant_id: int | None = None
        if getattr(request, "user", None) and request.user.is_authenticated:
            requested = request.headers.get("X-Tenant-Id")
            if requested:
                m = (
                    Membership.objects.select_related("tenant")
                    .filter(user=request.user, tenant__public_id=requested)
                    .first()
                )
                if m:
                    tenant_id = m.tenant_id
            if tenant_id is None:
                m = (
                    Membership.objects.select_related("tenant")
                    .filter(user=request.user)
                    .order_by("created_at")
                    .first()
                )
                if m:
                    tenant_id = m.tenant_id
        set_current_tenant_id(tenant_id)
        request.tenant_id = tenant_id
        try:
            return self.get_response(request)
        finally:
            set_current_tenant_id(None)
