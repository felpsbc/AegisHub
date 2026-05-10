from __future__ import annotations

from collections.abc import Callable

from django.db import connection, transaction
from django.http import HttpRequest, HttpResponse

from tenants.context import set_current_tenant_id
from tenants.models import Membership


class TenantMiddleware:
    """Resolve o tenant ativo da request **e** propaga pra sessão Postgres.

    Duas camadas:

    1. **ContextVar Python** (`current_tenant_id`) — usada pelos managers
       tenant-aware quando filtram em Python.

    2. **GUC Postgres** (`SET LOCAL app.tenant_id = ...`) — usado pelas
       policies RLS (`current_setting('app.tenant_id', true)::BIGINT`).
       Como `SET LOCAL` é transaction-scoped, envolvemos a request inteira
       num `transaction.atomic()`. Services internos que já chamam
       `@transaction.atomic` viram savepoints aninhados — sem efeito colateral.

    Resolução do tenant:
    - Header `X-Tenant-Id` (UUID público) prevalece se o usuário pertence.
    - Senão, primeiro Membership por ordem de criação.
    - Anônimos: nenhum tenant — RLS retorna 0 linhas exceto via policies
      especiais (ex.: `proposals_published_read`).
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def _resolve_tenant_id(self, request: HttpRequest) -> int | None:
        if not (getattr(request, "user", None) and request.user.is_authenticated):
            return None
        requested = request.headers.get("X-Tenant-Id")
        if requested:
            m = (
                Membership.objects.select_related("tenant")
                .filter(user=request.user, tenant__public_id=requested)
                .first()
            )
            if m:
                return m.tenant_id
        m = (
            Membership.objects.select_related("tenant")
            .filter(user=request.user)
            .order_by("created_at")
            .first()
        )
        return m.tenant_id if m else None

    def __call__(self, request: HttpRequest) -> HttpResponse:
        tenant_id = self._resolve_tenant_id(request)
        set_current_tenant_id(tenant_id)
        request.tenant_id = tenant_id
        try:
            with transaction.atomic():
                if tenant_id is not None:
                    with connection.cursor() as cursor:
                        # %s parametrizado vai virar string entre aspas;
                        # o GUC aceita string e o ::BIGINT na policy converte.
                        cursor.execute("SELECT set_config('app.tenant_id', %s, true)",
                                       [str(tenant_id)])
                else:
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT set_config('app.tenant_id', '', true)")
                return self.get_response(request)
        finally:
            set_current_tenant_id(None)
