from django.db import models
from django.utils import timezone

# Create your models here.
class Status(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'

class Job(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    current_status_type = models.CharField(max_length=20, choices=Status.choices, null=True, blank=True, db_index=True)
    current_status_timestamp = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        indexes = [
            # Optimize prefix searches (name LIKE 'prefix%') on Postgres
            models.Index(fields=['name'], name='job_name_prefix_idx', opclasses=['varchar_pattern_ops']),
        ]

    def __str__(self) -> str:
        return f"{self.name}"
    
    @property
    def current_status(self):
        return self.statuses.order_by('-timestamp').first()

class JobStatus(models.Model):
    job = models.ForeignKey(Job, related_name='statuses', on_delete=models.CASCADE)
    status_type = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['timestamp', 'id']
        indexes = [
            models.Index(fields=['job', '-timestamp']),
        ]
    
    def __str__(self) -> str:
        return f"{self.job.name} - {self.get_status_type_display()} at {self.timestamp}"