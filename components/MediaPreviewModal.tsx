import React, { useEffect } from 'react';
import { MediaFile } from '../types';
import TagManager from './TagManager';
import { MusicNoteIcon } from './icons/MusicNoteIcon';

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  file: MediaFile | null;
  onUpdateTags: (file: MediaFile, newTags: string[]) => Promise<void>;
}

const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ isOpen, onClose, onConfirm, file, onUpdateTags }) => {
  useEffect(() => {
    // FIX: Cast event to 'any' to access 'key' property due to TS lib issue.
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event as any).key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'document'.
      (window as any).document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'document'.
      (window as any).document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !file) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
      aria-labelledby="media-preview-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg shadow-xl w-full max-w-4xl mx-4 border border-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
             <h3 id="media-preview-title" className="text-lg font-bold text-text-primary truncate pr-4">{file.name}</h3>
             <button onClick={onClose} className="text-text-secondary text-2xl leading-none hover:text-text-primary">&times;</button>
        </div>
        <div className="p-4 flex-grow flex items-center justify-center bg-background/50 min-h-0">
            {file.type === 'image' ? (
                <img src={file.data} alt={file.name} className="max-w-full max-h-[60vh] object-contain" />
            ) : file.type === 'video' ? (
                <video src={file.data} className="max-w-full max-h-[60vh]" controls />
            ) : (
                <div className="w-full h-full bg-surface-light flex flex-col items-center justify-center p-4 rounded-md text-center">
                    <MusicNoteIcon />
                    <p className="text-lg font-semibold mt-4">{file.name}</p>
                    <audio src={file.data} controls className="mt-4 w-full max-w-sm"></audio>
                </div>
            )}
        </div>
        <div className="p-4 bg-background/50 border-t border-border flex-shrink-0">
          <TagManager file={file} onUpdateTags={onUpdateTags} />
        </div>
        <div className="p-4 bg-surface/50 border-t border-border flex justify-end gap-4 flex-shrink-0">
           <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-light text-text-primary rounded-md hover:bg-border transition-colors"
          >
            Close
          </button>
           <button
            onClick={onConfirm}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
          >
            Use this Media
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaPreviewModal;