from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class TenantType(models.TextChoices):
    COMPANY = "COMPANY", "Empresa"
    INDIVIDUAL = "INDIVIDUAL", "Pentester"


class TenantStatus(models.TextChoices):
    PENDING = "PENDING", "Pendente"
    VERIFIED = "VERIFIED", "Verificado"
    SUSPENDED = "SUSPENDED", "Suspenso"


class DocumentKind(models.TextChoices):
    CNPJ = "CNPJ", "CNPJ"
    CPF = "CPF", "CPF"


class Tenant(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    type = models.CharField(max_length=12, choices=TenantType.choices)
    legal_name = models.CharField(max_length=200)
    document = models.CharField(max_length=20)
    document_kind = models.CharField(max_length=4, choices=DocumentKind.choices)
    status = models.CharField(
        max_length=12, choices=TenantStatus.choices, default=TenantStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["document", "document_kind"], name="tenant_document_unique"
            ),
        ]
        indexes = [models.Index(fields=["type", "status"])]

    def __str__(self) -> str:
        return f"{self.legal_name} ({self.type})"


class MembershipRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    MEMBER = "MEMBER", "Member"
    BILLING = "BILLING", "Billing"


class Membership(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships"
    )
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=10, choices=MembershipRole.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "tenant"], name="membership_unique"),
        ]


class TenantAwareManager(models.Manager):
    """Filtra automaticamente por tenant_id presente no contexto da request.

    Uso: defina `objects = TenantAwareManager()` no model. Para acessos
    administrativos sem filtro, exponha `objects_unsafe = models.Manager()`
    com auditoria explícita no caller.
    """

    def get_queryset(self):
        from tenants.context import current_tenant_id

        qs = super().get_queryset()
        tenant_id = current_tenant_id()
        if tenant_id is None:
            return qs
        return qs.filter(tenant_id=tenant_id)
