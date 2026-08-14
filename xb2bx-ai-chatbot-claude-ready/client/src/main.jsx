import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { EMBED } from './config.js';
import './styles.css';

// In embedded mode the widget fills its iframe (full-bleed, no page chrome).
if (EMBED) document.documentElement.classList.add('embed');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
