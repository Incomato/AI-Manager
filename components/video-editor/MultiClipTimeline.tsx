import React, { useState } from 'react';
import { MediaFile } from '../../types';

type ClipWithDuration = {
    file: MediaFile;
    duration: number;
}

interface MultiClipTimelineProps {
  clips: ClipWithDuration[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  selectedClipIndex: number | null;
  onSelectClip: (index: number) => void;
}

const MultiClipTimeline: React.FC<MultiClipTimelineProps> = ({ clips, onReorder, selectedClipIndex, onSelectClip }) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedIndex(index);
        // FIX: Cast e.dataTransfer to 'any' to bypass TS lib issue with 'effectAllowed'.
        (e.dataTransfer as any).effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessary to allow drop
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, toIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null) return;
        if (draggedIndex !== toIndex) {
            onReorder(draggedIndex, toIndex);
        }
        setDraggedIndex(null);
    };

    return (
        <div className="w-full bg-background/50 rounded-lg p-2 mt-4 select-none">
            <div 
                className="flex items-center h-20 space-x-1"
                onDragOver={handleDragOver}
            >
                {clips.map(({ file, duration }, index) => (
                    <div
                        key={file.id}
                        className={`relative h-full rounded-md overflow-hidden cursor-pointer border-2 ${selectedClipIndex === index ? 'border-primary' : 'border-transparent'}`}
                        style={{ width: `${Math.max(duration * 10, 60)}px` }} // Proportional width, min 60px
                        onClick={() => onSelectClip(index)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={() => setDraggedIndex(null)}
                    >
                        <video 
                            src={file.data} 
                            className="w-full h-full object-cover pointer-events-none" 
                            preload="metadata"
                        />
                         <div className="absolute bottom-0 left-0 right-0 bg-background/50 p-1 text-text-primary text-xs truncate pointer-events-none">
                            {file.name}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MultiClipTimeline;