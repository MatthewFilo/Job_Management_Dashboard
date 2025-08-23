from django.core.management.base import BaseCommand, CommandParser
from django.utils import timezone

from api.models import Job, JobStatus, Status


class Command(BaseCommand):
    help = "Seed the database with a number of jobs (default: 10000)"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--count", type=int, default=10000, help="Number of jobs to create (default 10000)")
        parser.add_argument("--batch", type=int, default=1000, help="Bulk insert batch size (default 1000)")
        parser.add_argument("--prefix", type=str, default="Seed Job", help="Name prefix for created jobs")

    def handle(self, *args, **options):
        count: int = options["count"]
        batch: int = options["batch"]
        prefix: str = options["prefix"]

        self.stdout.write(self.style.NOTICE(f"Seeding {count} jobs in batches of {batch}..."))
        now = timezone.now()

        created_total = 0
        remaining = count
        name_start = 1

        while remaining > 0:
            take = min(batch, remaining)
            jobs = [
                Job(
                    name=f"{prefix} {name_start + i}",
                    current_status_type=Status.PENDING,
                    current_status_timestamp=now,
                )
                for i in range(take)
            ]
            created_jobs = Job.objects.bulk_create(jobs, batch_size=batch, ignore_conflicts=False)

            statuses = [
                JobStatus(job=j, status_type=Status.PENDING, timestamp=now)
                for j in created_jobs
            ]
            JobStatus.objects.bulk_create(statuses, batch_size=batch)

            remaining -= take
            name_start += take
            created_total += len(created_jobs)
            self.stdout.write(self.style.SUCCESS(f"Inserted {created_total}/{count}"))

        self.stdout.write(self.style.SUCCESS(f"Done! Created {created_total} jobs."))
