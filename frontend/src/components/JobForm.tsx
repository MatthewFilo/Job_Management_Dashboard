import React, { useState } from 'react';
import { TextField, Button, Box, Stack } from '@mui/material';

interface JobFormProps {
  onCreateJob: (name: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  creating: boolean;
  loading: boolean;
}

const JobForm: React.FC<JobFormProps> = ({ onCreateJob, onRefresh, creating, loading }) => {
  const [name, setName] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);

  const validateName = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return 'Name is required';
    if (trimmed.length > 255) return 'Name must be at most 255 characters';
    return null;
  };

  const handleSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    const err = validateName(name);
    setNameError(err);
    if (err) return;

    try {
      await onCreateJob(name.trim());
      setName('');
      setNameError(null);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (nameError) {
      setNameError(validateName(value));
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Enter job name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={() => setNameError(validateName(name))}
          disabled={creating}
          error={!!nameError}
          helperText={nameError || ' '}
          inputProps={{ maxLength: 255 }}
        />
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={creating || !name.trim()}
        >
          {creating ? 'Creating…' : 'Create Job'}
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>
    </Box>
  );
};

export default JobForm;
