"""Smoke test para os controles de banco que sustentam a invariante
'security is the product':

1. **audit_log é append-only**: UPDATE/DELETE estouram exception.
2. **Hash chain íntegra**: insertions consecutivas concatenam corretamente,
   e `verify_chain` (que recomputa via Postgres) retorna ok.
3. **INSERT raw não forja a chain**: prev_hash/self_hash arbitrários são
   sobrescritos pelo trigger.
4. **RLS bloqueia cross-tenant** em proposals e applications, sob role
   `pentesthub_app` (sem BYPASSRLS).
5. **tsvector + GIN responde** a `to_tsquery`.

Esses testes são o gate de regressão: se algum deles quebrar, NÃO faça
deploy. As policies/triggers/migrations são o que separa o produto de
'todo mundo lê o relatório alheio'.
"""
from __future__ import annotations

import pytest
from django.contrib.auth.hashers import make_password
from django.db import connection, transaction

from accounts.models import User
from applications.models import Application
from audit.models import AuditLog
from audit.services import record_event, verify_chain
from pentesters.models import Availability, PentesterProfile
from proposals.models import BudgetKind, Proposal, ProposalStatus, ProposalVisibility
from tenants.models import DocumentKind, Membership, MembershipRole, Tenant, TenantType


pytestmark = pytest.mark.django_db


@pytest.fixture
def two_companies_one_pentester(db):
    """Cria 2 empresas + 1 pentester com proposta + candidatura. Estado mínimo
    pra exercitar isolamento."""
    acme_user = User.objects.create(email="acme@t.com", full_name="Acme",
                                    password=make_password("x" * 12))
    bd_user = User.objects.create(email="bd@t.com", full_name="BD",
                                  password=make_password("x" * 12))
    pen_user = User.objects.create(email="pen@t.com", full_name="Pen",
                                   password=make_password("x" * 12))

    acme = Tenant.objects.create(type=TenantType.COMPANY, legal_name="Acme",
                                 document="11111111000111", document_kind=DocumentKind.CNPJ)
    bd = Tenant.objects.create(type=TenantType.COMPANY, legal_name="BD",
                               document="22222222000122", document_kind=DocumentKind.CNPJ)
    pen_t = Tenant.objects.create(type=TenantType.INDIVIDUAL, legal_name="Pen",
                                  document="33333333333", document_kind=DocumentKind.CPF)

    Membership.objects.create(user=acme_user, tenant=acme, role=MembershipRole.OWNER)
    Membership.objects.create(user=bd_user, tenant=bd, role=MembershipRole.OWNER)
    Membership.objects.create(user=pen_user, tenant=pen_t, role=MembershipRole.OWNER)

    pp = PentesterProfile.objects.create(
        tenant=pen_t, headline="Pentest web e API",
        bio="Especialista em OWASP Top 10",
        hourly_rate=200, availability=Availability.OPEN,
    )

    p_acme = Proposal.objects.create(
        tenant=acme, title="Pentest Acme black friday",
        description="ecommerce + API", scope_md="...",
        budget_kind=BudgetKind.FIXED, budget_amount=20000,
        status=ProposalStatus.PUBLISHED, visibility=ProposalVisibility.PUBLIC,
    )
    p_bd = Proposal.objects.create(
        tenant=bd, title="Pentest Banco Digital open finance",
        description="open finance", scope_md="...",
        budget_kind=BudgetKind.FIXED, budget_amount=30000,
        status=ProposalStatus.PUBLISHED, visibility=ProposalVisibility.PUBLIC,
    )

    Application.objects.create(
        proposal=p_acme, pentester=pp,
        cover_message="x" * 30,
    )

    return {
        "acme_id": acme.id, "bd_id": bd.id, "pen_id": pen_t.id,
        "p_acme_id": p_acme.id, "p_bd_id": p_bd.id,
    }


# ---------- Audit log ----------

def test_audit_log_blocks_update():
    entry = record_event(actor=None, event_type="X", object_type="Y", object_id=1, payload={"k": 1})
    with pytest.raises(Exception, match="append-only"), connection.cursor() as cur:
        cur.execute("UPDATE audit_auditlog SET event_type='HACK' WHERE id = %s", [entry.id])


def test_audit_log_blocks_delete():
    entry = record_event(actor=None, event_type="X", object_type="Y", object_id=1, payload={"k": 1})
    with pytest.raises(Exception, match="append-only"), connection.cursor() as cur:
        cur.execute("DELETE FROM audit_auditlog WHERE id = %s", [entry.id])


def test_audit_chain_integrity_after_many_events():
    for i in range(10):
        record_event(
            actor=None, event_type="EVT", object_type="Test",
            object_id=i, payload={"i": i, "ts": "stable"},
        )
    ok, broken = verify_chain()
    assert ok, f"chain broken at {broken}"


def test_raw_insert_cannot_forge_hash():
    """Mesmo com SQL raw e prev_hash/self_hash escolhidos a dedo, o trigger
    sobrescreve com o hash correto da cadeia."""
    record_event(actor=None, event_type="REAL", object_type="X", object_id=1, payload={})
    fake_hash = b"\xde\xad\xbe\xef" * 8  # 32 bytes para parecer SHA-256
    with connection.cursor() as cur:
        cur.execute(
            """INSERT INTO audit_auditlog
               (occurred_at, event_type, object_type, object_id, payload,
                prev_hash, self_hash, actor_ua, actor_ip, tenant_id, actor_id)
               VALUES (now(), %s, %s, %s, %s::jsonb, %s, %s, '', NULL, NULL, NULL)
               RETURNING id, prev_hash, self_hash""",
            ["FORGE_ATTEMPT", "X", 999, "{}", fake_hash, fake_hash],
        )
        row_id, prev, self_hash = cur.fetchone()

    assert bytes(self_hash) != fake_hash, "trigger não sobrescreveu self_hash"
    ok, _ = verify_chain()
    assert ok, "chain ficou corrompida pelo INSERT raw"


# ---------- RLS ----------

def _set_role_app(cur):
    # SET LOCAL: reseta automático no fim da transação (ergonômico p/ pytest).
    cur.execute("SET LOCAL ROLE pentesthub_app")


def _set_tenant(cur, tenant_id: int | None):
    if tenant_id is None:
        cur.execute("SELECT set_config('app.tenant_id', '', true)")
    else:
        cur.execute("SELECT set_config('app.tenant_id', %s, true)", [str(tenant_id)])


def test_rls_anonymous_sees_only_published(two_companies_one_pentester):
    with connection.cursor() as cur:
        _set_role_app(cur)
        _set_tenant(cur, None)
        cur.execute("SELECT count(*), array_agg(DISTINCT status) FROM proposals_proposal")
        count, statuses = cur.fetchone()
    assert count == 2  # ambas PUBLISHED no fixture
    assert statuses == ["PUBLISHED"]


def test_rls_company_sees_only_own_drafts(two_companies_one_pentester):
    """Adiciona um DRAFT em cada empresa e confirma que ninguém vê o do outro."""
    fx = two_companies_one_pentester
    Proposal.objects.create(
        tenant_id=fx["acme_id"], title="Draft Acme", description="...", scope_md="...",
        budget_kind=BudgetKind.TBD, status=ProposalStatus.DRAFT,
    )
    Proposal.objects.create(
        tenant_id=fx["bd_id"], title="Draft BD", description="...", scope_md="...",
        budget_kind=BudgetKind.TBD, status=ProposalStatus.DRAFT,
    )

    with connection.cursor() as cur:
        _set_role_app(cur)
        _set_tenant(cur, fx["acme_id"])
        cur.execute(
            "SELECT title FROM proposals_proposal WHERE status='DRAFT' ORDER BY title"
        )
        acme_drafts = [r[0] for r in cur.fetchall()]

    assert acme_drafts == ["Draft Acme"]


def test_rls_company_cant_insert_for_other_tenant(two_companies_one_pentester):
    fx = two_companies_one_pentester
    # Savepoint isola o erro de RLS — sem ele a transação do test atomic fica
    # aborted e qualquer query depois falha.
    with transaction.atomic(), connection.cursor() as cur:
        _set_role_app(cur)
        _set_tenant(cur, fx["acme_id"])
        with pytest.raises(Exception, match="row-level security"):
            cur.execute(
                """INSERT INTO proposals_proposal
                   (tenant_id, title, description, scope_md, budget_kind,
                    status, visibility, created_at, updated_at, public_id)
                   VALUES (%s, 'Hijack', '...', '...', 'TBD', 'DRAFT', 'PUBLIC',
                           now(), now(), gen_random_uuid())""",
                [fx["bd_id"]],
            )
        # Marca o savepoint como dirty pra ele rolar de volta sem tentar commit.
        transaction.set_rollback(True)


def test_rls_application_visible_to_both_parties(two_companies_one_pentester):
    fx = two_companies_one_pentester
    with connection.cursor() as cur:
        _set_role_app(cur)

        # Dona da proposal (Acme) vê a candidatura
        _set_tenant(cur, fx["acme_id"])
        cur.execute("SELECT count(*) FROM applications_application")
        assert cur.fetchone()[0] == 1

        # Pentester também
        _set_tenant(cur, fx["pen_id"])
        cur.execute("SELECT count(*) FROM applications_application")
        assert cur.fetchone()[0] == 1

        # Empresa NÃO-dona não vê
        _set_tenant(cur, fx["bd_id"])
        cur.execute("SELECT count(*) FROM applications_application")
        assert cur.fetchone()[0] == 0


# ---------- Full-text search ----------

def test_tsvector_search_proposals(two_companies_one_pentester):
    """Confere que o trigger preencheu tsv e GIN responde por @@."""
    with connection.cursor() as cur:
        cur.execute(
            """SELECT count(*) FROM proposals_proposal
               WHERE tsv @@ plainto_tsquery('portuguese', 'open finance')"""
        )
        assert cur.fetchone()[0] == 1


def test_tsvector_search_pentesters(two_companies_one_pentester):
    with connection.cursor() as cur:
        cur.execute(
            """SELECT count(*) FROM pentesters_pentesterprofile
               WHERE tsv @@ plainto_tsquery('portuguese', 'OWASP')"""
        )
        assert cur.fetchone()[0] == 1


# ---------- CITEXT email ----------

def test_email_is_case_insensitive():
    User.objects.create(email="Foo@Bar.COM", full_name="Foo",
                        password=make_password("x" * 12))
    # Mesmo registro recuperável com case diferente — citext faz isso sem iexact
    assert User.objects.filter(email="foo@bar.com").exists()
    assert User.objects.filter(email="FOO@BAR.COM").exists()
