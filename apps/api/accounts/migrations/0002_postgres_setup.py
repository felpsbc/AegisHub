"""Postgres-native setup que Django não gera sozinho.

- Extensões: pgcrypto (gen_random_uuid, digest), citext, pg_trgm, btree_gin.
- `users.email` vira CITEXT (case-insensitive sem iexact).
- DEFAULT gen_random_uuid() server-side em todos os public_id.
- Cria role `pentesthub_app` (NOLOGIN, NOBYPASSRLS) que será o role de
  runtime em produção. Owner (pentesthub) mantém BYPASSRLS para migrations.
  Em dev, o app continua conectando como owner (RLS não enforce); a smoke
  test usa SET ROLE pentesthub_app pra provar que as policies bloqueiam.

Reverso: drop dos defaults, volta email pra varchar, role/extensões ficam
(não dropar — outros bancos podem usar).
"""
from __future__ import annotations

from django.db import migrations


CREATE_SQL = [
    "CREATE EXTENSION IF NOT EXISTS pgcrypto",
    "CREATE EXTENSION IF NOT EXISTS citext",
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",
    "CREATE EXTENSION IF NOT EXISTS btree_gin",
    # email → CITEXT
    "ALTER TABLE accounts_user ALTER COLUMN email TYPE CITEXT USING email::CITEXT",
    # public_id default no banco
    "ALTER TABLE accounts_user ALTER COLUMN public_id SET DEFAULT gen_random_uuid()",
    "ALTER TABLE tenants_tenant ALTER COLUMN public_id SET DEFAULT gen_random_uuid()",
    "ALTER TABLE pentesters_pentesterprofile ALTER COLUMN public_id SET DEFAULT gen_random_uuid()",
    "ALTER TABLE proposals_proposal ALTER COLUMN public_id SET DEFAULT gen_random_uuid()",
    "ALTER TABLE applications_application ALTER COLUMN public_id SET DEFAULT gen_random_uuid()",
    # Role de runtime (NOLOGIN em dev — vira LOGIN em prod via ALTER ROLE).
    """DO $$ BEGIN
       IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pentesthub_app') THEN
         CREATE ROLE pentesthub_app NOLOGIN NOBYPASSRLS;
       END IF;
    END $$""",
    "GRANT USAGE ON SCHEMA public TO pentesthub_app",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pentesthub_app",
    "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pentesthub_app",
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
    "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pentesthub_app",
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
    "GRANT USAGE, SELECT ON SEQUENCES TO pentesthub_app",
    # Permite ao owner fazer SET ROLE pentesthub_app (necessário pra smoke test).
    """DO $$ BEGIN
       EXECUTE 'GRANT pentesthub_app TO ' || quote_ident(CURRENT_USER);
    END $$""",
    # statement_timeout default por role (5s pro app é defesa contra DoS por query lenta).
    "ALTER ROLE pentesthub_app SET statement_timeout = '5s'",
]

REVERSE_SQL = [
    "ALTER TABLE applications_application ALTER COLUMN public_id DROP DEFAULT",
    "ALTER TABLE proposals_proposal ALTER COLUMN public_id DROP DEFAULT",
    "ALTER TABLE pentesters_pentesterprofile ALTER COLUMN public_id DROP DEFAULT",
    "ALTER TABLE tenants_tenant ALTER COLUMN public_id DROP DEFAULT",
    "ALTER TABLE accounts_user ALTER COLUMN public_id DROP DEFAULT",
    "ALTER TABLE accounts_user ALTER COLUMN email TYPE VARCHAR(254) USING email::VARCHAR(254)",
    # extensions e role ficam (não dropar; podem ser compartilhados).
]


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("tenants", "0001_initial"),
        ("pentesters", "0001_initial"),
        ("proposals", "0001_initial"),
        ("applications", "0001_initial"),
        ("audit", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(sql=CREATE_SQL, reverse_sql=REVERSE_SQL),
    ]
