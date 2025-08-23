from django.utils import timezone
from rest_framework import serializers
from .models import Job, JobStatus, Status

class JobSerializer(serializers.ModelSerializer):
    current_status = serializers.SerializerMethodField()
    # Accept status updates via PATCH/PUT without exposing this on reads
    status_type = serializers.ChoiceField(choices=Status.choices, required=False, write_only=True)

    class Meta:
        model = Job
        fields = ['id', 'name', 'created_at', 'updated_at', 'current_status', 'status_type']
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_status']

    def get_current_status(self, obj):
        # Prefer denormalized fields to avoid extra queries in lists
        return {
            'status_type': getattr(obj, 'current_status_type', None),
            'timestamp': getattr(obj, 'current_status_timestamp', None),
        }
    
    def create(self, validated_data):
        # Delegate to service layer to ensure atomic write and consistent status creation
        from . import services
        # Remove write-only field if present
        validated_data.pop('status_type', None)
        return services.create_job(validated_data)

    def update(self, instance, validated_data):
        from . import services
        # Keep name immutable (can be relaxed if requirements change)
        if 'name' in validated_data and validated_data['name'] != instance.name:
            raise serializers.ValidationError({'name': 'This field is immutable.'})

        # If status_type provided, perform a status update and return refreshed instance
        new_status = validated_data.pop('status_type', None)
        if new_status is not None:
            updated = services.set_job_status(instance, new_status)
            return updated

        # Nothing to update
        return instance


class JobStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobStatus
        fields = ['id', 'job', 'status_type', 'timestamp']
        read_only_fields = ['id', 'timestamp']


# Optional: a minimal list serializer for high-volume list endpoints
class JobListSerializer(serializers.ModelSerializer):
    current_status = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = ['id', 'name', 'created_at', 'current_status']
        read_only_fields = fields

    def get_current_status(self, obj):
        return {
            'status_type': getattr(obj, 'current_status_type', None),
            'timestamp': getattr(obj, 'current_status_timestamp', None),
        }


class StatusUpdateSerializer(serializers.Serializer):
    status_type = serializers.ChoiceField(choices=Status.choices)

