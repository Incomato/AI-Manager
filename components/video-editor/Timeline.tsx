import React, { useRef, useState, useEffect, useCallback } from 'react';

interface TimelineProps {
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({ duration, currentTime, trimStart, trimEnd, onTrimChange, onSeek }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);

  const pixelsToSeconds = useCallback((pixels: number) => {
    // FIX: Cast timelineRef.current to 'any' to access 'getBoundingClientRect' due to TS lib issue.
    if (!timelineRef.current || !duration) return 0;
    const rect = (timelineRef.current as any).getBoundingClientRect();
    return (pixels / rect.width) * duration;
  }, [duration]);
  
  const secondsToPercent = useCallback((seconds: number) => {
    if (!duration) return 0;
    return (seconds / duration) * 100;
  }, [duration]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // FIX: Cast timelineRef.current and event to 'any' to bypass TS lib issues.
    if (!draggingHandle || !timelineRef.current || !duration) return;

    const rect = (timelineRef.current as any).getBoundingClientRect();
    const pos = Math.max(0, Math.min((e as any).clientX - rect.left, rect.width));
    const newTime = pixelsToSeconds(pos);

    if (draggingHandle === 'start') {
        if (newTime < trimEnd) {
            onTrimChange(newTime, trimEnd);
        }
    } else { // 'end'
        if (newTime > trimStart) {
            onTrimChange(trimStart, newTime);
        }
    }
  }, [draggingHandle, timelineRef, duration, pixelsToSeconds, trimStart, trimEnd, onTrimChange]);

  const handleMouseUp = useCallback(() => {
    setDraggingHandle(null);
  }, []);

  useEffect(() => {
    if (draggingHandle) {
        // FIX: Cast 'window' to 'any' to bypass TS lib issue with event listeners.
        (window as any).addEventListener('mousemove', handleMouseMove);
        (window as any).addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        // FIX: Cast 'window' to 'any' to bypass TS lib issue with event listeners.
        (window as any).removeEventListener('mousemove', handleMouseMove);
        (window as any).removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHandle, handleMouseMove, handleMouseUp]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    // FIX: Cast timelineRef.current and event.target to 'any' to bypass TS lib issues.
    if (!timelineRef.current || !duration) return;
    // Prevent seek when dragging a handle
    if ((e.target as any).classList.contains('handle')) return;
    
    const rect = (timelineRef.current as any).getBoundingClientRect();
    const pos = e.clientX - rect.left;
    onSeek(pixelsToSeconds(pos));
  };
  
  if (duration === 0) {
      return null; // Don't render if there's no video loaded
  }

  const playheadPercent = secondsToPercent(currentTime);
  const startPercent = secondsToPercent(trimStart);
  const endPercent = secondsToPercent(trimEnd);
  const selectionWidthPercent = endPercent - startPercent;

  return (
    <div className="w-full py-4 px-2">
        <div ref={timelineRef} className="relative w-full h-3 bg-background/50 rounded-full cursor-pointer group" onClick={handleSeek}>
            {/* Full duration track */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-border rounded-full"></div>
            
            {/* Trim selection area */}
            <div 
                className="absolute top-0 h-full bg-primary/50 rounded-full"
                style={{ left: `${startPercent}%`, width: `${selectionWidthPercent}%` }}
            />

            {/* Playhead */}
            <div 
                className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-red-500 rounded-full pointer-events-none z-20"
                style={{ left: `${playheadPercent}%` }}
            />
            {/* Start Handle */}
            <div 
                className="handle absolute top-1/2 -translate-y-1/2 w-3 h-5 bg-primary rounded-l-md border-2 border-background cursor-ew-resize z-10"
                style={{ left: `${startPercent}%` }}
                onMouseDown={(e) => { e.stopPropagation(); setDraggingHandle('start'); }}
            />
            {/* End Handle */}
             <div 
                className="handle absolute top-1/2 -translate-y-1/2 -translate-x-full w-3 h-5 bg-primary rounded-r-md border-2 border-background cursor-ew-resize z-10"
                style={{ left: `${endPercent}%` }}
                onMouseDown={(e) => { e.stopPropagation(); setDraggingHandle('end'); }}
            />
        </div>
    </div>
  );
};

export default Timeline;