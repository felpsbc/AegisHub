from __future__ import annotations

import uuid

from django.db import models

from pentesters.models import PentesterProfile
from proposals.models import Proposal


class ApplicationStatus(models.TextChoices):
    PENDING = "PENDING", "Pendente"
    SHORTLISTED = "SHORTLISTED", "Shortlist"
    ACCEPTED = "ACCEPTED", "Aceita"
    REJECTED = "REJECTED", "Rejeitada"
    WITHDRAWN = "WITHDRAWN", "Retirada"


class Application(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    proposal = models.ForeignKey(
        Proposal, on_delete=models.CASCADE, related_name="applications"
    )
    pentester = models.ForeignKey(
        PentesterProfile, on_delete=models.CASCADE, related_name="applications"
    )
    cover_message = models.TextField()
    proposed_rate = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    proposed_total = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    status = models.CharField(
        max_length=12, choices=ApplicationStatus.choices, default=ApplicationStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["proposal", "pentester"], name="application_unique_pair"
            ),
        ]
        indexes = [
            models.Index(fields=["proposal", "status"]),
        ]
