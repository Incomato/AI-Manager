import React from 'react';
// Fix: Use 'react-dom/client' for the React 18 createRoot API.
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { AIProvider } from './contexts/AIContext';
import { EnvProvider } from "./contexts/EnvContext";
import { VideoEditorProvider } from './contexts/VideoEditorContext';

// Fix: Explicitly reference window.document to prevent TypeScript errors in environments with misconfigured 'lib' options.
// FIX: Cast 'window' to 'any' to bypass TS lib issue with 'document'.
const rootElement = (window as any).document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Fix: Switched to the React 18 createRoot API to resolve the TypeScript error on `ReactDOM.render`.
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <EnvProvider>
      <AuthProvider>
        <AIProvider>
          <VideoEditorProvider>
            <App />
          </VideoEditorProvider>
        </AIProvider>
      </AuthProvider>
    </EnvProvider>
  </React.StrictMode>
);
