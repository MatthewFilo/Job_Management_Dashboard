import { useCallback, useRef, useState } from 'react';

/**
 * Cursor pagination hook to track next/previous cursors, current page, and multi-page state.
 * Call update() with server-provided links and an optional direction to advance or reset page count.
 */
export function useCursorPagination() {
  const [next, setNext] = useState<string | null>(null);
  const [prev, setPrev] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMultiPage, setHasMultiPage] = useState<boolean>(false);
  const cursorRef = useRef<{ next: string | null; prev: string | null }>({ next: null, prev: null });

  /**
   * Update cursor links and page state.
   * - links: object with next/previous URLs from the API response
   * - direction: 'next' | 'prev' | 'reset' — influences the page counter
   */
  const update = useCallback((links: { next?: string | null; previous?: string | null }, direction?: 'next' | 'prev' | 'reset') => {
    const n = links.next ?? null;
    const p = links.previous ?? null;
    cursorRef.current = { next: n, prev: p };
    setNext(n);
    setPrev(p);
    setHasMultiPage(!!(n || p));

    if (direction === 'next') setPage((v) => v + 1);
    else if (direction === 'prev') setPage((v) => Math.max(1, v - 1));
    else if (direction === 'reset') setPage(1);
  }, []);

  return { next, prev, page, hasMultiPage, update };
}
