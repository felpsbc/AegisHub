from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class FavoriteTarget(models.TextChoices):
    PENTESTER = "pentester", "Pentester"
    PROPOSAL = "proposal", "Proposal"


class Favorite(models.Model):
    """Bookmark de pentester ou proposta pelo usuário logado.

    `target_uuid` aponta para `PentesterProfile.public_id` ou `Proposal.public_id`,
    dependendo de `target_type`. Não usamos ForeignKey pra manter os contextos
    desacoplados (apps `favorites` não importa models dos outros apps).
    """

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    target_type = models.CharField(max_length=20, choices=FavoriteTarget.choices)
    target_uuid = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "target_type", "target_uuid")]
        indexes = [
            models.Index(fields=["user", "target_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} → {self.target_type}:{self.target_uuid}"
