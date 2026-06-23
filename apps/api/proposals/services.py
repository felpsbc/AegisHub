from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from audit.services import record_event
from proposals.models import BudgetKind, Proposal, ProposalStatus, ProposalVisibility
from tenants.models import Tenant, TenantType


class ProposalError(Exception):
    pass


@transaction.atomic
def create_proposal(
    *,
    tenant: Tenant,
    actor,
    title: str,
    description: str,
    scope_md: str,
    budget_kind: BudgetKind,
    budget_amount: Decimal | None,
    budget_currency: str = "BRL",
    duration_weeks: int | None = None,
    visibility: ProposalVisibility = ProposalVisibility.PUBLIC,
    specialty_ids: list[int] | None = None,
) -> Proposal:
    if tenant.type != TenantType.COMPANY:
        raise ProposalError("only_companies_can_publish")
    proposal = Proposal.objects.create(
        tenant=tenant,
        title=title,
        description=description,
        scope_md=scope_md,
        budget_kind=budget_kind,
        budget_amount=budget_amount,
        budget_currency=budget_currency,
        duration_weeks=duration_weeks,
        visibility=visibility,
    )
    if specialty_ids:
        proposal.specialties.set(specialty_ids)
    record_event(
        actor=actor,
        event_type="PROPOSAL_CREATED",
        object_type="Proposal",
        object_id=proposal.pk,
        payload={"public_id": str(proposal.public_id), "title": title},
    )
    return proposal


@transaction.atomic
def publish_proposal(proposal: Proposal, *, actor) -> Proposal:
    if proposal.status != ProposalStatus.DRAFT:
        raise ProposalError("only_drafts_can_publish")
    proposal.status = ProposalStatus.PUBLISHED
    proposal.published_at = timezone.now()
    proposal.save(update_fields=["status", "published_at", "updated_at"])
    record_event(
        actor=actor,
        event_type="PROPOSAL_PUBLISHED",
        object_type="Proposal",
        object_id=proposal.pk,
        payload={"public_id": str(proposal.public_id)},
    )
    return proposal


@transaction.atomic
def admin_delete_proposal(proposal: Proposal, *, actor) -> None:
    """Exclusão administrativa de uma proposta (e candidaturas em cascata).

    Captura o `public_id` no audit ANTES do DELETE, já que o objeto some. O
    `record_event` grava só `object_id`/payload (não tem FK pra Proposal), então
    a trilha de auditoria sobrevive à exclusão.
    """
    pk = proposal.pk
    public_id = str(proposal.public_id)
    title = proposal.title
    proposal.delete()
    record_event(
        actor=actor,
        event_type="PROPOSAL_DELETED_BY_ADMIN",
        object_type="Proposal",
        object_id=pk,
        payload={"public_id": public_id, "title": title},
    )


@transaction.atomic
def close_proposal(proposal: Proposal, *, actor) -> Proposal:
    if proposal.status not in {ProposalStatus.PUBLISHED, ProposalStatus.DRAFT}:
        raise ProposalError("invalid_state_for_close")
    proposal.status = ProposalStatus.CLOSED
    proposal.save(update_fields=["status", "updated_at"])
    record_event(
        actor=actor,
        event_type="PROPOSAL_CLOSED",
        object_type="Proposal",
        object_id=proposal.pk,
        payload={},
    )
    return proposal
