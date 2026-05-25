"""Cria um superusuário com credenciais vindas do ambiente.

Lê ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME e cria/atualiza um usuário com
is_superuser, is_staff e is_admin. Idempotente: se já existir, só garante
as flags e (opcionalmente) reseta a senha via --reset-password.

Uso:
    ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME="..." \\
        python manage.py create_admin
"""
from __future__ import annotations

import os

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User


class Command(BaseCommand):
    help = "Cria/atualiza o superusuário a partir das envs ADMIN_*."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-password",
            action="store_true",
            help="Atualiza a senha do admin já existente com ADMIN_PASSWORD.",
        )

    @transaction.atomic
    def handle(self, *args, reset_password: bool = False, **opts):
        email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
        password = os.environ.get("ADMIN_PASSWORD", "")
        full_name = os.environ.get("ADMIN_NAME", "").strip() or "Operações AegisHub"

        if not email:
            raise CommandError("ADMIN_EMAIL é obrigatório.")
        if not password:
            raise CommandError("ADMIN_PASSWORD é obrigatório.")
        try:
            validate_password(password)
        except ValidationError as exc:
            raise CommandError(f"ADMIN_PASSWORD inválido: {'; '.join(exc.messages)}")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={"full_name": full_name},
        )
        user.full_name = full_name
        user.is_admin = True
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        # Admin é provisionado/verificado fora de banda; já entra com e-mail
        # confirmado para não esbarrar no gate de login.
        if user.email_confirmed_at is None:
            from django.utils import timezone

            user.email_confirmed_at = timezone.now()
        if created or reset_password:
            user.set_password(password)
        user.save()

        action = "criado" if created else (
            "atualizado (senha resetada)" if reset_password else "atualizado"
        )
        self.stdout.write(self.style.SUCCESS(f"Admin {email} {action}."))
