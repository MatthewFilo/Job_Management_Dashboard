import { useState } from 'react';
import { useMediaQuery } from '@mui/material';

export type Mode = 'light' | 'dark';

export const useTheme = () => {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<Mode>(prefersDark ? 'dark' : 'light');

  const toggleMode = () => {
    setMode(m => m === 'light' ? 'dark' : 'light');
  };

  return { mode, toggleMode };
};
