import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './styles-dark.css';
import './theme-dark.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
