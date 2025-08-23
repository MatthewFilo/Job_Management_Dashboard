import { IconButton, Tooltip } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';

export type Mode = 'light' | 'dark';

type Props = {
  mode: Mode;
  onToggle: () => void;
};

export default function ThemeToggle({ mode, onToggle }: Props) {
  return (
    <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
      <IconButton color="inherit" onClick={onToggle} aria-label="toggle theme">
        {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}
