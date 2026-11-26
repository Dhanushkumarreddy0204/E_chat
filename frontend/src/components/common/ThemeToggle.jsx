import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  function toggle() {
    const root = document.documentElement;
    const theme = dark ? 'light' : 'dark';
    root.dataset.switchingTheme = '';
    root.dataset.theme = theme;
    requestAnimationFrame(() => requestAnimationFrame(() => { delete root.dataset.switchingTheme; }));
    try { localStorage.setItem('echat_theme', theme); } catch {}
    setDark(!dark);
  }
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
  return <button type="button" className="icon-button" onClick={toggle} aria-label={label} title={label}>
    {dark ? <Sun size={19} /> : <Moon size={19} />}
  </button>;
}
