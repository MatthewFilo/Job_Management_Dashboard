import React from 'react';
import { Typography, Stack, Box } from '@mui/material';
import { Job } from '../types';
import JobCard from './JobCard';
import PaginationBar from './PaginationBar';
import { useJobs } from '../contexts/JobsContext';
import { PAGE_SIZE } from '../utils/cursor';

interface JobsListProps {
  jobs: Job[];
  loading: boolean;
  loadingMore: boolean;
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  hasMultiPage: boolean;
  onPrev: () => void;
  onNext: () => void;
  onDelete?: (jobId: number) => Promise<string | null>;
}

const JobsList: React.FC<JobsListProps> = ({
  jobs,
  loading,
  loadingMore,
  page,
  hasPrev,
  hasNext,
  hasMultiPage,
  onPrev,
  onNext,
  onDelete,
}) => {
  const { updatingIds, deletingIds, handleStatusChange, handleDelete } = useJobs();

  const handleJobDelete = onDelete || handleDelete;

  if (loading && jobs.length === 0) {
    return <Typography color="text.secondary">Loading…</Typography>;
  }

  if (jobs.length === 0) {
    return (
      <>
        <Typography color="text.secondary">
          No jobs yet. Create one above.
        </Typography>
        <Box mt={2}>
          <PaginationBar
            page={page}
            hasPrev={hasPrev}
            hasNext={hasNext}
            multiplePages={false}
            loadingMore={loadingMore}
            onPrev={onPrev}
            onNext={onNext}
          />
        </Box>
      </>
    );
  }

  const multiplePages = hasMultiPage || jobs.length > PAGE_SIZE || hasNext || hasPrev;

  return (
    <Stack spacing={2}>
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          updating={updatingIds.has(job.id)}
          deleting={deletingIds.has(job.id)}
          onChangeStatus={handleStatusChange}
          onDelete={handleJobDelete}
        />
      ))}
      <PaginationBar
        page={page}
        hasPrev={hasPrev}
        hasNext={hasNext}
        multiplePages={multiplePages}
        loadingMore={loadingMore}
        onPrev={onPrev}
        onNext={onNext}
      />
    </Stack>
  );
};

export default JobsList;
