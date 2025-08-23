import { useCallback } from 'react';

export interface PaginationState {
  page?: number;
  next?: string | null;
  prev?: string | null;
  query?: string;
  currentPath?: string;
}

export const usePaginationState = () => {
  const STORAGE_KEY = 'jobDashboard_paginationState';

  const saveState = useCallback((state: PaginationState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save pagination state:', error);
    }
  }, []);

  const loadState = useCallback((): PaginationState | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load pagination state:', error);
      return null;
    }
  }, []);

  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear pagination state:', error);
    }
  }, []);

  const buildJobDetailUrl = useCallback((jobId: number): string => {
    return `/jobs/${jobId}`;
  }, []);

  return {
    saveState,
    loadState,
    clearState,
    buildJobDetailUrl,
  };
};
