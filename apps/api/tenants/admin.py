from __future__ import annotations

from django.contrib import admin

from tenants.models import Membership, Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("legal_name", "type", "document_kind", "document", "status", "created_at")
    list_filter = ("type", "status", "document_kind")
    search_fields = ("legal_name", "document", "public_id")
    readonly_fields = ("public_id", "created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "tenant", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("user__email", "tenant__legal_name")
    raw_id_fields = ("user", "tenant")
