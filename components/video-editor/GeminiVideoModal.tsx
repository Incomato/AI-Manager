import React, { useState, useMemo } from 'react';
import { MediaFile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useMediaFiles } from '../../hooks/useDb';
import * as aiVideoService from '../../services/aiVideoService';
import * as db from '../../services/dbService';
import Spinner from '../Spinner';

interface GeminiVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newFile: MediaFile) => void;
}

const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

const GeminiVideoModal: React.FC<GeminiVideoModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { data: mediaFiles, loading: mediaLoading } = useMediaFiles(user?.id);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // New states for video parameters
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [duration, setDuration] = useState('');
  const [style, setStyle] = useState('');
  
  const videoAndImageFiles = useMemo(() => {
    return mediaFiles.filter(f => f.type === 'video' || f.type === 'image');
  }, [mediaFiles]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt || !selectedFileId) {
        setError("Please select a file and enter a prompt.");
        return;
    }
    const selectedFile = mediaFiles.find(f => f.id === selectedFileId);
    if (!selectedFile || !user) {
        setError("Could not find selected file or user.");
        return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationStatus("Initializing...");
    
    // Construct an enhanced prompt with the optional parameters
    let finalPrompt = prompt;
    if (aspectRatio) {
        finalPrompt += ` The video should be in a ${aspectRatio} aspect ratio.`;
    }
    if (duration) {
        finalPrompt += ` It should be approximately ${duration} seconds long.`;
    }
    if (style) {
        finalPrompt += ` The visual style should be: ${style}.`;
    }

    try {
        const generatedBlob = await aiVideoService.generateVideoWithGemini(finalPrompt, selectedFile, setGenerationStatus);
        
        setGenerationStatus("Saving new video to your library...");
        const dataUrl = await blobToBase64(generatedBlob);
        const newFile: Omit<MediaFile, 'id'> = {
            userId: user.id,
            name: `gemini-generated-${prompt.substring(0, 15)}.mp4`,
            type: 'video',
            mimeType: 'video/mp4',
            data: dataUrl,
            createdAt: new Date(),
            tags: ['gemini', 'ai-generated'],
        };
        const newId = await db.addMediaFile(newFile);
        const savedFile = await db.getMediaFile(newId);
        
        setGenerationStatus("Done!");
        if (savedFile) {
            onSuccess(savedFile);
        } else {
            throw new Error("Failed to retrieve the saved file from the database.");
        }

    } catch (e: any) {
        setError(e.message || "An unknown error occurred.");
        setGenerationStatus(`Error: ${e.message || "An unknown error occurred."}`);
        // Keep the modal open on error to show the message
        setIsGenerating(false);
        return; // Stop execution here
    }
    
    // This will only be reached on success now
    setIsGenerating(false);
  };

  return (
    <div
        className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="modal-title" className="text-lg font-bold text-text-primary">Create Video with Gemini AI</h3>
        
        {isGenerating ? (
            <div className="text-center p-8">
                <Spinner />
                <p className="mt-4 text-text-secondary">{generationStatus}</p>
            </div>
        ) : (
            <div className="space-y-4 mt-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">1. Select a source video or image</label>
                    {mediaLoading ? (
                        <p className="text-text-secondary">Loading media...</p>
                    ) : (
                        <div className="max-h-40 overflow-y-auto bg-background/50 p-2 rounded-md border border-border grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {videoAndImageFiles.map(file => (
                                <div 
                                    key={file.id} 
                                    className={`relative aspect-square rounded-md overflow-hidden cursor-pointer ${selectedFileId === file.id ? 'ring-4 ring-primary' : 'hover:ring-2 hover:ring-primary'}`}
                                    onClick={() => setSelectedFileId(file.id!)}
                                >
                                    <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">2. Describe the video you want to create</label>
                    <textarea
                        value={prompt}
                        // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                        onChange={(e) => setPrompt((e.target as any).value)}
                        rows={3}
                        className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary"
                        placeholder="e.g., A fast-paced, energetic trailer with cinematic shots"
                    />
                </div>

                <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-2">3. (Optional) Specify Video Parameters</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="aspect-ratio" className="block text-xs font-medium text-text-secondary mb-1">Aspect Ratio</label>
                            <select
                                id="aspect-ratio"
                                value={aspectRatio}
                                // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                                onChange={(e) => setAspectRatio((e.target as any).value)}
                                className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary text-sm"
                            >
                                <option value="9:16">9:16 (Vertical)</option>
                                <option value="16:9">16:9 (Widescreen)</option>
                                <option value="1:1">1:1 (Square)</option>
                                <option value="4:3">4:3 (Classic)</option>
                                <option value="3:4">3:4 (Portrait)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="duration" className="block text-xs font-medium text-text-secondary mb-1">Duration (seconds)</label>
                            <input
                                type="number"
                                id="duration"
                                value={duration}
                                // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                                onChange={(e) => setDuration((e.target as any).value)}
                                placeholder="e.g., 15"
                                className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary text-sm"
                            />
                        </div>
                         <div>
                            <label htmlFor="style" className="block text-xs font-medium text-text-secondary mb-1">Visual Style</label>
                            <input
                                type="text"
                                id="style"
                                value={style}
                                // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                                onChange={(e) => setStyle((e.target as any).value)}
                                placeholder="e.g., Cinematic, vintage film"
                                className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary text-sm"
                            />
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 bg-surface-light text-text-primary rounded-md hover:bg-border">Cancel</button>
                    <button onClick={handleGenerate} disabled={!selectedFileId || !prompt} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-900 disabled:cursor-not-allowed">Generate Video</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default GeminiVideoModal;