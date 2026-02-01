import React from 'react';
import { MediaFile } from '../types';
import MediaItem from './MediaItem';

interface MediaGridProps {
  mediaFiles: MediaFile[];
  selectedFileId: number | null;
  onSelectFile: (file: MediaFile) => void;
  isFiltered: boolean;
  isGuest?: boolean;
  isMultiSelectMode: boolean;
  selectedIdsForTimeline: Set<number>;
}

const MediaGrid: React.FC<MediaGridProps> = ({ mediaFiles, selectedFileId, onSelectFile, isFiltered, isGuest, isMultiSelectMode, selectedIdsForTimeline }) => {
  if (mediaFiles.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
        {isFiltered ? (
            <>
                <p className="text-text-secondary">No media files match your search.</p>
                <p className="text-text-secondary text-sm mt-2">Try adjusting your filters.</p>
            </>
        ) : isGuest ? (
            <>
                <p className="text-text-secondary">Sign in to upload and view your media.</p>
                <p className="text-text-secondary text-sm mt-2">Your personal media library will appear here once you're logged in.</p>
            </>
        ) : (
            <>
                <p className="text-text-secondary">No media files uploaded yet.</p>
                <p className="text-text-secondary text-sm mt-2">Use the upload button to add your photos and videos.</p>
            </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {mediaFiles.map((file) => (
        <MediaItem
          key={file.id}
          file={file}
          isSelected={file.id === selectedFileId}
          onSelect={() => onSelectFile(file)}
          isMultiSelectMode={isMultiSelectMode}
          isSelectedForTimeline={selectedIdsForTimeline.has(file.id!)}
        />
      ))}
    </div>
  );
};

export default MediaGrid;