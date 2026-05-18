from __future__ import annotations

from django.contrib import admin

from proposals.models import Proposal


@admin.register(Proposal)
class ProposalAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "tenant",
        "status",
        "visibility",
        "budget_kind",
        "budget_amount",
        "budget_currency",
        "published_at",
        "created_at",
    )
    list_filter = ("status", "visibility", "budget_kind", "budget_currency")
    search_fields = ("title", "description", "tenant__legal_name", "public_id")
    readonly_fields = ("public_id", "created_at", "updated_at", "published_at")
    filter_horizontal = ("specialties",)
    raw_id_fields = ("tenant",)
    ordering = ("-created_at",)
