from __future__ import annotations

import hashlib
import json
from typing import Any

from django.db import transaction

from audit.context import current_audit_context
from audit.models import AuditLog
from tenants.context import current_tenant_id


def _canonical_json(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _compute_hash(prev_hash: bytes | None, body: bytes) -> bytes:
    h = hashlib.sha256()
    if prev_hash:
        h.update(prev_hash)
    h.update(body)
    return h.digest()


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
    last = AuditLog.objects.order_by("-id").select_for_update().first()
    prev = bytes(last.self_hash) if last and last.self_hash else None
    body = _canonical_json(
        {
            "event_type": event_type,
            "object_type": object_type,
            "object_id": object_id,
            "actor_id": actor.pk if actor else None,
            "tenant_id": current_tenant_id(),
            "payload": payload or {},
        }
    )
    self_hash = _compute_hash(prev, body)
    return AuditLog.objects.create(
        actor=actor,
        actor_ip=ctx.ip if ctx else None,
        actor_ua=(ctx.user_agent if ctx else "")[:512],
        tenant_id=current_tenant_id(),
        event_type=event_type,
        object_type=object_type,
        object_id=object_id,
        payload=payload or {},
        prev_hash=prev,
        self_hash=self_hash,
    )


def verify_chain(*, limit: int = 1000) -> tuple[bool, int | None]:
    """Valida sequência de hashes. Retorna (ok, broken_id_or_None)."""
    prev: bytes | None = None
    for entry in AuditLog.objects.order_by("id").iterator(chunk_size=limit):
        body = _canonical_json(
            {
                "event_type": entry.event_type,
                "object_type": entry.object_type,
                "object_id": entry.object_id,
                "actor_id": entry.actor_id,
                "tenant_id": entry.tenant_id,
                "payload": entry.payload,
            }
        )
        expected = _compute_hash(prev, body)
        if bytes(entry.self_hash) != expected:
            return False, entry.id
        prev = bytes(entry.self_hash)
    return True, None
