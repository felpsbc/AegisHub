"""Busca textual full-text em propostas.

- Coluna `tsv` (tsvector) mantida por trigger sobre title+description.
- Índice GIN em tsv → habilita `WHERE tsv @@ plainto_tsquery('portuguese', %s)`.
- Índice GIN trigram em title → fuzzy match para queries curtas.

Substitui o `Q(title__icontains=q) | Q(description__icontains=q)` da view,
que faz scan completo. (A view será atualizada no PR seguinte; até lá os
índices ficam ociosos mas não atrapalham.)
"""
from __future__ import annotations

from django.db import migrations


CREATE_SQL = [
    "ALTER TABLE proposals_proposal ADD COLUMN tsv tsvector",
    """UPDATE proposals_proposal
       SET tsv = to_tsvector(
           'portuguese',
           coalesce(title, '') || ' ' || coalesce(description, '')
       )""",
    "CREATE INDEX proposals_tsv_idx ON proposals_proposal USING GIN (tsv)",
    """CREATE OR REPLACE FUNCTION proposals_tsv_update() RETURNS trigger AS $$
    BEGIN
        NEW.tsv := to_tsvector(
            'portuguese',
            coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '')
        );
        RETURN NEW;
    END
    $$ LANGUAGE plpgsql""",
    """CREATE TRIGGER proposals_tsv_trg
       BEFORE INSERT OR UPDATE OF title, description ON proposals_proposal
       FOR EACH ROW EXECUTE FUNCTION proposals_tsv_update()""",
    "CREATE INDEX proposals_title_trgm_idx ON proposals_proposal USING GIN (title gin_trgm_ops)",
]

REVERSE_SQL = [
    "DROP INDEX IF EXISTS proposals_title_trgm_idx",
    "DROP TRIGGER IF EXISTS proposals_tsv_trg ON proposals_proposal",
    "DROP FUNCTION IF EXISTS proposals_tsv_update()",
    "DROP INDEX IF EXISTS proposals_tsv_idx",
    "ALTER TABLE proposals_proposal DROP COLUMN tsv",
]


class Migration(migrations.Migration):
    dependencies = [
        ("proposals", "0001_initial"),
        ("accounts", "0002_postgres_setup"),  # extensions
    ]

    operations = [migrations.RunSQL(sql=CREATE_SQL, reverse_sql=REVERSE_SQL)]
