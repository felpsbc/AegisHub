from __future__ import annotations

from django.db import transaction

from tenants.models import (
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
    return tenant
