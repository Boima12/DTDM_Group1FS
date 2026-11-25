import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AppProvider } from './context/AppContext.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <AppProvider>
                    <App />
                </AppProvider>
            </BrowserRouter>
        </ErrorBoundary>
    </StrictMode>
);
