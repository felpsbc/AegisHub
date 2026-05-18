from __future__ import annotations

from django.contrib import admin

from audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Read-only — `audit_auditlog` é append-only por trigger."""

    list_display = (
        "occurred_at",
        "event_type",
        "object_type",
        "object_id",
        "actor",
        "tenant_id",
        "actor_ip",
    )
    list_filter = ("event_type", "object_type")
    search_fields = ("event_type", "object_type", "actor__email")
    readonly_fields = (
        "occurred_at",
        "actor",
        "actor_ip",
        "actor_ua",
        "tenant_id",
        "event_type",
        "object_type",
        "object_id",
        "payload",
        "prev_hash",
        "self_hash",
    )
    ordering = ("-occurred_at",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
