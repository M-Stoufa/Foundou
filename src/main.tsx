import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted fonts (no external request, no third-party CDN).
// Fraunces: optical-size + weight axis. Inter: weight axis.
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/inter/wght.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/menu.css';
import './styles/admin.css';

import { App } from './App';

// Marks the document as script-enhanced: entrance effects only apply when
// JavaScript is running, so a failed script leaves a fully readable menu.
document.documentElement.classList.add('js');

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
