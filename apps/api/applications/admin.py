from __future__ import annotations

from django.contrib import admin

from applications.models import Application


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "proposal",
        "pentester",
        "status",
        "proposed_rate",
        "proposed_total",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = (
        "proposal__title",
        "pentester__tenant__legal_name",
        "public_id",
    )
    readonly_fields = ("public_id", "created_at", "updated_at")
    raw_id_fields = ("proposal", "pentester")
    ordering = ("-created_at",)
