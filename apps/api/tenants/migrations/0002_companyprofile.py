import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="CompanyProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("summary", models.CharField(blank=True, default="", max_length=200)),
                ("about", models.TextField(blank=True, default="")),
                ("website", models.URLField(blank=True, default="")),
                ("industry", models.CharField(blank=True, default="", max_length=120)),
                ("location", models.CharField(blank=True, default="", max_length=120)),
                ("size", models.CharField(blank=True, default="", max_length=40)),
                ("founded_year", models.PositiveIntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "tenant",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="company_profile",
                        to="tenants.tenant",
                    ),
                ),
            ],
        ),
    ]
