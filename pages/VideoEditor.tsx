import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MediaFile, Page, RenderQuality, RenderResolution } from '../types';
import * as videoService from '../services/videoService';
import * as db from '../services/dbService';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';
import GeminiVideoModal from '../components/video-editor/GeminiVideoModal';
import Timeline from '../components/video-editor/Timeline';
import CollapsibleSection from '../components/video-editor/CollapsibleSection';
import { useVideoEditor } from '../contexts/VideoEditorContext';
import MultiClipTimeline from '../components/video-editor/MultiClipTimeline';
import { SavingSpinner } from '../components/icons/SavingSpinner';
import { CheckIcon } from '../components/icons/CheckIcon';

interface VideoEditorProps {
    setCurrentPage: (page: Page) => void;
}

const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

type ClipWithDuration = {
    file: MediaFile;
    duration: number;
}

const SESSION_KEY = 'video-editor-session';
const AUTOSAVE_DEBOUNCE = 3000; // 3 seconds

const VideoEditor: React.FC<VideoEditorProps> = ({ setCurrentPage }) => {
    const { user } = useAuth();
    const { timelineClips, setTimelineClips } = useVideoEditor();

    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    
    // Timeline and playback state
    const [clipsWithDuration, setClipsWithDuration] = useState<ClipWithDuration[]>([]);
    const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);
    const [currentPlayingIndex, setCurrentPlayingIndex] = useState(0);

    // Trim state for the selected clip
    const [trimStart, setTrimStart] = useState('0');
    const [trimEnd, setTrimEnd] = useState('0');
    const [currentClipTime, setCurrentClipTime] = useState(0);

    // Filter states
    const [brightness, setBrightness] = useState(0);
    const [contrast, setContrast] = useState(1);
    const [blur, setBlur] = useState(0);
    
    // Export state
    const [exportResolution, setExportResolution] = useState<'720p' | '1080p'>('1080p');
    const [renderResolution, setRenderResolution] = useState<RenderResolution>('1080x1920');
    const [renderQuality, setRenderQuality] = useState<RenderQuality>('Medium');
    
    // Auto-save state
    const [sessionLoaded, setSessionLoaded] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    // FIX: Initialize useRef with null to provide an argument, resolving an issue with older React type definitions that may not support the no-argument overload.
    const saveStatusTimeoutRef = useRef<number | null>(null);

    const selectedClip = selectedClipIndex !== null ? clipsWithDuration[selectedClipIndex]?.file : null;

    // Load FFmpeg on component mount
    useEffect(() => {
        const loadFFmpeg = async () => {
            try {
                if (!videoService.isLoaded()) {
                    await videoService.init(log => console.log(log));
                }
                setFfmpegLoaded(true);
            } catch (error) {
                console.error("Failed to load FFmpeg", error);
                setProcessingMessage("Error: Could not load video processing engine.");
            } finally {
                setIsLoading(false);
            }
        };
        loadFFmpeg();
    }, []);
    
    // Restore session on mount
    useEffect(() => {
        const loadSession = async () => {
            try {
                // FIX: Provide the session key to 'getItem' to retrieve the correct data.
                const savedSessionJSON = (window as any).localStorage.getItem(SESSION_KEY);
                if (savedSessionJSON) {
                    setProcessingMessage('Restoring previous session...');
                    const savedSession = JSON.parse(savedSessionJSON);
                    
                    if (savedSession.timelineClipIds && Array.isArray(savedSession.timelineClipIds) && savedSession.timelineClipIds.length > 0) {
                        const clips = await Promise.all(
                            savedSession.timelineClipIds.map((id: number) => db.getMediaFile(id))
                        );
                        const validClips = clips.filter((clip): clip is MediaFile => clip != null);
                        if (validClips.length > 0) {
                            setTimelineClips(validClips);
                        }
                    }

                    if (savedSession.renderResolution) setRenderResolution(savedSession.renderResolution);
                    if (savedSession.renderQuality) setRenderQuality(savedSession.renderQuality);

                    setProcessingMessage('Session restored.');
                    setTimeout(() => setProcessingMessage(''), 2000);
                }
            } catch (error) {
                console.error("Failed to load video editor session:", error);
                (window as any).localStorage.removeItem(SESSION_KEY); // Clear corrupted data
            } finally {
                setSessionLoaded(true);
            }
        };

        loadSession();

        // Cleanup timeout on unmount
        return () => {
            if (saveStatusTimeoutRef.current) {
                clearTimeout(saveStatusTimeoutRef.current);
            }
        };
    }, [setTimelineClips]); // Run only on component mount

    // Auto-save session on changes (debounced)
    useEffect(() => {
        if (!sessionLoaded) {
            return;
        }
        
        setSaveStatus('saving');
        if (saveStatusTimeoutRef.current) {
            clearTimeout(saveStatusTimeoutRef.current);
        }

        const saveHandler = setTimeout(() => {
            try {
                const sessionData = {
                    timelineClipIds: timelineClips.map(clip => clip.id).filter((id): id is number => id != null),
                    renderResolution,
                    renderQuality,
                };
                (window as any).localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
                setSaveStatus('saved');
                
                // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'setTimeout'.
                saveStatusTimeoutRef.current = (window as any).setTimeout(() => {
                    setSaveStatus('idle');
                }, 2000);

            } catch (error) {
                console.error("Failed to auto-save video editor session:", error);
                setSaveStatus('idle'); // Could be an error state
            }
        }, AUTOSAVE_DEBOUNCE);

        return () => {
            clearTimeout(saveHandler);
        };
    }, [timelineClips, renderResolution, renderQuality, sessionLoaded]);


    // Effect to calculate durations when timeline clips change
    useEffect(() => {
        const getDurations = async () => {
            const clipsData = await Promise.all(
                timelineClips.map(file => 
                    new Promise<ClipWithDuration>(resolve => {
                        // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'document'.
                        const video = (window as any).document.createElement('video');
                        video.preload = 'metadata';
                        video.src = file.data;
                        video.onloadedmetadata = () => resolve({ file, duration: video.duration });
                        video.onerror = () => resolve({ file, duration: 0 });
                    })
                )
            );
            setClipsWithDuration(clipsData);
            if (selectedClipIndex === null && clipsData.length > 0) {
                setSelectedClipIndex(0);
            } else if (selectedClipIndex !== null && selectedClipIndex >= clipsData.length) {
                setSelectedClipIndex(clipsData.length - 1);
            }
        };
        getDurations();
    }, [timelineClips]);
    
    // Update controls when a new clip is selected
    useEffect(() => {
        if (selectedClip) {
            const duration = clipsWithDuration[selectedClipIndex!]?.duration || 0;
            setTrimStart('0');
            setTrimEnd(String(duration));
            setCurrentClipTime(0);
        } else {
            setTrimStart('0');
            setTrimEnd('0');
            setCurrentClipTime(0);
        }
    }, [selectedClip, selectedClipIndex, clipsWithDuration]);

    const handleFileSelect = () => {
        setCurrentPage(Page.MediaLibrary);
    };

    const saveClipToLibrary = async (blob: Blob, baseName: string, suffix: string): Promise<MediaFile | null> => {
        if (!user) return null;
        setProcessingMessage(`Saving "${baseName}-${suffix}" to Media Library...`);
        try {
            const dataUrl = await blobToBase64(blob);
            const newFile: Omit<MediaFile, 'id'> = {
                userId: user.id,
                name: `${baseName.replace(/\.[^/.]+$/, "")}-${suffix}.mp4`,
                type: 'video',
                mimeType: 'video/mp4',
                data: dataUrl,
                createdAt: new Date(),
                tags: ['edited', suffix.split('-')[0]],
            };
            const newId = await db.addMediaFile(newFile);
            const savedFile = await db.getMediaFile(newId);
            return savedFile || null;
        } catch (error) {
            console.error("Failed to save new clip:", error);
            setProcessingMessage('Error: Failed to save the clip.');
            setTimeout(() => setIsProcessing(false), 3000);
            return null;
        }
    };
    
    const handleTrim = async () => {
        if (!selectedClip || !user) return;
        const start = parseFloat(trimStart);
        const end = parseFloat(trimEnd);
        if (isNaN(start) || isNaN(end) || start >= end) {
            setProcessingMessage("Invalid start/end time for trimming.");
            return;
        }
        setIsProcessing(true);
        setProcessingMessage('Trimming video...');
        try {
            const trimmedBlob = await videoService.trimVideo(selectedClip, start, end, (progress) => {
                setProcessingMessage(`Processing: ${progress}%`);
            });
            const savedFile = await saveClipToLibrary(trimmedBlob, selectedClip.name, 'trimmed');
            if (savedFile) {
                setTimelineClips(currentClips => currentClips.map((clip, index) => index === selectedClipIndex ? savedFile : clip));
                setProcessingMessage('Successfully saved trimmed clip!');
            }
        } catch (error) {
            console.error("Trimming failed", error);
            setProcessingMessage('Error: Trimming failed.');
        } finally {
            setTimeout(() => setIsProcessing(false), 2000);
        }
    };

    const handleApplyFilter = async (filter: videoService.VideoFilter) => {
        if (!selectedClip || !user) return;
        
        setIsProcessing(true);
        setProcessingMessage(`Applying ${filter.name} filter...`);

        try {
            const filteredBlob = await videoService.applyVideoFilter(selectedClip, filter, (progress) => {
                setProcessingMessage(`Applying ${filter.name}: ${progress}%`);
            });
            const savedFile = await saveClipToLibrary(filteredBlob, selectedClip.name, filter.name);
            if (savedFile) {
                setTimelineClips(currentClips => currentClips.map((clip, index) => index === selectedClipIndex ? savedFile : clip));
                setProcessingMessage(`Successfully applied ${filter.name} filter!`);
            }
        } catch (error) {
             console.error("Filter application failed", error);
            setProcessingMessage('Error: Applying filter failed.');
        } finally {
            setTimeout(() => setIsProcessing(false), 2000);
        }
    };

    const handleGeminiSuccess = (newVideo: MediaFile) => {
        setTimelineClips(prev => [...prev, newVideo]);
        setIsGeminiModalOpen(false);
    };
    
    const handleTrimChange = (start: number, end: number) => {
        setTrimStart(start.toFixed(3));
        setTrimEnd(end.toFixed(3));
    };

    const handleSeek = (time: number) => {
        // FIX: Cast videoRef.current to 'any' to access 'currentTime' property due to TS lib issue.
        if (videoRef.current) {
            (videoRef.current as any).currentTime = time;
        }
    };
    
    const handleRender = async () => {
        if (timelineClips.length === 0 || !user) return;

        setIsProcessing(true);
        setProcessingMessage('Rendering timeline...');
        
        try {
            const resultBlob = await videoService.renderTimeline(
                timelineClips,
                renderResolution,
                renderQuality,
                (progress) => {
                    setProcessingMessage(`Rendering: ${progress}% done`);
                }
            );

            const baseName = "timeline-render";
            const suffix = `${renderResolution}-${renderQuality.toLowerCase()}`;
            await saveClipToLibrary(resultBlob, baseName, suffix);
            setProcessingMessage(`Successfully rendered and saved timeline!`);
        } catch (error) {
            console.error(`Rendering failed`, error);
            setProcessingMessage(`Error: Rendering failed.`);
        } finally {
            setTimeout(() => setIsProcessing(false), 2000);
        }
    };

    const handleExportClip = async () => {
        if (!selectedClip || !user) return;
        setIsProcessing(true);
        setProcessingMessage('Exporting clip...');
        try {
             const resultBlob = await videoService.exportVideo(selectedClip!, exportResolution, (progress) => {
                setProcessingMessage(`Exporting ${exportResolution}: ${progress}%`);
             });
             const baseName = selectedClip!.name;
             const suffix = `export-${exportResolution}`;
             await saveClipToLibrary(resultBlob, baseName, suffix);
             setProcessingMessage(`Successfully exported and saved clip!`);
        } catch (error) {
            console.error(`Export failed`, error);
            setProcessingMessage(`Error: Export failed.`);
        } finally {
            setTimeout(() => setIsProcessing(false), 2000);
        }
    };
    
    const handleResetTrim = () => {
        const duration = clipsWithDuration[selectedClipIndex!]?.duration || 0;
        setTrimStart('0');
        setTrimEnd(String(duration));
    };

    const handleClipReorder = (fromIndex: number, toIndex: number) => {
        const reordered = [...timelineClips];
        const [movedItem] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, movedItem);
        setTimelineClips(reordered);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Video Editor</h2>
            
            {isLoading && (
                <div className="flex justify-center items-center py-20">
                    <Spinner />
                    <span className="ml-4 text-text-secondary">Loading Video Engine...</span>
                </div>
            )}

            {!isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Toolbar */}
                    <div className="lg:col-span-1 bg-surface p-4 rounded-lg flex flex-col gap-4 self-start">
                        <div className="flex justify-between items-center border-b border-border pb-2">
                            <h3 className="text-xl font-semibold">Tools</h3>
                            <div className="flex items-center gap-2 text-xs text-text-secondary transition-opacity">
                                {saveStatus === 'saving' && <><SavingSpinner /><span>Saving...</span></>}
                                {saveStatus === 'saved' && <><CheckIcon className="h-4 w-4 text-green-400" /><span>Saved</span></>}
                            </div>
                        </div>
                         <button 
                            onClick={() => setIsGeminiModalOpen(true)}
                            disabled={!user || isProcessing}
                            title={!user ? "Please sign in to use Gemini AI" : ""}
                            className="w-full py-2 px-4 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 disabled:bg-purple-900 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                        >
                            Create with Gemini AI
                        </button>
                        <button 
                            onClick={handleFileSelect}
                            className="w-full py-2 px-4 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover disabled:bg-indigo-900 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                        >
                           Add Clips to Timeline
                        </button>
                        <div className="h-px bg-border"></div>
                        <p className="text-xs text-text-secondary">Drag and drop clips on the timeline to reorder them.</p>
                    </div>

                    {/* Main Area (Preview & Properties) */}
                    <div className="lg:col-span-3 space-y-6">
                       {/* Preview */}
                        <div className="bg-surface p-4 rounded-lg">
                            <h3 className="text-xl font-semibold mb-2">Preview</h3>
                            <div className="aspect-video bg-black rounded-md flex items-center justify-center">
                               {isProcessing ? (
                                    <div className="text-center">
                                        <Spinner />
                                        <p className="mt-4 text-text-secondary">{processingMessage}</p>
                                    </div>
                                ) : timelineClips.length > 0 ? (
                                    <video 
                                        ref={videoRef} 
                                        key={timelineClips[currentPlayingIndex]?.id} 
                                        src={timelineClips[currentPlayingIndex]?.data} 
                                        className="w-full h-full object-contain" controls 
                                        onEnded={() => {
                                            if (currentPlayingIndex < timelineClips.length - 1) {
                                                setCurrentPlayingIndex(prev => prev + 1);
                                            }
                                        }}
                                        onTimeUpdate={e => {
                                            if (currentPlayingIndex === selectedClipIndex) {
                                                // FIX: Cast e.currentTarget to 'any' to access 'currentTime' property due to TS lib issue.
                                                setCurrentClipTime((e.currentTarget as any).currentTime)
                                            }
                                        }}
                                        onPlay={() => { if(videoRef.current && currentPlayingIndex !== selectedClipIndex) setSelectedClipIndex(currentPlayingIndex)}}
                                     />
                                ) : (
                                    <p className="text-text-secondary">Add clips to the timeline to start editing</p>
                                )}
                            </div>
                            {timelineClips.length > 0 && (
                                <MultiClipTimeline
                                    clips={clipsWithDuration}
                                    onReorder={handleClipReorder}
                                    selectedClipIndex={selectedClipIndex}
                                    onSelectClip={setSelectedClipIndex}
                                />
                            )}
                        </div>

                        {/* Properties Panel */}
                        <div className="bg-surface p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">Properties</h3>
                                {selectedClip && <span className="text-sm bg-surface-light text-primary px-2 py-1 rounded-md truncate max-w-xs">{selectedClip.name}</span>}
                            </div>
                            {!selectedClip ? (
                                <p className="text-text-secondary text-sm">{timelineClips.length > 0 ? "Select a clip on the timeline to edit its properties." : "Add clips to the timeline to see properties here."}</p>
                            ) : (
                                <div className="space-y-4">
                                    <CollapsibleSection title="Clip Actions" defaultOpen={true}>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-sm font-medium text-text-secondary">Start Time (sec)</label>
                                                        {/* FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue. */}
                                                        <input type="number" step="0.01" value={trimStart} onChange={e => setTrimStart((e.target as any).value)} className="w-24 bg-surface-light rounded p-1 text-sm text-right" />
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-sm font-medium text-text-secondary">End Time (sec)</label>
                                                        {/* FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue. */}
                                                        <input type="number" step="0.01" value={trimEnd} onChange={e => setTrimEnd((e.target as any).value)} className="w-24 bg-surface-light rounded p-1 text-sm text-right" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2 flex flex-col justify-end">
                                                    <button onClick={handleResetTrim} disabled={isProcessing} className="px-4 py-2 bg-surface-light text-text-primary text-sm font-semibold rounded hover:bg-border disabled:bg-gray-700">Reset Trim</button>
                                                    <button onClick={handleTrim} disabled={isProcessing || !user} title={!user ? "Sign in to save changes" : ""} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 disabled:bg-green-900">Apply Trim to Clip</button>
                                                </div>
                                            </div>
                                            <Timeline 
                                                duration={clipsWithDuration[selectedClipIndex!]?.duration || 0}
                                                currentTime={currentClipTime}
                                                trimStart={parseFloat(trimStart)}
                                                trimEnd={parseFloat(trimEnd)}
                                                onTrimChange={handleTrimChange}
                                                onSeek={handleSeek}
                                            />
                                        </div>
                                    </CollapsibleSection>

                                    <CollapsibleSection title="Filters">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm font-medium text-text-secondary"><span>Brightness</span><span>{brightness.toFixed(1)}</span></div>
                                                {/* FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue. */}
                                                <input type="range" min="-1" max="1" step="0.1" value={brightness} onChange={e => setBrightness(parseFloat((e.target as any).value))} className="w-full h-2 bg-surface-light rounded-lg appearance-none cursor-pointer" />
                                                <button onClick={() => handleApplyFilter({ name: 'brightness', value: brightness })} disabled={isProcessing || !user} title={!user ? "Sign in to save changes" : ""} className="w-full px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover disabled:bg-indigo-900">Apply Brightness</button>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm font-medium text-text-secondary"><span>Contrast</span><span>{contrast.toFixed(1)}</span></div>
                                                {/* FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue. */}
                                                <input type="range" min="-2" max="2" step="0.1" value={contrast} onChange={e => setContrast(parseFloat((e.target as any).value))} className="w-full h-2 bg-surface-light rounded-lg appearance-none cursor-pointer" />
                                                 <button onClick={() => handleApplyFilter({ name: 'contrast', value: contrast })} disabled={isProcessing || !user} title={!user ? "Sign in to save changes" : ""} className="w-full px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover disabled:bg-indigo-900">Apply Contrast</button>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm font-medium text-text-secondary"><span>Blur</span><span>{blur}</span></div>
                                                {/* FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue. */}
                                                <input type="range" min="0" max="20" step="1" value={blur} onChange={e => setBlur(parseInt((e.target as any).value))} className="w-full h-2 bg-surface-light rounded-lg appearance-none cursor-pointer" />
                                                <button onClick={() => handleApplyFilter({ name: 'blur', value: blur })} disabled={isProcessing || !user} title={!user ? "Sign in to save changes" : ""} className="w-full px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover disabled:bg-indigo-900">Apply Blur</button>
                                            </div>
                                        </div>
                                         <div className="h-px bg-border my-4"></div>
                                        <div className="flex flex-wrap gap-2">
                                             <button onClick={() => handleApplyFilter({name: 'sepia'})} disabled={isProcessing || !user} title={!user ? "Sign in to save changes" : ""} className="flex-1 px-3 py-1 text-sm bg-surface-light text-text-primary rounded hover:bg-border disabled:bg-gray-700">Sepia</button>
                                             <button onClick={() => handleApplyFilter({name: 'grayscale'})} disabled={isProcessing || !user} title={!user ? "Sign in to save changes" : ""} className="flex-1 px-3 py-1 text-sm bg-surface-light text-text-primary rounded hover:bg-border disabled:bg-gray-700">B&W</button>
                                             <button onClick={() => handleApplyFilter({name: 'sharpen'})} disabled={isProcessing || !user} title={!user ? "Sign in to save changes" : ""} className="flex-1 px-3 py-1 text-sm bg-surface-light text-text-primary rounded hover:bg-border disabled:bg-gray-700">Sharpen</button>
                                        </div>
                                    </CollapsibleSection>

                                    <CollapsibleSection title="Render & Export">
                                        <div className="space-y-4 p-4 border border-border rounded-md">
                                            <h4 className="font-semibold text-lg text-text-primary">Render Full Timeline</h4>
                                            <p className="text-xs text-text-secondary">Combine all clips on the timeline into a single new video file.</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="render-resolution" className="block text-sm font-medium text-text-secondary mb-1">Resolution</label>
                                                    <select
                                                        id="render-resolution"
                                                        value={renderResolution}
                                                        // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                                                        onChange={(e) => setRenderResolution((e.target as any).value as RenderResolution)}
                                                        className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary"
                                                    >
                                                        <option value="1080x1920">1080p Vertical (1080x1920)</option>
                                                        <option value="720x1280">720p Vertical (720x1280)</option>
                                                        <option value="1920x1080">1080p Horizontal (1920x1080)</option>
                                                        <option value="1280x720">720p Horizontal (1280x720)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor="render-quality" className="block text-sm font-medium text-text-secondary mb-1">Quality</label>
                                                    <select
                                                        id="render-quality"
                                                        value={renderQuality}
                                                        // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                                                        onChange={(e) => setRenderQuality((e.target as any).value as RenderQuality)}
                                                        className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary"
                                                    >
                                                        <option value="High">High (Best quality, largest size)</option>
                                                        <option value="Medium">Medium (Good balance)</option>
                                                        <option value="Low">Low (Fastest, smallest size)</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handleRender} 
                                                disabled={isProcessing || timelineClips.length < 1 || !user}
                                                title={!user ? "Sign in to render the timeline" : ""}
                                                className="w-full px-6 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 disabled:bg-green-900"
                                            >
                                                Render Timeline
                                            </button>
                                        </div>

                                        <div className="space-y-4 mt-4 p-4 border border-border rounded-md">
                                            <h4 className="font-semibold text-lg text-text-primary">Export Selected Clip</h4>
                                            <p className="text-xs text-text-secondary">Export just the currently selected clip to a new file with a different resolution.</p>
                                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                                <div className="w-full sm:w-auto flex-grow">
                                                    <label htmlFor="resolution" className="block text-sm font-medium text-text-secondary mb-1">Resolution</label>
                                                    <select
                                                        id="resolution"
                                                        value={exportResolution}
                                                        // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                                                        onChange={(e) => setExportResolution((e.target as any).value as '720p' | '1080p')}
                                                        className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary"
                                                        disabled={!selectedClip}
                                                    >
                                                        <option value="1080p">1080p (Full HD)</option>
                                                        <option value="720p">720p (HD)</option>
                                                    </select>
                                                </div>
                                                <button 
                                                    onClick={handleExportClip}
                                                    disabled={isProcessing || !selectedClip || !user}
                                                    title={!user ? "Sign in to export clips" : ""}
                                                    className="w-full sm:w-auto self-end px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:bg-blue-900"
                                                >
                                                    Export Selected Clip
                                                </button>
                                            </div>
                                        </div>
                                    </CollapsibleSection>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {isGeminiModalOpen && (
                 <GeminiVideoModal
                    isOpen={isGeminiModalOpen}
                    onClose={() => setIsGeminiModalOpen(false)}
                    onSuccess={handleGeminiSuccess}
                 />
            )}
        </div>
    );
};

export default VideoEditor;
