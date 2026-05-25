from __future__ import annotations

from django.db import transaction

from audit.services import record_event
from tenants.models import (
    CompanyProfile,
    DocumentKind,
    Membership,
    MembershipRole,
    Tenant,
    TenantType,
)


@transaction.atomic
def create_tenant_for_user(
    *,
    user,
    type: TenantType,
    legal_name: str,
    document: str,
    document_kind: DocumentKind,
    role: MembershipRole = MembershipRole.OWNER,
) -> Tenant:
    tenant = Tenant.objects.create(
        type=type,
        legal_name=legal_name,
        document=document,
        document_kind=document_kind,
    )
    Membership.objects.create(user=user, tenant=tenant, role=role)
    if type == TenantType.COMPANY:
        # Cria o perfil vazio já no cadastro, espelhando o pentester_profile.
        CompanyProfile.objects.create(tenant=tenant)
    return tenant


@transaction.atomic
def update_company_profile(
    *,
    tenant: Tenant,
    actor=None,
    summary: str | None = None,
    about: str | None = None,
    website: str | None = None,
    industry: str | None = None,
    location: str | None = None,
    size: str | None = None,
    founded_year: int | None = None,
) -> CompanyProfile:
    profile, _ = CompanyProfile.objects.get_or_create(tenant=tenant)
    fields = {
        "summary": summary,
        "about": about,
        "website": website,
        "industry": industry,
        "location": location,
        "size": size,
        "founded_year": founded_year,
    }
    changed = [k for k, v in fields.items() if v is not None]
    for k in changed:
        setattr(profile, k, fields[k])
    if changed:
        profile.save(update_fields=[*changed, "updated_at"])
    record_event(
        actor=actor,
        event_type="COMPANY_PROFILE_UPDATED",
        object_type="CompanyProfile",
        object_id=profile.pk,
        payload={"public_id": str(profile.public_id), "fields": changed},
    )
    return profile
