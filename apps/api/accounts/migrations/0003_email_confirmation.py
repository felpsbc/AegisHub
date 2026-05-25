from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_postgres_setup"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="email_confirmed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
