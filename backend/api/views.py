from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.core.cache import cache
from django.conf import settings
from django.db.models.functions import Lower

from .models import Job, JobStatus
from .serializers import JobSerializer, JobListSerializer, StatusUpdateSerializer, JobStatusSerializer
from . import services

import logging

logger = logging.getLogger(__name__)

class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.all().only('id', 'name', 'created_at', 'updated_at', 'current_status_type', 'current_status_timestamp').order_by('id')

    def get_queryset(self):
        qs = Job.objects.all().only(
            'id', 'name', 'created_at', 'updated_at', 'current_status_type', 'current_status_timestamp'
        ).order_by('id')
        q = self.request.query_params.get('q') if hasattr(self, 'request') and self.request else None
        if q:
            # Case-insensitive prefix search using functional index on lower(name)
            qs = qs.annotate(name_lower=Lower('name')).filter(name_lower__startswith=q.lower())
        return qs

    def get_serializer_class(self):
        return JobSerializer

    def _cache_get(self, key: str):
        try:
            return cache.get(key)
        except Exception as e:
            logger.error(f"Unexpected cache error for key {key}: {e}")
            return None

    def _cache_set(self, key: str, value, timeout: int):
        try:
            cache.set(key, value, timeout=timeout)
        except Exception as e:
            logger.error(f"Unexpected cache error for key {key}: {e}")
            pass

    def _epoch(self) -> int:
        try:
            val = cache.get(settings.CACHE_EPOCH_KEY)
            if val is None:
                cache.set(settings.CACHE_EPOCH_KEY, 1, timeout=None)
                return 1
            return int(val)
        except Exception as e:
            logger.error(f"Unexpected cache error while getting epoch: {e}")
            return 1

    def list(self, request, *args, **kwargs):
        try:
            epoch = self._epoch()
            q = (request.query_params.get('q') or '').lower()
            cursor = request.query_params.get('cursor') or ''
            size = request.query_params.get('page_size') or ''
            cache_key = f"jobs:list:v{epoch}:q={q}:cursor={cursor}:size={size}"
            cached = self._cache_get(cache_key)
            if cached:
                return Response(cached)

            resp = super().list(request, *args, **kwargs)
            # Only cache successful responses with expected shape
            if resp.status_code == 200 and isinstance(resp.data, dict) and 'results' in resp.data:
                self._cache_set(cache_key, resp.data, timeout=30)
            return resp
        except Exception:
            return Response({'detail': 'Failed to list jobs'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, *args, **kwargs):
        try:
            epoch = self._epoch()  # allow epoch switch if we want to bust detail, too
            pk = kwargs.get('pk')
            cache_key = f"job:{pk}:v{epoch}"
            cached = self._cache_get(cache_key)
            if cached:
                return Response(cached)
            resp = super().retrieve(request, *args, **kwargs)
            if resp.status_code == 200:
                self._cache_set(cache_key, resp.data, timeout=120)
            return resp
        except Exception:
            return Response({'detail': 'Failed to retrieve job'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request, *args, **kwargs):
        try:
            resp = super().create(request, *args, **kwargs)
            if resp.status_code == 201:
                try:
                    cache.incr(settings.CACHE_EPOCH_KEY)
                except Exception:
                    pass
            return resp
        except ValidationError as e:
            return Response({'detail': e.detail if hasattr(e, 'detail') else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'detail': 'Failed to create job'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            resp = super().destroy(request, *args, **kwargs)
            if resp.status_code in (200, 204):
                try:
                    cache.delete_many([f"job:{instance.id}:v{self._epoch()}", f"job:{instance.id}:history:v{self._epoch()}"])
                    cache.incr(settings.CACHE_EPOCH_KEY)
                except Exception:
                    pass
            return resp
        except Exception:
            return Response({'detail': 'Failed to delete job'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='status')
    def set_status(self, request, pk=None):
        job = self.get_object()
        serializer = StatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status_type']
        try:
            updated = services.set_job_status(job, new_status)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'detail': 'Failed to update status'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Bust per-job caches and increment epoch for list pages
        try:
            cache.delete_many([f"job:{updated.id}:v{self._epoch()}", f"job:{updated.id}:history:v{self._epoch()}"])
            cache.incr(settings.CACHE_EPOCH_KEY)
        except Exception as e:
            logger.error(f"Unexpected cache error while updating job status: {e}")
            pass
        return Response(JobSerializer(updated).data)

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        job = self.get_object()
        epoch = self._epoch()
        cache_key = f"job:{job.id}:history:v{epoch}"
        cached = self._cache_get(cache_key)
        if cached:
            return Response(cached)
        statuses = JobStatus.objects.filter(job=job)
        data = JobStatusSerializer(statuses, many=True).data
        payload = {
            'job': JobSerializer(job).data,
            'results': data,
        }
        self._cache_set(cache_key, payload, timeout=60)
        return Response(payload)
