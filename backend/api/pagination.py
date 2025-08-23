from rest_framework.pagination import CursorPagination

class JobCursorPagination(CursorPagination):
    # Use a stable, indexed, unique ordering for deterministic pagination
    ordering = 'id'  # ascending by id (oldest first)
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100
