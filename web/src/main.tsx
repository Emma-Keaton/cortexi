import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './theme.css';

// Apply saved theme before first paint (defaults to dark).
const saved = localStorage.getItem('cortexi_theme') ?? 'dark';
document.documentElement.dataset.theme = saved;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
