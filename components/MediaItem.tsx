import React, { useState, useEffect, useRef } from 'react';
import { MediaFile } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import Spinner from './Spinner';
import { MusicNoteIcon } from './icons/MusicNoteIcon';

interface MediaItemProps {
  file: MediaFile;
  isSelected: boolean; // For single-file selection (preview)
  onSelect: () => void; // For single-file selection (preview)
  isMultiSelectMode: boolean;
  isSelectedForTimeline: boolean;
}

const MediaItem: React.FC<MediaItemProps> = ({ file, isSelected, onSelect, isMultiSelectMode, isSelectedForTimeline }) => {
  const [localData, setLocalData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useRef(true);

  const selectionClasses = isSelected && !isMultiSelectMode ? 'ring-4 ring-primary' : 'ring-2 ring-transparent hover:ring-primary';
  const hasTags = file.tags && file.tags.length > 0;

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const loadLocalFile = async () => {
      if (file.isLocal && file.filePath && !localData) {
        setIsLoading(true);
        if ((window as any).electronAPI) {
            const dataUrl = await (window as any).electronAPI.readFileAsDataURL(file.filePath);
            if (isMounted.current) {
                setLocalData(dataUrl || '');
                setIsLoading(false);
            }
        }
      }
    };
    loadLocalFile();
  }, [file, localData]);

  const displayData = file.isLocal ? localData : file.data;

  return (
    <div
      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${selectionClasses}`}
      onClick={onSelect}
    >
       {isLoading && (
            <div className="absolute inset-0 bg-surface/50 flex items-center justify-center z-10">
                <Spinner />
            </div>
        )}
      {isSelectedForTimeline && (
         <div className="absolute inset-0 bg-primary/60 flex items-center justify-center z-10 pointer-events-none">
            <CheckCircleIcon />
        </div>
      )}
      {file.type === 'image' ? (
        <img src={displayData} alt={file.name} className="w-full h-full object-cover" />
      ) : file.type === 'video' ? (
        <video src={displayData} className="w-full h-full object-cover" muted loop playsInline />
      ) : (
        <div className="w-full h-full bg-surface-light flex flex-col items-center justify-center p-2">
            <MusicNoteIcon />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        {hasTags && (
            <div className="flex flex-wrap gap-1 mb-1">
                {file.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs bg-primary/80 text-white px-1.5 py-0.5 rounded-full truncate">
                        {tag}
                    </span>
                ))}
            </div>
        )}
        <p className="text-text-primary text-xs truncate">{file.name}</p>
      </div>
       {file.type === 'video' && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded-full p-1 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm12.586 2.586a.5.5 0 01.707.707L15.207 9H16a1 1 0 110 2h-.793l2.083 2.083a.5.5 0 01-.707.707L14.5 11.707V13a1 1 0 11-2 0v-1.293l-2.083 2.083a.5.5 0 01-.707-.707L11.707 11H11a1 1 0 110-2h.707l-2.083-2.083a.5.5 0 01.707-.707L12.5 8.293V7a1 1 0 112 0v1.293l2.086-2.083zM6 8a1 1 0 11-2 0 1 1 0 012 0zm-2 4a1 1 0 100 2 1 1 0 000-2z" />
            </svg>
        </div>
       )}
    </div>
  );
};

export default MediaItem;