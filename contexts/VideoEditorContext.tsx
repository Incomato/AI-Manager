import React, { createContext, useContext, useState, useCallback } from 'react';
import { MediaFile } from '../types';

interface VideoEditorContextType {
  timelineClips: MediaFile[];
  setTimelineClips: React.Dispatch<React.SetStateAction<MediaFile[]>>;
  addClipsToTimeline: (clips: MediaFile[]) => void;
}

const VideoEditorContext = createContext<VideoEditorContextType | undefined>(undefined);

export const VideoEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timelineClips, setTimelineClips] = useState<MediaFile[]>([]);

  const addClipsToTimeline = useCallback((clips: MediaFile[]) => {
    setTimelineClips(prevClips => [...prevClips, ...clips]);
  }, []);

  const value = { timelineClips, setTimelineClips, addClipsToTimeline };

  return <VideoEditorContext.Provider value={value}>{children}</VideoEditorContext.Provider>;
};

export const useVideoEditor = () => {
  const context = useContext(VideoEditorContext);
  if (context === undefined) {
    throw new Error('useVideoEditor must be used within a VideoEditorProvider');
  }
  return context;
};
