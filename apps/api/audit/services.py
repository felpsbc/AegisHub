"""Audit services.

A cadeia de hashes é calculada **server-side** por trigger Postgres
(`audit_log_hash_chain` em `audit/migrations/0002_*`). Aqui só montamos
o evento e fazemos INSERT — o trigger sobrescreve `prev_hash`/`self_hash`
de forma serializada (FOR UPDATE da última linha). Isso fecha o vetor
de "INSERT raw forja a chain" e mantém uma única implementação canônica.

`verify_chain` recomputa via a mesma função (`audit_canonical`) e compara,
sem reproduzir lógica em Python.
"""
from __future__ import annotations

from typing import Any

from django.db import connection, transaction

from audit.context import current_audit_context
from audit.models import AuditLog
from tenants.context import current_tenant_id


# Placeholder; o trigger sobrescreve antes do INSERT comitar.
_TRIGGER_PLACEHOLDER = b""


@transaction.atomic
def record_event(
    *,
    actor=None,
    event_type: str,
    object_type: str,
    object_id: int | None,
    payload: dict[str, Any] | None = None,
) -> AuditLog:
    ctx = current_audit_context()
    obj = AuditLog.objects.create(
        actor=actor,
        actor_ip=ctx.ip if ctx else None,
        actor_ua=(ctx.user_agent if ctx else "")[:512],
        tenant_id=current_tenant_id(),
        event_type=event_type,
        object_type=object_type,
        object_id=object_id,
        payload=payload or {},
        prev_hash=None,
        self_hash=_TRIGGER_PLACEHOLDER,
    )
    # Trigger preencheu os hashes; refetch pra refletir no objeto em memória.
    obj.refresh_from_db(fields=["prev_hash", "self_hash"])
    return obj


def verify_chain(*, limit: int | None = None) -> tuple[bool, int | None]:
    """Valida a cadeia inteira (ou os últimos `limit` eventos).

    Retorna (ok, broken_id_or_None). Usa a mesma função Postgres do trigger
    pra produzir o canonical bytes — não tem como Python e SQL discordarem.
    """
    sql = """
        SELECT id, prev_hash, self_hash,
               digest(
                   coalesce(prev_hash, ''::bytea) ||
                   audit_canonical(event_type, object_type, object_id, actor_id, tenant_id, payload),
                   'sha256'
               ) AS expected_self_hash
        FROM audit_auditlog
        ORDER BY id
    """
    if limit is not None:
        sql = f"SELECT * FROM ({sql}) AS sub ORDER BY id DESC LIMIT %s"
        params: tuple = (limit,)
    else:
        params = ()

    prev: bytes | None = None
    rows: list[tuple[int, bytes | None, bytes, bytes]] = []
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        for row_id, row_prev, row_self, expected in cursor:
            rows.append((
                row_id,
                bytes(row_prev) if row_prev else None,
                bytes(row_self),
                bytes(expected),
            ))

    # Se usou limit, vem em ordem desc — inverte pra validar do mais antigo.
    if limit is not None:
        rows.reverse()

    for row_id, row_prev, row_self, expected in rows:
        if prev is not None and row_prev != prev:
            return False, row_id
        if row_self != expected:
            return False, row_id
        prev = row_self
    return True, None
