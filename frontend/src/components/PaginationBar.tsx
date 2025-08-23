import React from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

export type Props = {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  multiplePages: boolean;
  loadingMore: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/**
 * PaginationBar displays Previous/Next controls and the current page number.
 * It disables controls during loading and when the respective cursor is absent.
 */
export default function PaginationBar({ page, hasPrev, hasNext, multiplePages, loadingMore, onPrev, onNext }: Props) {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
      {multiplePages ? (
        <Button variant="outlined" onClick={onPrev} disabled={!hasPrev || loadingMore}>Previous</Button>
      ) : <Box />}
      <Typography variant="body2" color="text.secondary">Page {page}</Typography>
      {multiplePages ? (
        <Button variant="outlined" onClick={onNext} disabled={!hasNext || loadingMore} endIcon={loadingMore ? <CircularProgress size={16} /> : undefined}>Next</Button>
      ) : <Box />}
    </Box>
  );
}
