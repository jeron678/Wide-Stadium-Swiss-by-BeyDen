import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import PublicLiveApp from './PublicLiveApp.jsx';
createRoot(document.getElementById('root')).render(<StrictMode><PublicLiveApp /></StrictMode>);
