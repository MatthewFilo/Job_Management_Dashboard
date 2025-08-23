from django.db import migrations
from django.contrib.postgres.operations import CreateExtension

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        CreateExtension('btree_gin'),
        # Create a functional index for case-insensitive prefix searches
        migrations.RunSQL(
            sql=(
                "CREATE INDEX IF NOT EXISTS job_name_lower_prefix_idx "
                "ON api_job (lower(name) text_pattern_ops);"
            ),
            reverse_sql=(
                "DROP INDEX IF NOT EXISTS job_name_lower_prefix_idx;"
            ),
        ),
    ]
