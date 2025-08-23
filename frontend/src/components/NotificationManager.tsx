import React from 'react';
import { Alert, Snackbar, Backdrop, CircularProgress } from '@mui/material';

interface NotificationManagerProps {
  error: string | null;
  success: string | null;
  refreshing: boolean;
  onClearError: () => void;
  onClearSuccess: () => void;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({
  error,
  success,
  refreshing,
  onClearError,
  onClearSuccess,
}) => {
  return (
    <>
      {/* Backdrop for refresh */}
      <Backdrop 
        open={refreshing} 
        sx={{ color: '#fff', zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        message={error || ''}
        autoHideDuration={4000}
        onClose={onClearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={onClearSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={onClearSuccess} 
          severity="success" 
          variant="filled" 
          sx={{ width: '100%' }}
        >
          {success}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationManager;
