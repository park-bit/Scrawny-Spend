import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          1000 * 60 * 2,   // 2 min
      refetchOnWindowFocus: false,
      retry:              1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#162847',
              color:      '#f1f5f9',
              border:     '1px solid rgba(255,255,255,0.08)',
              fontFamily: '"DM Sans", sans-serif',
              fontSize:   '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0a1628' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#0a1628' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
