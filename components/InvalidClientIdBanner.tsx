import React from 'react';
import { Page } from '../types';
import { SettingsIcon } from './icons/SettingsIcon';
import { ErrorIcon } from './icons/ErrorIcon';

interface InvalidClientIdBannerProps {
  setCurrentPage: (page: Page) => void;
  onDismiss: () => void;
}

const InvalidClientIdBanner: React.FC<InvalidClientIdBannerProps> = ({ setCurrentPage, onDismiss }) => {
  return (
    <div className="bg-red-800/90 backdrop-blur-sm text-red-100 p-3 flex items-center justify-between gap-4 sticky top-16 z-20 shadow-lg border-b border-red-700">
      <div className="flex items-center gap-3">
        <ErrorIcon />
        <div className="flex flex-col">
            <span className="font-semibold">Configuration Error</span>
            <span className="text-sm text-red-200 hidden sm:block">The Google Client ID is invalid. Sign-in will not work.</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentPage(Page.Settings)}
          className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-semibold flex items-center gap-2"
        >
          <SettingsIcon />
          <span className="hidden sm:inline">Go to Settings</span>
        </button>
        <button onClick={onDismiss} className="text-red-300 hover:text-white text-2xl leading-none" title="Dismiss Banner">
          &times;
        </button>
      </div>
    </div>
  );
};

export default InvalidClientIdBanner;
