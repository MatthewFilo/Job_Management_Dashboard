import React from 'react';
import { Alert, Button, Container, Stack } from '@mui/material';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
          <Stack spacing={2}>
            <Alert severity="error">Something went wrong: {this.state.error?.message || 'Unknown error'}</Alert>
            <Button variant="contained" onClick={this.handleReload}>Reload</Button>
          </Stack>
        </Container>
      );
    }
    return this.props.children as any;
  }
}
