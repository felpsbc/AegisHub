"""Popula dados de demo (empresas, pentesters, propostas) para desenvolvimento."""

from __future__ import annotations

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.services import register_account
from applications.services import apply_to_proposal
from pentesters.models import PentesterProfile, Specialty
from pentesters.services import create_or_update_profile
from proposals.models import BudgetKind, ProposalVisibility
from proposals.services import create_proposal, publish_proposal
from tenants.models import DocumentKind, TenantType


class Command(BaseCommand):
    help = "Cria 2 empresas + 4 pentesters + 3 propostas + 2 candidaturas."

    @transaction.atomic
    def handle(self, *args, **opts):
        if PentesterProfile.objects.exists():
            self.stdout.write(self.style.WARNING("Already seeded."))
            return

        # Empresas
        ana = register_account(
            email="ana@acme.com.br", password="ana-demo-pass-2026", full_name="Ana Souza",
            tenant_type=TenantType.COMPANY, legal_name="Acme Tecnologia LTDA",
            document="12345678000190", document_kind=DocumentKind.CNPJ,
        )
        bia = register_account(
            email="bia@bancodigital.com.br", password="bia-demo-pass-2026", full_name="Bia Lima",
            tenant_type=TenantType.COMPANY, legal_name="Banco Digital S.A.",
            document="98765432000110", document_kind=DocumentKind.CNPJ,
        )

        # Pentesters
        web = Specialty.objects.get(code="WEB")
        cloud = Specialty.objects.get(code="CLOUD")
        red = Specialty.objects.get(code="REDTEAM")
        api = Specialty.objects.get(code="API")
        mobile = Specialty.objects.get(code="MOBILE")

        pentesters_data = [
            ("carlos@solo.com", "Carlos Andrade", "Pentester especializado em web & API",
             Decimal("280.00"), [web, api]),
            ("daniel@solo.com", "Daniel Pires", "Red team operator com foco em AD",
             Decimal("420.00"), [red]),
            ("eva@solo.com", "Eva Martins", "Cloud security (AWS, GCP)",
             Decimal("360.00"), [cloud]),
            ("fred@solo.com", "Fred Tavares", "Mobile e IoT",
             Decimal("310.00"), [mobile]),
        ]
        profiles: list[PentesterProfile] = []
        for email, name, headline, rate, specs in pentesters_data:
            user = register_account(
                email=email, password=f"{email.split('@')[0]}-demo-pass-2026", full_name=name,
                tenant_type=TenantType.INDIVIDUAL, legal_name=name,
                document=f"{abs(hash(email)) % 10**11:011d}", document_kind=DocumentKind.CPF,
            )
            tenant = user.memberships.first().tenant
            profile = create_or_update_profile(
                tenant=tenant, headline=headline, bio=f"{name} — perfil demo.",
                hourly_rate=rate, specialties=[s.id for s in specs], actor=user,
            )
            profile.verified_at = timezone.now()
            profile.save(update_fields=["verified_at"])
            profiles.append(profile)

        # Propostas
        ana_tenant = ana.memberships.first().tenant
        bia_tenant = bia.memberships.first().tenant
        proposals_data = [
            (ana_tenant, ana, "Pentest em e-commerce — fase pré-Black Friday",
             "Aplicação Django + React, integração Pix, painel admin.",
             "## Escopo\n- Web app público\n- Painel admin\n- API REST\n- Integração Pix",
             BudgetKind.FIXED, Decimal("18000.00"), 3, [web, api]),
            (bia_tenant, bia, "Auditoria de infraestrutura AWS",
             "Conta AWS multi-account, com workloads regulados.",
             "## Escopo\n- IAM\n- Rede VPC\n- Workloads EKS\n- S3 / KMS",
             BudgetKind.HOURLY, Decimal("450.00"), 2, [cloud]),
            (ana_tenant, ana, "Red team contínuo trimestral",
             "Engajamento red team com objetivos definidos por sprint.",
             "## Escopo\n- Phishing controlado\n- Movimentação lateral\n- Persistência",
             BudgetKind.TBD, None, 12, [red]),
        ]
        published = []
        for tenant, actor, title, desc, scope, kind, amount, weeks, specs in proposals_data:
            p = create_proposal(
                tenant=tenant, actor=actor, title=title, description=desc, scope_md=scope,
                budget_kind=kind, budget_amount=amount, duration_weeks=weeks,
                visibility=ProposalVisibility.PUBLIC, specialty_ids=[s.id for s in specs],
            )
            publish_proposal(p, actor=actor)
            published.append((p, actor))

        # Candidaturas
        apply_to_proposal(
            proposal=published[0][0], pentester=profiles[0],
            actor=profiles[0].tenant.memberships.first().user,
            cover_message="Tenho experiência específica com Django e Pix. Posso começar na semana que vem.",
            proposed_rate=Decimal("280.00"),
        )
        apply_to_proposal(
            proposal=published[1][0], pentester=profiles[2],
            actor=profiles[2].tenant.memberships.first().user,
            cover_message="Foco em AWS multi-account há 4 anos. Disponibilidade integral.",
            proposed_rate=Decimal("450.00"),
        )

        self.stdout.write(self.style.SUCCESS(
            "Seed pronto. Login empresas: ana@acme.com.br / bia@bancodigital.com.br"
            " (senhas: <local>-demo-pass-2026)."
        ))
