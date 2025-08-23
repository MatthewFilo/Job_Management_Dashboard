import { useState, useCallback, useRef } from 'react';
import { Job } from '../types';
import { listJobs, Paginated } from '../api/jobs';
import { useCursorPagination } from './useCursorPagination';
import { ensurePageSize, toRelativeCursorPath, PAGE_SIZE } from '../utils/cursor';
import client from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

// Ensure a consistent order: sort ascending by id
const sortJobsById = (list: Job[]) => [...list].sort((a, b) => a.id - b.id);

export const useJobsManagement = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>(`/jobs/?page_size=${PAGE_SIZE}`);
  const [query, setQuery] = useState<string>('');
  
  const currentCursorRef = useRef<{ after?: string | null; before?: string | null } | null>(null);
  const { next, prev, page, hasMultiPage, update } = useCursorPagination();
  const queryClient = useQueryClient();

  const prefetchPage = useCallback(async (cursorUrl: string | null) => {
    if (!cursorUrl) return;
    const path = toRelativeCursorPath(client.defaults.baseURL!, cursorUrl);
    await queryClient.prefetchQuery({
      queryKey: ['jobsPage', path, query],
      queryFn: () => listJobs(path, { q: query || null }),
      staleTime: 30_000,
    });
  }, [query, queryClient]);


  const getCachedPage = useCallback((path: string): Paginated<Job> | undefined => {
    return queryClient.getQueryData(['jobsPage', path, query]) as Paginated<Job> | undefined;
  }, [query, queryClient]);


  const fetchJobs = useCallback(async (setJobs: (jobs: Job[]) => void) => {
    try {
      setLoading(true);
      setError(null);
      const initialPath = ensurePageSize('/jobs/');
      const data = await listJobs(initialPath, { q: query || null });
      setJobs(sortJobsById(data.results));
      update({ next: data.next, previous: data.previous }, 'reset');
      setCurrentPath(initialPath);
      currentCursorRef.current = null;
      await Promise.all([prefetchPage(data.next), prefetchPage(data.previous)]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [query, update, prefetchPage]);

  const repopulateCurrentPage = useCallback(async (setJobs: (jobs: Job[]) => void) => {
    try {
      setLoadingMore(true);
      setError(null);
      const data = await listJobs(ensurePageSize(currentPath), { q: query || null });
      const results = sortJobsById(data.results);
      
      // If current page is empty and we're not on page 1, navigate back
      if (results.length === 0 && page > 1 && prev) {
        // Navigate back to previous page
        const path = toRelativeCursorPath(client.defaults.baseURL!, prev);
        const cached = getCachedPage(path);
        const prevData = cached || await listJobs(path, { q: query || null });
        setJobs(sortJobsById(prevData.results));
        update({ next: prevData.next, previous: prevData.previous }, 'prev');
        setCurrentPath(path);
        currentCursorRef.current = { before: prev };
        return { handled: true };
      }
      
      // If page is partially filled but has next content, try to backfill
      if (results.length < PAGE_SIZE && data.next) {
        if (page > 1 && prev) {
          // Try to navigate forward and back to get full pages
          const nextPath = toRelativeCursorPath(client.defaults.baseURL!, data.next);
          const nextData = await listJobs(nextPath, { q: query || null });
          if (nextData.results.length > 0) {
            // Go back to previous page to get a full page
            const path = toRelativeCursorPath(client.defaults.baseURL!, prev);
            const cached = getCachedPage(path);
            const prevData = cached || await listJobs(path, { q: query || null });
            setJobs(sortJobsById(prevData.results));
            update({ next: prevData.next, previous: prevData.previous }, 'prev');
            setCurrentPath(path);
            currentCursorRef.current = { before: prev };
            return { handled: true };
          }
        } else {
          // We're on page 1, just refresh everything
          await fetchJobs(setJobs);
          return { handled: true };
        }
      }
      
      setJobs(results);
      update({ next: data.next, previous: data.previous });
      return { handled: true };
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh page');
      return { handled: true };
    } finally {
      setLoadingMore(false);
    }
  }, [currentPath, query, page, prev, update, fetchJobs, getCachedPage]);


  const goNext = useCallback(async (setJobs: (jobs: Job[]) => void) => {
    if (!next) return;
    try {
      setLoadingMore(true);
      setError(null);
      currentCursorRef.current = { after: next };
      const path = toRelativeCursorPath(client.defaults.baseURL!, next);
      const cached = getCachedPage(path);
      const data = cached || await listJobs(path, { q: query || null });
      const results = sortJobsById(data.results);
      
      if (results.length === 0) {
        update({ next: null, previous: data.previous });
        return;
      }
      
      setJobs(results);
      update({ next: data.next, previous: data.previous }, 'next');
      setCurrentPath(path);
      await Promise.all([prefetchPage(data.next), prefetchPage(data.previous)]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load page');
    } finally {
      setLoadingMore(false);
    }
  }, [next, getCachedPage, query, update, prefetchPage]);


  const goPrev = useCallback(async (setJobs: (jobs: Job[]) => void, validateNextAfterPrev?: boolean) => {
    if (!prev) return;
    try {
      setLoadingMore(true);
      setError(null);
      currentCursorRef.current = { before: prev };
      const path = toRelativeCursorPath(client.defaults.baseURL!, prev);
      const cached = getCachedPage(path);
      const data = cached || await listJobs(path, { q: query || null });
      setJobs(sortJobsById(data.results));
      update({ next: data.next, previous: data.previous }, 'prev');
      setCurrentPath(path);

      if (validateNextAfterPrev && data.next) {
        try {
          const probePath = toRelativeCursorPath(client.defaults.baseURL!, data.next);
          const probe = await listJobs(probePath);
          if ((probe.results || []).length === 0) {
            update({ next: null, previous: data.previous });
          }
        } catch { /* ignore probe errors */ }
      }
      
      await Promise.all([prefetchPage(data.next), prefetchPage(data.previous)]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load page');
    } finally {
      setLoadingMore(false);
    }
  }, [prev, getCachedPage, query, update, prefetchPage]);


  return {
    // State
    loading,
    loadingMore,
    error,
    setError,
    query,
    setQuery,
    currentPath,
    
    // Pagination
    next,
    prev,
    page,
    hasMultiPage,
    
    // Actions
    fetchJobs,
    repopulateCurrentPage,
    goNext,
    goPrev,
  };
};
