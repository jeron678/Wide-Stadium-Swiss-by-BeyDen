import React, { useEffect, useState } from 'react';

export default function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('beyden-theme') || 'system');

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    localStorage.setItem('beyden-theme', theme);
  }, [theme]);

  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const label = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';
  const icon = theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🖥️';
  return <button className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''}`} onClick={() => setTheme(next)} aria-label={`Theme: ${label}. Switch to ${next} mode.`} title={`Theme: ${label} · click for ${next}`}><span>{icon}</span>{!compact && <span>{label}</span>}</button>;
}
