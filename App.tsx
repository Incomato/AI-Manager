import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import MediaLibrary from './pages/MediaLibrary';
import GeneratedPosts from './pages/GeneratedPosts';
import Settings from './pages/Settings';
import AIOrder from './pages/AIOrder';
import VideoEditor from './pages/VideoEditor';
import { Page, MediaFile } from './types';
import { useScheduler } from './hooks/useScheduler';
import { useAuth } from './contexts/AuthContext';
import InvalidClientIdBanner from './components/InvalidClientIdBanner';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const { user, isClientIdInvalid, dismissClientIdWarning, authLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  const onPublishSuccess = useCallback(() => {
    (window as any).dispatchEvent(new CustomEvent('posts-updated'));
  }, []);

  useScheduler(onPublishSuccess);

  const renderPage = useCallback(() => {
    switch (currentPage) {
      case Page.MediaLibrary:
        return <MediaLibrary selectedFile={selectedFile} setSelectedFile={setSelectedFile} setCurrentPage={setCurrentPage} />;
      case Page.Dashboard:
        return <Dashboard selectedFile={selectedFile} setSelectedFile={setSelectedFile} setCurrentPage={setCurrentPage} />;
      case Page.GeneratedPosts:
        return <GeneratedPosts />;
      case Page.Settings:
        return <Settings />;
      case Page.AIOrder:
        return <AIOrder />;
      case Page.VideoEditor:
        return <VideoEditor setCurrentPage={setCurrentPage} />;
      default:
        return <Dashboard selectedFile={selectedFile} setSelectedFile={setSelectedFile} setCurrentPage={setCurrentPage} />;
    }
  }, [currentPage, selectedFile, setSelectedFile, setCurrentPage]);
  
  if (authLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-text-primary">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <span className="mt-4 text-text-secondary font-medium tracking-wide">Initializing AI Manager...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-text-primary overflow-hidden">
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {isClientIdInvalid && (
          <InvalidClientIdBanner 
            setCurrentPage={setCurrentPage} 
            onDismiss={dismissClientIdWarning} 
          />
        )}
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 h-full">
            {renderPage()}
          </div>
        </main>
      </div>

      {/* Optional: Simple Footer or Overlay Status */}
      <div className="bg-surface/50 border-t border-border px-4 py-1 text-[10px] text-text-secondary flex justify-between items-center">
        <span>AI Manager v1.0</span>
        {user && <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Logged in as {user.name}</span>}
      </div>
    </div>
  );
};

export default App;