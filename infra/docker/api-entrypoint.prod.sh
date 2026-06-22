#!/bin/sh
# Entrypoint de produção da API.
#
# Ordem importa por causa do RLS:
#   1. migrate roda como OWNER (POSTGRES_USER, BYPASSRLS) — DDL e policies.
#   2. setup_app_role dá LOGIN+senha à role de runtime pentesthub_app.
#   3. create_admin (idempotente) provisiona o superusuário via ADMIN_*.
#   4. collectstatic junta os estáticos do admin.
#   5. gunicorn sobe conectando COMO pentesthub_app (NOBYPASSRLS) — RLS enforce.
#
# DATABASES no settings já usa DJANGO_DB_USER=pentesthub_app. Os passos 1–4
# forçam o owner via env só naquele subprocesso.
set -e

OWNER_USER="${POSTGRES_USER:-pentesthub}"
OWNER_PASS="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD é obrigatório}"

echo "[entrypoint] aguardando o Postgres..."
until uv run python -c "import psycopg, os; psycopg.connect(dbname=os.environ.get('POSTGRES_DB','pentesthub'), user='${OWNER_USER}', password='${OWNER_PASS}', host=os.environ.get('POSTGRES_HOST','postgres'), port=os.environ.get('POSTGRES_PORT','5432')).close()" 2>/dev/null; do
  sleep 2
done

echo "[entrypoint] migrate (como owner)..."
DJANGO_DB_USER="${OWNER_USER}" DJANGO_DB_PASSWORD="${OWNER_PASS}" \
  uv run python manage.py migrate --noinput

echo "[entrypoint] carregando taxonomias (idempotente)..."
DJANGO_DB_USER="${OWNER_USER}" DJANGO_DB_PASSWORD="${OWNER_PASS}" \
  uv run python manage.py loaddata fixtures/specialties.json fixtures/certifications.json || true

echo "[entrypoint] habilitando role de runtime pentesthub_app..."
# NÃO sobrescrever DJANGO_DB_PASSWORD aqui: setup_app_role conecta como owner
# (POSTGRES_USER/POSTGRES_PASSWORD) e lê DJANGO_DB_PASSWORD como a senha a
# APLICAR na role do app — tem que ser a mesma que o gunicorn usará.
uv run python manage.py setup_app_role

if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  echo "[entrypoint] provisionando admin..."
  DJANGO_DB_USER="${OWNER_USER}" DJANGO_DB_PASSWORD="${OWNER_PASS}" \
    uv run python manage.py create_admin || true
fi

echo "[entrypoint] collectstatic..."
DJANGO_DB_USER="${OWNER_USER}" DJANGO_DB_PASSWORD="${OWNER_PASS}" \
  uv run python manage.py collectstatic --noinput || true

echo "[entrypoint] subindo gunicorn como pentesthub_app (RLS enforce)..."
exec uv run gunicorn pentesthub.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --timeout "${GUNICORN_TIMEOUT:-60}" \
  --access-logfile - \
  --error-logfile -
