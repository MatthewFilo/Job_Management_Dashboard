import React, { useMemo } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  useMediaQuery,
} from '@mui/material';
import { indigo, teal } from '@mui/material/colors';
import ThemeToggle, { Mode } from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
  mode: Mode;
  onToggleMode: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, mode, onToggleMode }) => {
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" color="primary" enableColorOnDark>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>
            Job Management Dashboard
          </Typography>
          <ThemeToggle mode={mode} onToggle={onToggleMode} />
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {children}
      </Container>
    </ThemeProvider>
  );
};

export default Layout;
