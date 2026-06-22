"""Habilita a role de runtime `pentesthub_app` para LOGIN em produção.

A migration `accounts/0002_postgres_setup` cria a role como NOLOGIN
NOBYPASSRLS (em dev o app conecta como owner e o RLS não enforça). Em
produção o app conecta COMO `pentesthub_app`, então a role precisa de
LOGIN + senha. Este comando faz isso de forma idempotente.

Conecta como OWNER (POSTGRES_USER/POSTGRES_PASSWORD) — só o owner pode
ALTER ROLE. A senha aplicada vem de DJANGO_DB_PASSWORD (a mesma que o
app usa em DATABASES quando DJANGO_DB_USER=pentesthub_app).

Uso (normalmente chamado pelo entrypoint de produção):
    DJANGO_DB_PASSWORD=... python manage.py setup_app_role
"""
from __future__ import annotations

import os

import psycopg
from django.core.management.base import BaseCommand, CommandError

APP_ROLE = "pentesthub_app"


class Command(BaseCommand):
    help = "Concede LOGIN + senha à role de runtime pentesthub_app (idempotente)."

    def handle(self, *args, **opts):
        app_password = os.environ.get("DJANGO_DB_PASSWORD", "")
        if not app_password:
            raise CommandError(
                "DJANGO_DB_PASSWORD é obrigatório — é a senha que a role "
                f"{APP_ROLE} usará para LOGIN."
            )

        owner_dsn = {
            "dbname": os.environ.get("POSTGRES_DB", "pentesthub"),
            "user": os.environ.get("POSTGRES_USER", "pentesthub"),
            "password": os.environ.get("POSTGRES_PASSWORD", ""),
            "host": os.environ.get("POSTGRES_HOST", "postgres"),
            "port": os.environ.get("POSTGRES_PORT", "5432"),
        }

        try:
            with psycopg.connect(**owner_dsn, autocommit=True) as conn, conn.cursor() as cur:
                # ALTER ROLE não aceita placeholder para o nome/senha;
                # a senha entra como literal devidamente escapado.
                escaped = app_password.replace("'", "''")
                cur.execute(f"ALTER ROLE {APP_ROLE} LOGIN PASSWORD '{escaped}'")  # noqa: S608
                # Garante os grants em tabelas/sequences criadas depois.
                cur.execute(
                    "GRANT SELECT, INSERT, UPDATE, DELETE "
                    f"ON ALL TABLES IN SCHEMA public TO {APP_ROLE}"
                )
                cur.execute(
                    "GRANT USAGE, SELECT "
                    f"ON ALL SEQUENCES IN SCHEMA public TO {APP_ROLE}"
                )
        except psycopg.Error as exc:
            raise CommandError(f"Falha ao configurar a role {APP_ROLE}: {exc}") from exc

        self.stdout.write(
            self.style.SUCCESS(f"Role {APP_ROLE} pronta para LOGIN (RLS enforce).")
        )
