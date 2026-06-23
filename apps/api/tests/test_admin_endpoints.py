"""Regressão dos endpoints administrativos.

Foco nos gates de autorização (`is_admin`) — "security is the product": anônimo e
usuário comum nunca tocam em `/admin/*`. Cobre também as ações reais (desativar
usuário, excluir proposta) e a trilha de auditoria.
"""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from accounts.models import User
from audit.models import AuditLog
from proposals.models import BudgetKind, Proposal
from tenants.models import DocumentKind, MembershipRole, Tenant, TenantType
from tenants.services import create_tenant_for_user

pytestmark = pytest.mark.django_db


def _admin():
    u = User.objects.create_user(email="adm@example.com", password="x" * 12, full_name="Adm")
    u.is_admin = True
    u.is_staff = True
    u.is_active = True
    u.save()
    return u


def _company():
    u = User.objects.create_user(email="co@example.com", password="x" * 12, full_name="Co")
    t = create_tenant_for_user(
        user=u, type=TenantType.COMPANY, legal_name="ACME",
        document="11222333000144", document_kind=DocumentKind.CNPJ, role=MembershipRole.OWNER,
    )
    return u, t


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


# ---- Gates ----

def test_anonymous_cannot_access_admin():
    c = APIClient()
    for path in ("/api/v1/admin/stats", "/api/v1/admin/users", "/api/v1/admin/proposals"):
        assert c.get(path).status_code in (401, 403), path


def test_regular_user_cannot_access_admin():
    u, _ = _company()
    c = _auth(u)
    assert c.get("/api/v1/admin/stats").status_code == 403
    assert c.get("/api/v1/admin/users").status_code == 403
    assert c.get("/api/v1/admin/proposals").status_code == 403


def test_admin_can_read_stats_and_lists():
    admin = _admin()
    _company()
    c = _auth(admin)
    stats = c.get("/api/v1/admin/stats")
    assert stats.status_code == 200
    assert stats.json()["companies"] >= 1
    assert c.get("/api/v1/admin/users").status_code == 200
    assert c.get("/api/v1/admin/proposals").status_code == 200


# ---- Ações ----

def test_admin_deactivates_and_reactivates_user():
    admin = _admin()
    u, _ = _company()
    c = _auth(admin)
    resp = c.post(f"/api/v1/admin/users/{u.public_id}/active", {"active": False}, format="json")
    assert resp.status_code == 200
    u.refresh_from_db()
    assert u.is_active is False
    resp = c.post(f"/api/v1/admin/users/{u.public_id}/active", {"active": True}, format="json")
    assert resp.status_code == 200
    u.refresh_from_db()
    assert u.is_active is True


def test_admin_cannot_deactivate_self():
    admin = _admin()
    c = _auth(admin)
    resp = c.post(f"/api/v1/admin/users/{admin.public_id}/active", {"active": False}, format="json")
    assert resp.status_code == 400
    assert resp.json()["detail"] == "cannot_change_own_status"


def test_admin_deletes_proposal_and_records_audit():
    admin = _admin()
    _, tenant = _company()
    proposal = Proposal.objects.create(
        tenant=tenant, title="Pentest", description="d", scope_md="s",
        budget_kind=BudgetKind.FIXED, budget_amount=1000, budget_currency="BRL",
    )
    pk = proposal.pk
    c = _auth(admin)
    resp = c.delete(f"/api/v1/admin/proposals/{proposal.public_id}")
    assert resp.status_code == 204
    assert not Proposal.objects.filter(pk=pk).exists()
    assert AuditLog.objects.filter(
        event_type="PROPOSAL_DELETED_BY_ADMIN", object_id=pk
    ).exists()


def test_regular_user_cannot_delete_proposal():
    u, tenant = _company()
    proposal = Proposal.objects.create(
        tenant=tenant, title="Pentest", description="d", scope_md="s",
        budget_kind=BudgetKind.FIXED, budget_amount=1000, budget_currency="BRL",
    )
    c = _auth(u)
    resp = c.delete(f"/api/v1/admin/proposals/{proposal.public_id}")
    assert resp.status_code == 403
    assert Proposal.objects.filter(pk=proposal.pk).exists()
