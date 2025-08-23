import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Container,
  Typography,
  Stack,
  TextField,
  Button,
  Box,
  Alert,
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  useMediaQuery,
  Snackbar,
  Backdrop,
  CircularProgress,
} from '@mui/material';
import ThemeToggle, { Mode } from './components/ThemeToggle';
import JobCard from './components/JobCard';
import PaginationBar from './components/PaginationBar';
import { Job, StatusType } from './types';
import { indigo, teal } from '@mui/material/colors';
import client, { API_URL } from './api/client';
import { useCursorPagination } from './hooks/useCursorPagination';
import { ensurePageSize, toRelativeCursorPath, PAGE_SIZE } from './utils/cursor';
import { listJobs, createJob as createJobApi, updateJobStatus, deleteJob as deleteJobApi, Paginated } from './api/jobs';
import { useQueryClient } from '@tanstack/react-query';

// Ensure a consistent order: sort ascending by id
const sortJobsById = (list: Job[]) => [...list].sort((a, b) => a.id - b.id);

function App()
{
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [creating, setCreating] = useState<boolean>(false);
    const [name, setName] = useState<string>('');
    const [nameError, setNameError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    // New: track explicit refresh backdrop (repurposed to control button style only)
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
    const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
    const [currentPath, setCurrentPath] = useState<string>(`/jobs/?page_size=${PAGE_SIZE}`);
    // Search state (prefix-based)
    const [query, setQuery] = useState<string>('');
    // Track the last-used cursor (after/before) for parity with prior impl
    const currentCursorRef = useRef<{ after?: string | null; before?: string | null } | null>(null);
    const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
    const [mode, setMode] = useState<Mode>(prefersDark ? 'dark' : 'light');
    const theme = useMemo(() => createTheme({
      palette: {
        mode,
        primary: { main: mode === 'light' ? indigo[600] : indigo[300] },
        secondary: { main: mode === 'light' ? teal[600] : teal[300] },
        background: {
          default: mode === 'light' ? '#f8fafc' : '#0b0f15',
          paper: mode === 'light' ? '#ffffff' : '#0f172a',
        },
      },
      shape: { borderRadius: 10 },
    }), [mode]);

    const { next, prev, page, hasMultiPage, update } = useCursorPagination();
    const queryClient = useQueryClient();

    const prefetchPage = async (cursorUrl: string | null) => {
      if (!cursorUrl) return;
      const path = toRelativeCursorPath(client.defaults.baseURL!, cursorUrl);
      await queryClient.prefetchQuery({
        queryKey: ['jobsPage', path, query],
        queryFn: () => listJobs(path, { q: query || null }),
        staleTime: 30_000,
      });
    };

    const getCachedPage = (path: string): Paginated<Job> | undefined => {
      return queryClient.getQueryData(['jobsPage', path, query]) as Paginated<Job> | undefined;
    };

    /**
     * Validate a job name according to backend constraints.
     * Returns a user-friendly error string or null when valid.
     */
    const validateName = (value: string): string | null => {
      const trimmed = value.trim();
      if (!trimmed) return 'Name is required';
      if (trimmed.length > 255) return 'Name must be at most 255 characters';
      return null;
    };

    /**
     * Fetch the first page of jobs for the current search query.
     * Resets cursor pagination state and updates loading/error UI.
     */
    const fetchJobs = async () => {
        try {
            setLoading(true);
            setError(null);
            const initialPath = ensurePageSize('/jobs/');
            const data = await listJobs(initialPath, { q: query || null });
            setJobs(sortJobsById(data.results));
            update({ next: data.next, previous: data.previous }, 'reset');
            setCurrentPath(initialPath);
            currentCursorRef.current = null; // reset cursor tracker
            // Prefetch adjacent pages for snappier UX
            await Promise.all([prefetchPage(data.next), prefetchPage(data.previous)]);
        } catch (e: any) {
            setError(e?.message || 'Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    // New: explicit refresh handler that shows a backdrop while refreshing
    const handleRefresh = async () => {
      try {
        setRefreshing(true);
        await fetchJobs();
      } finally {
        setRefreshing(false);
      }
    };

    /**
     * After a create/delete, refresh the current page and handle edge cases:
     * - If the page becomes empty and there is a previous cursor, step back.
     * - If the page is partially filled but has a next cursor, reconcile via navigation or full refresh.
     * Updates cursors and loading states accordingly.
     */
    const repopulateCurrentPageAfterMutation = async () => {
      try {
        setLoadingMore(true);
        setError(null);
        const data = await listJobs(ensurePageSize(currentPath), { q: query || null });
        const results = sortJobsById(data.results);
        if (results.length === 0 && page > 1 && prev) {
          await goPrev(true); // validate next after stepping back
          return;
        }
        if (results.length < PAGE_SIZE && data.next) {
          if (page > 1 && prev) {
            await goNext();
            await goPrev();
            return;
          } else {
            await fetchJobs();
            return;
          }
        }
        setJobs(results);
        update({ next: data.next, previous: data.previous });
      } catch (e: any) {
        setError(e?.message || 'Failed to refresh page');
      } finally {
        setLoadingMore(false);
      }
    };

    /**
     * Update a single job's status and replace it in-place to preserve ordering.
     * Manages per-row updating state and surfaces any errors.
     */
    const handleStatusChange = async (jobId: number, newStatus: StatusType) => {
        try {
            setError(null);
            setUpdatingIds(prev => new Set(prev).add(jobId));
            const updated = await updateJobStatus(jobId, newStatus);
            // Replace in-place to preserve current ordering
            setJobs(prev => prev.map(j => (j.id === jobId ? updated : j)));
        } catch (e: any) {
            setError(e?.message || 'Failed to update status');
        } finally {
            setUpdatingIds(prev => { const nextSet = new Set(prev); nextSet.delete(jobId); return nextSet; });
        }
    };

    /**
     * Delete a job and then refresh the current page once the server confirms deletion.
     * Avoids optimistic shrinking to keep UI smooth. Handles per-row deleting state.
     */
    const handleDelete = async (jobId: number) => {
         try {
             setError(null);
             setDeletingIds(prev => new Set(prev).add(jobId));
             const deletedName = jobs.find(j => j.id === jobId)?.name;
             await deleteJobApi(jobId);
             // Do not optimistically shrink the list; refresh once when done
             await repopulateCurrentPageAfterMutation();
             // Show success snackbar
             setSuccess(deletedName ? `Job "${deletedName}" deleted` : 'Job deleted');
         } catch (e: any) {
             setError(e?.message || 'Failed to delete job');
         } finally {
             setDeletingIds(prev => { const nextSet = new Set(prev); nextSet.delete(jobId); return nextSet; });
         }
     };

    /**
     * Create a new job using the form value and refresh the current page.
     * Validates input and manages form state (creating, errors, helpers).
     */
    const createJob = async (evt: React.FormEvent) => {
        evt.preventDefault();
        const err = validateName(name);
        setNameError(err);
        if (err) return;
        const trimmed = name.trim();

        try {
            setCreating(true);
            setError(null);
            const created = await createJobApi(trimmed);
            await repopulateCurrentPageAfterMutation(); // stay on current page
            setName('');
            setNameError(null);
            // Show success snackbar
            setSuccess(`Job "${created.name}" created`);
        } catch (e: any) {
            setError(e?.message || 'Failed to create job');
        } finally {
            setCreating(false);
        }
    };

    /**
     * Navigate to the next cursor page, updating cursors and current path.
     * Disables controls and shows a lightweight loading state during the fetch.
     */
    const goNext = async () => {
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
     };

     /**
      * Navigate to the previous cursor page and optionally validate the forward link.
      * Keeps page number in sync and updates cursors/path.
      */
     const goPrev = async (validateNextAfterPrev?: boolean) => {
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
     };

    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Backdrop shown only for manual refresh action */}
        <Backdrop open={refreshing} sx={{ color: '#fff', zIndex: (t) => t.zIndex.drawer + 1 }}>
          <CircularProgress color="inherit" />
        </Backdrop>
        <AppBar position="sticky" color="primary" enableColorOnDark>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight={700}>ReScale Jobs</Typography>
            <ThemeToggle mode={mode} onToggle={() => setMode(m => m === 'light' ? 'dark' : 'light')} />
          </Toolbar>
        </AppBar>
        <Container maxWidth="md" sx={{ py: 4 }}>
         <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
           <TextField
             fullWidth
             label="Search jobs (prefix)"
             placeholder="Type to search by beginning of name"
             value={query}
             onChange={(e) => { setQuery(e.target.value); }}
             InputProps={{ inputProps: { maxLength: 255 } }}
           />
         </Stack>
         <Box component="form" onSubmit={createJob} noValidate>
           <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
             <TextField
               fullWidth
               label="Enter job name"
               value={name}
               onChange={(e) => { const v = e.target.value; setName(v); if (nameError) setNameError(validateName(v)); }}
               onBlur={() => setNameError(validateName(name))}
               disabled={creating}
               error={!!nameError}
               helperText={nameError || ' '}
               inputProps={{ maxLength: 255 }}
             />
            <Button type="submit" variant="contained" color="primary" disabled={creating || !name.trim()}>
              {creating ? 'Creating…' : 'Create Job'}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
           </Stack>
         </Box>

         {error && (
           <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
         )}

         <Snackbar
           open={!!error}
           message={error || ''}
           autoHideDuration={4000}
           onClose={() => setError(null)}
           anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
         />

         {/* New: success snackbar on job creation */}
         <Snackbar
           open={!!success}
           autoHideDuration={3000}
           onClose={() => setSuccess(null)}
           anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
         >
           <Alert onClose={() => setSuccess(null)} severity="success" variant="filled" sx={{ width: '100%' }}>
             {success}
           </Alert>
         </Snackbar>

         {loading && jobs.length === 0 ? (
           <Typography color="text.secondary">Loading…</Typography>
         ) : jobs.length === 0 ? (
           <Typography color="text.secondary">No jobs yet. Create one above.</Typography>
         ) : (
           <Stack spacing={2}>
             {jobs.map((job) => (
               <JobCard
                 key={job.id}
                 job={job}
                 updating={updatingIds.has(job.id)}
                 deleting={deletingIds.has(job.id)}
                 onChangeStatus={handleStatusChange}
                 onDelete={handleDelete}
               />
               ))}
              {(() => {
                const multiplePages = hasMultiPage || jobs.length > PAGE_SIZE || !!next || !!prev;
                return (
                  <PaginationBar
                    page={page}
                    hasPrev={!!prev}
                    hasNext={!!next}
                    multiplePages={multiplePages}
                    loadingMore={loadingMore}
                    onPrev={() => goPrev()}
                    onNext={() => goNext()}
                  />
                );
              })()}
             </Stack>
           )}
        </Container>
      </ThemeProvider>
     );
 }

 export default App;