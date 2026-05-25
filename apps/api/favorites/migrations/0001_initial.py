import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Favorite",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("target_type", models.CharField(choices=[("pentester", "Pentester"), ("proposal", "Proposal")], max_length=20)),
                ("target_uuid", models.UUIDField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="favorites", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(
            model_name="favorite",
            index=models.Index(fields=["user", "target_type"], name="favorites_f_user_id_e1edd9_idx"),
        ),
        migrations.AlterUniqueTogether(
            name="favorite",
            unique_together={("user", "target_type", "target_uuid")},
        ),
    ]
