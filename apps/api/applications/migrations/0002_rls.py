"""RLS em applications.

Application "pertence" a dois tenants: a empresa dona da proposal e o
pentester. Policy permite SELECT para qualquer um deles. INSERT só pelo
pentester (WITH CHECK valida que pentester_id pertence ao tenant ativo).

Para SHORTLIST/ACCEPT/REJECT (UPDATE), a empresa dona também tem que poder
mexer — o USING já cobre. Para WITHDRAW, o pentester atualiza, idem.
"""
from __future__ import annotations

from django.db import migrations


CREATE_SQL = [
    "ALTER TABLE applications_application ENABLE ROW LEVEL SECURITY",

    """CREATE POLICY applications_owner ON applications_application
       FOR ALL
       USING (
           proposal_id IN (
               SELECT id FROM proposals_proposal
               WHERE tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::BIGINT
           )
           OR pentester_id IN (
               SELECT id FROM pentesters_pentesterprofile
               WHERE tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::BIGINT
           )
       )
       WITH CHECK (
           pentester_id IN (
               SELECT id FROM pentesters_pentesterprofile
               WHERE tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::BIGINT
           )
       )""",
]

REVERSE_SQL = [
    "DROP POLICY IF EXISTS applications_owner ON applications_application",
    "ALTER TABLE applications_application DISABLE ROW LEVEL SECURITY",
]


class Migration(migrations.Migration):
    dependencies = [
        ("applications", "0001_initial"),
        ("proposals", "0003_rls"),  # references proposals_proposal
        ("pentesters", "0002_tsv"),  # references pentesters_pentesterprofile
    ]

    operations = [migrations.RunSQL(sql=CREATE_SQL, reverse_sql=REVERSE_SQL)]
