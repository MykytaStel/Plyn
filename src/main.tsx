import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/lexend/400.css';
import '@fontsource/lexend/700.css';
import '@fontsource/literata/400.css';
import '@fontsource/literata/700.css';
import 'open-dyslexic/open-dyslexic-regular.css';
import '@fontsource/andika/400.css';
import '@fontsource/andika/700.css';
import { App } from './App';
import { AppErrorBoundary } from './features/errors/AppErrorBoundary';
import './styles/fonts.css';
import './styles/index.css';
import { registerAppServiceWorker } from './services/pwa/registerApp';

registerAppServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
