"""RLS em proposals.

Duas policies (Postgres aplica como OR para SELECT):

- `proposals_owner`: a empresa dona vê e mexe em tudo (DRAFT, PUBLISHED, ...).
- `proposals_published_read`: qualquer um vê só linhas PUBLISHED (catálogo).
  Os endpoints HTTP ainda gateiam quem pode chamar — RLS é o backstop pra
  query SQL acidental ou injection.

Lembrar: o owner do banco bypassa RLS por padrão. Em dev, a app conecta como
owner e RLS não enforce. Em prod, `DJANGO_DB_USER=pentesthub_app` faz RLS
bater. A smoke test usa SET ROLE pra validar enforcement em dev.
"""
from __future__ import annotations

from django.db import migrations


CREATE_SQL = [
    "ALTER TABLE proposals_proposal ENABLE ROW LEVEL SECURITY",

    """CREATE POLICY proposals_owner ON proposals_proposal
       FOR ALL
       USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::BIGINT)
       WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::BIGINT)""",

    """CREATE POLICY proposals_published_read ON proposals_proposal
       FOR SELECT
       USING (status = 'PUBLISHED')""",
]

REVERSE_SQL = [
    "DROP POLICY IF EXISTS proposals_published_read ON proposals_proposal",
    "DROP POLICY IF EXISTS proposals_owner ON proposals_proposal",
    "ALTER TABLE proposals_proposal DISABLE ROW LEVEL SECURITY",
]


class Migration(migrations.Migration):
    dependencies = [
        ("proposals", "0002_tsv"),
    ]

    operations = [migrations.RunSQL(sql=CREATE_SQL, reverse_sql=REVERSE_SQL)]
