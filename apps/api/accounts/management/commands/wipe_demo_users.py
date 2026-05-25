"""Apaga usuários demo deixados em ambientes que vieram de seeds antigos.

Use só em dev/staging. Em produção, recuse via DJANGO_DEBUG=false.

    docker compose exec api uv run python manage.py wipe_demo_users
    docker compose exec api uv run python manage.py wipe_demo_users --all
    docker compose exec api uv run python manage.py wipe_demo_users --emails a@x.com,b@y.com

Os tenants e PentesterProfile vinculados aos usuários caem por CASCADE.
"""
from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from accounts.models import User

DEMO_EMAILS_DEFAULT = {
    "ana@acme.com.br",
    "bia@bancodigital.com.br",
    "carlos@solo.com",
    "daniel@solo.com",
    "eva@solo.com",
    "fred@solo.com",
}


class Command(BaseCommand):
    help = "Apaga usuários demo (lista fixa). --all apaga TODOS os não-admin."

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Apaga TODOS os usuários (exceto is_admin/is_superuser).",
        )
        parser.add_argument(
            "--emails",
            default="",
            help="Lista de e-mails separada por vírgula.",
        )

    def handle(self, *args, **opts):
        if not settings.DEBUG:
            raise CommandError(
                "Este comando exige DJANGO_DEBUG=true. "
                "Em produção, use uma migration explícita."
            )

        if opts["all"]:
            qs = User.objects.filter(is_superuser=False, is_admin=False)
        elif opts["emails"]:
            emails = [e.strip() for e in opts["emails"].split(",") if e.strip()]
            qs = User.objects.filter(email__in=emails)
        else:
            qs = User.objects.filter(email__in=DEMO_EMAILS_DEFAULT)

        count = qs.count()
        if count == 0:
            self.stdout.write("Nada a apagar.")
            return

        with transaction.atomic():
            for u in qs:
                self.stdout.write(f"  - {u.email}")
            # Apagar usuário cascateia para audit_log (FK actor SET_NULL),
            # mas o trigger de append-only bloqueia o UPDATE. Em dev, o owner
            # do banco pode desabilitar o trigger por dentro da transação.
            with connection.cursor() as cur:
                cur.execute("ALTER TABLE audit_auditlog DISABLE TRIGGER audit_log_no_update")
                cur.execute("ALTER TABLE audit_auditlog DISABLE TRIGGER audit_log_no_delete")
                try:
                    qs.delete()
                finally:
                    cur.execute("ALTER TABLE audit_auditlog ENABLE TRIGGER audit_log_no_delete")
                    cur.execute("ALTER TABLE audit_auditlog ENABLE TRIGGER audit_log_no_update")

        self.stdout.write(self.style.SUCCESS(f"{count} usuário(s) apagado(s)."))
