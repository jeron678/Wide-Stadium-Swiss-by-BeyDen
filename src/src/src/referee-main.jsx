import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import RefereeDashboardApp from './RefereeDashboardApp.jsx';
import AuthGate from './AuthGate.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate><RefereeDashboardApp /></AuthGate>
  </StrictMode>,
);
