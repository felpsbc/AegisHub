"""Hardening do audit_log:

1. **Append-only**: BEFORE UPDATE/DELETE/TRUNCATE → RAISE EXCEPTION. Ninguém,
   nem mesmo o owner em SQL raw, pode mutar uma linha já gravada.

2. **Hash chain server-side**: BEFORE INSERT recalcula `prev_hash` (último
   self_hash com FOR UPDATE pra serializar) e `self_hash` via pgcrypto.digest.
   Substitui o cálculo Python — INSERT direto não consegue mais forjar a
   cadeia porque os campos são sobrescritos.

3. **Forma canônica determinística**: a função `audit_canonical()` produz
   o mesmo `BYTEA` para os mesmos campos, independentemente do driver.
   `audit.services.verify_chain` em Python passa a chamar essa função via
   query — dispensa reproduzir lógica de canonical JSON em duas linguagens.
"""
from __future__ import annotations

from django.db import migrations


CREATE_SQL = [
    # Forma canônica: tab-separated. payload já é jsonb com ordenação determinística do Postgres.
    """CREATE OR REPLACE FUNCTION audit_canonical(
        _event_type TEXT,
        _object_type TEXT,
        _object_id BIGINT,
        _actor_id BIGINT,
        _tenant_id BIGINT,
        _payload JSONB
    ) RETURNS BYTEA AS $$
        SELECT convert_to(
            coalesce(_event_type, '') || E'\\t' ||
            coalesce(_object_type, '') || E'\\t' ||
            coalesce(_object_id::text, '') || E'\\t' ||
            coalesce(_actor_id::text, '') || E'\\t' ||
            coalesce(_tenant_id::text, '') || E'\\t' ||
            coalesce(_payload::text, '{}'),
            'UTF8'
        );
    $$ LANGUAGE sql IMMUTABLE""",

    # Hash chain trigger
    """CREATE OR REPLACE FUNCTION audit_log_hash_chain() RETURNS trigger AS $$
    DECLARE
        last_hash BYTEA;
        body BYTEA;
    BEGIN
        SELECT self_hash INTO last_hash
        FROM audit_auditlog
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE;

        body := audit_canonical(
            NEW.event_type,
            NEW.object_type,
            NEW.object_id,
            NEW.actor_id,
            NEW.tenant_id,
            NEW.payload
        );

        NEW.prev_hash := last_hash;
        NEW.self_hash := digest(coalesce(last_hash, ''::bytea) || body, 'sha256');
        RETURN NEW;
    END
    $$ LANGUAGE plpgsql""",

    """CREATE TRIGGER audit_log_hash_chain_trg
       BEFORE INSERT ON audit_auditlog
       FOR EACH ROW EXECUTE FUNCTION audit_log_hash_chain()""",

    # Append-only trigger
    """CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
    BEGIN
        RAISE EXCEPTION 'audit_auditlog is append-only (op=%, by=%)',
            TG_OP, current_user;
    END
    $$ LANGUAGE plpgsql""",

    """CREATE TRIGGER audit_log_no_update
       BEFORE UPDATE ON audit_auditlog
       FOR EACH ROW EXECUTE FUNCTION audit_log_append_only()""",

    """CREATE TRIGGER audit_log_no_delete
       BEFORE DELETE ON audit_auditlog
       FOR EACH ROW EXECUTE FUNCTION audit_log_append_only()""",

    """CREATE TRIGGER audit_log_no_truncate
       BEFORE TRUNCATE ON audit_auditlog
       FOR EACH STATEMENT EXECUTE FUNCTION audit_log_append_only()""",
]

REVERSE_SQL = [
    "DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_auditlog",
    "DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_auditlog",
    "DROP TRIGGER IF EXISTS audit_log_no_update ON audit_auditlog",
    "DROP FUNCTION IF EXISTS audit_log_append_only()",
    "DROP TRIGGER IF EXISTS audit_log_hash_chain_trg ON audit_auditlog",
    "DROP FUNCTION IF EXISTS audit_log_hash_chain()",
    "DROP FUNCTION IF EXISTS audit_canonical(TEXT, TEXT, BIGINT, BIGINT, BIGINT, JSONB)",
]


class Migration(migrations.Migration):
    dependencies = [
        ("audit", "0001_initial"),
        ("accounts", "0002_postgres_setup"),  # precisa de pgcrypto.digest
    ]

    operations = [migrations.RunSQL(sql=CREATE_SQL, reverse_sql=REVERSE_SQL)]
