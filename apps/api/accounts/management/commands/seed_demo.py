"""Garante que os catálogos (specialties, certifications) estejam carregados.

Os fixtures já são aplicados automaticamente pelo container `api` no boot
(ver docker-compose.yml). Este comando existe só pra rodar manualmente
quando a base for criada fora do compose.

Os usuários e propostas de demo foram removidos — produção entra com
banco limpo. Use `python manage.py create_admin` (lendo ADMIN_EMAIL/
ADMIN_PASSWORD do env) para criar o operador inicial.
"""
from __future__ import annotations

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Carrega catálogos (specialties, certifications). Sem usuários demo."

    def handle(self, *args, **opts):
        call_command(
            "loaddata",
            "fixtures/specialties.json",
            "fixtures/certifications.json",
            verbosity=1,
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Catálogos carregados. Para criar o admin:\n"
                "  ADMIN_EMAIL=... ADMIN_PASSWORD=... python manage.py create_admin"
            )
        )
