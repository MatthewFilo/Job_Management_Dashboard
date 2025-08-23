from __future__ import annotations

from typing import Any, Dict

from django.db import transaction
from django.utils import timezone

from .models import Job, JobStatus, Status


@transaction.atomic
def create_job(validated_data: Dict[str, Any]) -> Job:
    """Create a Job and its initial status atomically (scales to millions of rows)."""
    now = timezone.now()

    # Create the job and set denormalized current status fields
    job = Job.objects.create(
        **validated_data,
        current_status_type=Status.PENDING,
        current_status_timestamp=now,
    )

    # Create initial status row
    JobStatus.objects.create(job=job, status_type=Status.PENDING, timestamp=now)

    return job


# ---- Status update service ----
# Status transitions can go from any status to another for the sake of this project
_ALL_STATUSES = {Status.PENDING, Status.IN_PROGRESS, Status.COMPLETED, Status.FAILED}
_ALLOWED_TRANSITIONS = {
    s: (_ALL_STATUSES - {s}) for s in _ALL_STATUSES
}


def _is_valid_transition(old: str | None, new: str) -> bool:
    if old is None:
        return True
    return new in _ALLOWED_TRANSITIONS.get(old, set())


@transaction.atomic
def set_job_status(job: Job, new_status: str) -> Job:
    """Safely set a job's status with basic validation and idempotency."""
    job = Job.objects.select_for_update().get(pk=job.pk)

    if new_status == job.current_status_type:
        return job

    if new_status not in Status.values:
        raise ValueError("Invalid status")

    if not _is_valid_transition(job.current_status_type, new_status):
        raise ValueError("Invalid status transition")

    now = timezone.now()
    JobStatus.objects.create(job=job, status_type=new_status, timestamp=now)
    job.current_status_type = new_status
    job.current_status_timestamp = now
    # Include updated_at so auto_now updates and is persisted
    job.save(update_fields=["current_status_type", "current_status_timestamp", "updated_at"]) 
    return job
