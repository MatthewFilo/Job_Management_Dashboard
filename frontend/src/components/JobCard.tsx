import React from 'react';
import { Paper, Box, Typography, FormControl, InputLabel, Select, MenuItem, IconButton } from '@mui/material';
import { alpha } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Job, StatusType } from '../types';
import { useNavigate } from 'react-router-dom';

/** Props for JobCard component controlling rendering and actions for a single job. */
type Props = {
  job: Job;
  updating: boolean;
  deleting: boolean;
  onChangeStatus: (id: number, newStatus: StatusType) => void;
  onDelete: (id: number) => void;
};

function FallbackCard({ error }: { error: Error }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderLeft: '6px solid', borderLeftColor: 'error.main' }}>
      <Typography color="error">Failed to render job: {error.message}</Typography>
    </Paper>
  );
}

// Error boundary to ensure a single failing card doesn't break the whole list.
class JobCardBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  state = { hasError: false, error: undefined as Error | undefined };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error) { /* could log */ }
  render() { return this.state.hasError && this.state.error ? <FallbackCard error={this.state.error} /> : this.props.children as any; }
}

export default function JobCard({ job, updating, deleting, onChangeStatus, onDelete }: Props) {
  const navigate = useNavigate();
  const handleCardClick = () => {
    navigate(`/jobs/${job.id}`);
  };

  return (
    <JobCardBoundary>
      <Paper
        variant="outlined"
        onClick={handleCardClick}
        sx={(t) => {
          const s = job.current_status?.status_type;
          const color = s === 'PENDING' ? t.palette.warning.main
            : s === 'IN_PROGRESS' ? t.palette.info.main
            : s === 'COMPLETED' ? t.palette.success.main
            : s === 'FAILED' ? t.palette.error.main
            : t.palette.divider;
          return {
            p: 2,
            borderLeft: '6px solid',
            borderLeftColor: color,
            bgcolor: alpha(color, t.palette.mode === 'light' ? 0.06 : 0.14),
            overflow: 'hidden',
            cursor: 'pointer',
          };
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} sx={{ flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 0, flex: '1 1 320px' }}>
            <Typography
              fontWeight={600}
              sx={{
                whiteSpace: { xs: 'normal', sm: 'nowrap' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                wordBreak: { xs: 'break-word' },
              }}
              title={job.name}
            >
              {job.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Created: {new Date(job.created_at).toLocaleString()}
            </Typography>
          </Box>

          <Box
            display="flex"
            alignItems="center"
            gap={2}
            sx={{ flex: '0 1 auto', minWidth: 0, maxWidth: '100%', mt: { xs: 1, sm: 0 } }}
          >
            <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 180 }, flex: '0 0 auto' }} onClick={(e) => e.stopPropagation()}>
              <InputLabel id={`status-label-${job.id}`}>Status</InputLabel>
              <Select
                labelId={`status-label-${job.id}`}
                label="Status"
                value={job.current_status?.status_type ?? ''}
                onChange={(e) => onChangeStatus(job.id, e.target.value as StatusType)}
                disabled={updating}
                data-testid="status-select"
                onClick={(e) => e.stopPropagation()}
              >
                <MenuItem value={'PENDING'}>Pending</MenuItem>
                <MenuItem value={'IN_PROGRESS'}>In Progress</MenuItem>
                <MenuItem value={'COMPLETED'}>Completed</MenuItem>
                <MenuItem value={'FAILED'}>Failed</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flex: '0 1 auto' }}>
              {job.current_status?.timestamp && (
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {new Date(job.current_status.timestamp).toLocaleString()}
                </Typography>
              )}
            </Box>
            <IconButton
              aria-label="delete job"
              color="error"
              onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}
              disabled={deleting}
              sx={{ flex: '0 0 auto' }}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>
    </JobCardBoundary>
  );
}
