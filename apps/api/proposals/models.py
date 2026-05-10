from __future__ import annotations

import uuid

from django.db import models
from django.db.models import Q

from pentesters.models import Specialty
from tenants.models import Tenant


class ProposalStatus(models.TextChoices):
    DRAFT = "DRAFT", "Rascunho"
    PUBLISHED = "PUBLISHED", "Publicada"
    CLOSED = "CLOSED", "Fechada"
    ARCHIVED = "ARCHIVED", "Arquivada"


class ProposalVisibility(models.TextChoices):
    PUBLIC = "PUBLIC", "Pública"
    PRIVATE = "PRIVATE", "Privada"


class BudgetKind(models.TextChoices):
    FIXED = "FIXED", "Fixo"
    HOURLY = "HOURLY", "Por hora"
    TBD = "TBD", "A combinar"


class Proposal(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="proposals")
    title = models.CharField(max_length=140)
    description = models.TextField()
    scope_md = models.TextField()
    budget_amount = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    budget_currency = models.CharField(max_length=3, default="BRL")
    budget_kind = models.CharField(max_length=10, choices=BudgetKind.choices)
    duration_weeks = models.PositiveSmallIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=ProposalStatus.choices, default=ProposalStatus.DRAFT
    )
    visibility = models.CharField(
        max_length=8, choices=ProposalVisibility.choices, default=ProposalVisibility.PUBLIC
    )
    specialties = models.ManyToManyField(Specialty, related_name="proposals", blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    closes_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["status", "-published_at"],
                name="prop_status_pub_idx",
                condition=Q(status="PUBLISHED"),
            ),
            models.Index(fields=["tenant"], name="prop_tenant_idx"),
        ]
