from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from accounts.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("-created_at",)
    list_display = (
        "email",
        "full_name",
        "is_admin",
        "is_staff",
        "is_superuser",
        "is_active",
        "mfa_enabled",
        "last_login_at",
    )
    list_filter = ("is_admin", "is_staff", "is_superuser", "is_active", "mfa_enabled")
    search_fields = ("email", "full_name", "public_id")
    readonly_fields = (
        "public_id",
        "last_login",
        "last_login_at",
        "created_at",
        "updated_at",
        "mfa_secret",
        "mfa_backup_codes",
    )
    fieldsets = (
        (None, {"fields": ("email", "password", "full_name", "public_id")}),
        (
            "Permissões",
            {
                "fields": (
                    "is_active",
                    "is_admin",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "MFA",
            {
                "fields": (
                    "mfa_enabled",
                    "mfa_secret",
                    "mfa_backup_codes",
                )
            },
        ),
        (
            "Lockout",
            {"fields": ("failed_attempts", "locked_until")},
        ),
        (
            "Timestamps",
            {"fields": ("last_login", "last_login_at", "created_at", "updated_at")},
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "full_name",
                    "password1",
                    "password2",
                    "is_admin",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )
