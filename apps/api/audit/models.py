from __future__ import annotations

from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    occurred_at = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    actor_ip = models.GenericIPAddressField(null=True, blank=True)
    actor_ua = models.TextField(blank=True, default="")
    tenant_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    event_type = models.CharField(max_length=64, db_index=True)
    object_type = models.CharField(max_length=64)
    object_id = models.BigIntegerField(null=True, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    prev_hash = models.BinaryField(null=True, blank=True)
    self_hash = models.BinaryField()

    class Meta:
        indexes = [
            models.Index(fields=["event_type", "occurred_at"]),
            models.Index(fields=["tenant_id", "occurred_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.event_type}@{self.occurred_at:%Y-%m-%d %H:%M:%S}"
