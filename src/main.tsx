import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CompoundProvider } from './components/CompoundProvider';
import { CaissaCacheProvider } from './context/CaissaCacheContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CompoundProvider>
      <CaissaCacheProvider>
        <App />
      </CaissaCacheProvider>
    </CompoundProvider>
  </StrictMode>,
);
