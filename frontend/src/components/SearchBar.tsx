import React from 'react';
import { TextField, Stack } from '@mui/material';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ query, onQueryChange }) => {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
      <TextField
        fullWidth
        label="Search jobs (prefix)"
        placeholder="Type to search by beginning of name"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        InputProps={{ inputProps: { maxLength: 255 } }}
      />
    </Stack>
  );
};

export default SearchBar;
