import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Container,
  Typography,
  Stack,
  Paper,
  Box,
  Alert,
  CircularProgress,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Button,
  useMediaQuery,
} from '@mui/material';
import { indigo, teal } from '@mui/material/colors';
import { Job, JobStatus } from '../types';
import { getJob, getJobHistory } from '../api/jobs';
import ThemeToggle, { Mode } from '../components/ThemeToggle';

export default function JobDetail() {
  const { id } = useParams();
  const jobId = Number(id);

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

  const [job, setJob] = useState<Job | null>(null);
  const [history, setHistory] = useState<JobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [j, h] = await Promise.all([
          getJob(jobId),
          getJobHistory(jobId).then(r => r.results),
        ]);
        if (!mounted) return;
        setJob(j);
        // Reverse to show most recent first (current status at the top)
        setHistory([...h].reverse());
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load job');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [jobId]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" color="primary" enableColorOnDark>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>Job Detail</Typography>
          <ThemeToggle mode={mode} onToggle={() => setMode(m => m === 'light' ? 'dark' : 'light')} />
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={2}>
          <Button variant="text" component={RouterLink} to="/">← Back to jobs</Button>
          {error && <Alert severity="error">{error}</Alert>}
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={6}><CircularProgress /></Box>
          ) : job ? (
            <>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>{job.name}</Typography>
                <Typography variant="body2" color="text.secondary">Created: {new Date(job.created_at).toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">Updated: {new Date(job.updated_at).toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Current Status: {job.current_status?.status_type || '—'}
                  {job.current_status?.timestamp ? ` @ ${new Date(job.current_status.timestamp).toLocaleString()}` : ''}
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Status History</Typography>
                {history.length === 0 ? (
                  <Typography color="text.secondary">No history yet.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {history.map(s => (
                      <Box key={s.id} display="flex" justifyContent="space-between" sx={{ borderBottom: '1px dashed', borderColor: 'divider', py: 1 }}>
                        <Typography>{s.status_type}</Typography>
                        <Typography color="text.secondary">{new Date(s.timestamp).toLocaleString()}</Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </>
          ) : (
            <Typography color="text.secondary">Job not found.</Typography>
          )}
        </Stack>
      </Container>
    </ThemeProvider>
  );
}
