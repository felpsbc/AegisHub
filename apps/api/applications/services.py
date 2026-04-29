from __future__ import annotations

from decimal import Decimal

from django.db import transaction

from applications.models import Application, ApplicationStatus
from audit.services import record_event
from pentesters.models import PentesterProfile
from proposals.models import Proposal, ProposalStatus
from tenants.models import TenantType


class ApplicationError(Exception):
    pass


@transaction.atomic
def apply_to_proposal(
    *,
    proposal: Proposal,
    pentester: PentesterProfile,
    actor,
    cover_message: str,
    proposed_rate: Decimal | None = None,
    proposed_total: Decimal | None = None,
) -> Application:
    if pentester.tenant.type != TenantType.INDIVIDUAL:
        raise ApplicationError("only_individuals_can_apply")
    if proposal.status != ProposalStatus.PUBLISHED:
        raise ApplicationError("proposal_not_open")
    application, created = Application.objects.get_or_create(
        proposal=proposal,
        pentester=pentester,
        defaults={
            "cover_message": cover_message,
            "proposed_rate": proposed_rate,
            "proposed_total": proposed_total,
        },
    )
    if not created:
        raise ApplicationError("already_applied")
    record_event(
        actor=actor,
        event_type="APPLICATION_CREATED",
        object_type="Application",
        object_id=application.pk,
        payload={
            "proposal_id": str(proposal.public_id),
            "pentester_id": str(pentester.public_id),
        },
    )
    return application


@transaction.atomic
def transition(application: Application, *, to: ApplicationStatus, actor) -> Application:
    application = (
        Application.objects.select_for_update().get(pk=application.pk)
    )
    valid: dict[str, set[str]] = {
        ApplicationStatus.PENDING: {ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED,
                                    ApplicationStatus.WITHDRAWN, ApplicationStatus.ACCEPTED},
        ApplicationStatus.SHORTLISTED: {ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED,
                                        ApplicationStatus.WITHDRAWN},
    }
    allowed = valid.get(application.status, set())
    if to not in allowed:
        raise ApplicationError(f"invalid_transition:{application.status}->{to}")
    application.status = to
    application.save(update_fields=["status", "updated_at"])
    record_event(
        actor=actor,
        event_type=f"APPLICATION_{to}",
        object_type="Application",
        object_id=application.pk,
        payload={},
    )
    return application
