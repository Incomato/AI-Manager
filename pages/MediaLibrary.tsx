import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useMediaFiles } from '../hooks/useDb';
import * as db from '../services/dbService';
import { MediaFile, Page } from '../types';
import MediaGrid from '../components/MediaGrid';
import { UploadIcon } from '../components/icons/UploadIcon';
import { SearchIcon } from '../components/icons/SearchIcon';
import { TagIcon } from '../components/icons/TagIcon';
import { useAuth } from '../contexts/AuthContext';
import MediaPreviewModal from '../components/MediaPreviewModal';
import UploadProgressItem from '../components/UploadProgressItem';
import Spinner from '../components/Spinner';
import { useVideoEditor } from '../contexts/VideoEditorContext';
import { PlusIcon } from '../components/icons/PlusIcon';
import { FolderOpenIcon } from '../components/icons/FolderOpenIcon';
import { RefreshIcon } from '../components/icons/RefreshIcon';

type UploadStatus = {
  id: string;
  name: string;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  dbId?: number;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

interface MediaLibraryProps {
    selectedFile: MediaFile | null;
    setSelectedFile: (file: MediaFile) => void;
    setCurrentPage: (page: Page) => void;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({ selectedFile, setSelectedFile, setCurrentPage }) => {
  const { user } = useAuth();
  const { data: mediaFiles, refresh: refreshMediaFiles } = useMediaFiles(user?.id);
  const { addClipsToTimeline } = useVideoEditor();
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  
  const [selectedUploads, setSelectedUploads] = useState<Set<number>>(new Set());
  const [bulkTags, setBulkTags] = useState('');
  const [isBulkTagging, setIsBulkTagging] = useState(false);
  const [bulkTagError, setBulkTagError] = useState<string|null>(null);
  
  // State for multi-clip selection
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIdsForTimeline, setSelectedIdsForTimeline] = useState<Set<number>>(new Set());

  // State for local file browsing
  const [localPaths, setLocalPaths] = useState({
    video: '',
    audio: '',
    image: '',
  });
  const [localFiles, setLocalFiles] = useState<MediaFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  
  // Load local paths from localStorage on mount
  useEffect(() => {
    try {
        const paths = {
            video: (window as any).localStorage.getItem('local-video-path') || '',
            audio: (window as any).localStorage.getItem('local-audio-path') || '',
            image: (window as any).localStorage.getItem('local-image-path') || '',
        };
        setLocalPaths(paths);
    } catch (e) {
        console.warn("Could not access localStorage for local paths.");
    }
  }, []);


  const isGuest = !user;

  const uploadFiles = async (files: FileList) => {
    if (!files || !user) return;

    const newUploads: UploadStatus[] = Array.from(files).map(file => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      name: file.name,
      status: 'uploading',
    }));
    
    setUploadingFiles(prev => [...newUploads, ...prev]);
    setSelectedUploads(new Set()); // Clear previous selections on new upload

    let successfulUploads = false;

    for (const file of Array.from(files)) {
      const tempId = `${file.name}-${file.lastModified}-${file.size}`;
      try {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) {
          throw new Error('Unsupported file type.');
        }

        const base64Data = await fileToBase64(file);
        const newMediaFile: Omit<MediaFile, 'id'> = {
          userId: user.id,
          name: file.name,
          type: isImage ? 'image' : 'video',
          mimeType: file.type,
          data: `data:${file.type};base64,${base64Data}`,
          createdAt: new Date(),
          tags: [], 
        };
        const newId = await db.addMediaFile(newMediaFile);
        successfulUploads = true;

        setUploadingFiles(prev =>
          prev.map(uf => uf.id === tempId ? { ...uf, status: 'completed', dbId: newId } : uf)
        );
      } catch (error: any) {
        setUploadingFiles(prev =>
          prev.map(uf =>
            uf.id === tempId
              ? { ...uf, status: 'error', error: error.message || 'Upload failed' }
              : uf
          )
        );
      }
    }
    
    if (successfulUploads) {
        refreshMediaFiles();
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // FIX: Cast event.target to 'any' to access its 'files' and 'value' properties due to TS lib issue.
    const target = event.target as any;
    if (target.files) {
        uploadFiles(target.files);
        // Reset the input value to allow re-uploading the same file
        target.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    // Fix: Cast e.dataTransfer to 'any' to bypass TypeScript lib issue with 'files' and 'clearData'.
    const dataTransfer = e.dataTransfer as any;
    if (dataTransfer.files && dataTransfer.files.length > 0 && !isGuest) {
      uploadFiles(dataTransfer.files);
      dataTransfer.clearData();
    }
  };
  
  const handleFileClick = async (file: MediaFile) => {
    if (isMultiSelectMode) {
      if (file.type === 'video') {
         setSelectedIdsForTimeline(prev => {
           const newSet = new Set(prev);
           if (newSet.has(file.id!)) {
             newSet.delete(file.id!);
           } else {
             newSet.add(file.id!);
           }
           return newSet;
         });
      }
    } else {
      if (file.isLocal && file.filePath && !file.data) {
        if ((window as any).electronAPI) {
            const dataUrl = await (window as any).electronAPI.readFileAsDataURL(file.filePath);
            setPreviewFile({ ...file, data: dataUrl || '' });
        }
      } else {
        setPreviewFile(file);
      }
    }
  };

  const handleConfirmSelection = () => {
    if (previewFile) {
        setSelectedFile(previewFile);
        setCurrentPage(Page.Dashboard);
    }
    setPreviewFile(null);
  };

  const handleUpdateTags = async (file: MediaFile, newTags: string[]) => {
      if (!user) return;
      const updatedFile: MediaFile = { ...file, tags: newTags };
      try {
          await db.updateMediaFile(updatedFile, user.id);
          refreshMediaFiles();
          // Also update the file in the preview modal if it's open
          if (previewFile && previewFile.id === file.id) {
              setPreviewFile(updatedFile);
          }
      } catch (error) {
          console.error("Failed to update tags:", error);
          // Here you might want to show a toast notification to the user
      }
  };

  const combinedMediaFiles = useMemo(() => {
    const dbFileNames = new Set(mediaFiles.map(f => f.name));
    const uniqueLocalFiles = localFiles.filter(lf => !dbFileNames.has(lf.name));
    
    return [...mediaFiles, ...uniqueLocalFiles].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [mediaFiles, localFiles]);


  const filteredMediaFiles = useMemo(() => {
    return combinedMediaFiles
      .filter(file => {
        if (mediaTypeFilter === 'all') return true;
        return file.type === mediaTypeFilter;
      })
      .filter(file => {
        return file.name.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .filter(file => {
          if (!tagFilter.trim()) return true;
          return file.tags.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase().trim()));
      });
  }, [combinedMediaFiles, searchTerm, mediaTypeFilter, tagFilter]);

  const isFiltered = searchTerm.trim() !== '' || mediaTypeFilter !== 'all' || tagFilter.trim() !== '';

  const handleClearCompleted = () => {
    setUploadingFiles(prev => prev.filter(f => f.status === 'uploading'));
    setSelectedUploads(new Set()); // Clear selection as well
  };

  // Fix: Declare 'hasCompletedOrErroredUploads' with 'const' to resolve the 'Cannot find name' error.
  const hasCompletedOrErroredUploads = useMemo(() =>
    uploadingFiles.some(f => f.status === 'completed' || f.status === 'error'),
    [uploadingFiles]
  );
  
  const hasSuccessfulUploads = useMemo(() => 
    uploadingFiles.some(f => f.status === 'completed'),
    [uploadingFiles]
  );

  const handleToggleUploadSelection = (dbId: number) => {
      setSelectedUploads(prev => {
          const newSet = new Set(prev);
          if (newSet.has(dbId)) {
              newSet.delete(dbId);
          } else {
              newSet.add(dbId);
          }
          return newSet;
      });
  };

  const handleSelectAllSuccessful = () => {
      const successfulIds = uploadingFiles
          .filter(f => f.status === 'completed' && f.dbId)
          .map(f => f.dbId!);
      setSelectedUploads(new Set(successfulIds));
  };
  
  const handleApplyBulkTags = async () => {
    if (!user || !bulkTags.trim() || selectedUploads.size === 0) return;
    setIsBulkTagging(true);
    setBulkTagError(null);
    const tagsToAdd = bulkTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    
    try {
        // Fix: Explicitly type 'id' as number to resolve TypeScript inference issue with Set iteration.
        const updates = Array.from(selectedUploads).map(async (id: number) => {
            const file = await db.getMediaFile(id);
            if (file && file.userId === user.id) {
                const existingTags = new Set(file.tags || []);
                tagsToAdd.forEach(tag => existingTags.add(tag));
                const updatedFile: MediaFile = { ...file, tags: Array.from(existingTags) };
                await db.updateMediaFile(updatedFile, user.id);
            }
        });
        await Promise.all(updates);
        
        refreshMediaFiles();
        setSelectedUploads(new Set());
        setBulkTags('');
    } catch (error) {
        console.error("Bulk tag update failed:", error);
        setBulkTagError("Failed to apply tags. Please try again.");
    } finally {
        setIsBulkTagging(false);
    }
  };
  
  const handleAddClipsToTimeline = () => {
    const clipsToAdd = mediaFiles.filter(f => selectedIdsForTimeline.has(f.id!));
    addClipsToTimeline(clipsToAdd);
    setSelectedIdsForTimeline(new Set());
    setIsMultiSelectMode(false);
    setCurrentPage(Page.VideoEditor);
  };

  const handleSetPath = async (type: 'video' | 'audio' | 'image') => {
    if (!(window as any).electronAPI) {
        // FIX: Cast 'window' to 'any' to access 'alert' and prevent TypeScript lib issue.
        (window as any).alert("This feature is only available in the desktop app.");
        return;
    }
    const path = await (window as any).electronAPI.selectDirectory();
    if (path) {
        const newPaths = { ...localPaths, [type]: path };
        setLocalPaths(newPaths);
        try {
            (window as any).localStorage.setItem(`local-${type}-path`, path);
        } catch(e) {
            console.warn("Could not save path to localStorage");
        }
    }
  };

  const handleScanPath = async (type: 'video' | 'audio' | 'image') => {
    const path = localPaths[type];
    if (!path || !(window as any).electronAPI) return;

    setIsScanning(true);
    try {
        const filePaths: string[] = await (window as any).electronAPI.scanDirectory(path, type);
        const otherLocalFiles = localFiles.filter(f => f.type !== type);
        const newLocalFiles: MediaFile[] = filePaths.map(filePath => ({
            userId: user?.id || 'local-user',
            name: filePath.split(/[\\/]/).pop()!,
            type: type,
            mimeType: '', 
            data: '', // Will be loaded on demand
            createdAt: new Date(), 
            tags: ['local'],
            isLocal: true,
            filePath: filePath,
        }));
        setLocalFiles([...otherLocalFiles, ...newLocalFiles]);
    } catch (error) {
        console.error("Failed to scan path:", error);
    } finally {
        setIsScanning(false);
    }
  };

  return (
    <>
      <div 
        className="relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && !isGuest && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20 border-4 border-dashed border-primary rounded-lg pointer-events-none">
            <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">Drop files to upload</p>
                <p className="text-text-secondary mt-2">Images and videos are supported</p>
            </div>
          </div>
        )}
        <div className="space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Media Library</h2>
                <div className="flex items-center gap-4">
                     <button
                        onClick={() => {
                            setIsMultiSelectMode(!isMultiSelectMode);
                            setSelectedIdsForTimeline(new Set());
                        }}
                        disabled={isGuest}
                        title={isGuest ? "Sign in to use the video editor" : "Select multiple videos for the editor"}
                        className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors ${isMultiSelectMode ? 'bg-primary text-white' : 'bg-surface-light text-text-primary hover:bg-border'} ${isGuest ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                        Multi-Select
                    </button>
                    <label 
                      className={`cursor-pointer px-4 py-2 bg-primary text-white rounded-md flex items-center gap-2 transition-colors ${isGuest ? 'bg-gray-500 cursor-not-allowed' : 'hover:bg-primary-hover'}`}
                      title={isGuest ? "Please sign in to upload media" : "Upload new media"}
                    >
                      <UploadIcon />
                      Upload Media
                      <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} disabled={isGuest} />
                    </label>
                </div>
            </div>

            {uploadingFiles.length > 0 && (
                <div className="bg-surface p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">Uploads</h3>
                        {hasCompletedOrErroredUploads && (
                            <button 
                                onClick={handleClearCompleted} 
                                className="text-sm text-primary hover:text-indigo-300 transition-colors"
                            >
                                Clear Completed
                            </button>
                        )}
                    </div>

                    {hasSuccessfulUploads && (
                        <div className="flex justify-end items-center gap-4 text-sm font-medium">
                            <button onClick={handleSelectAllSuccessful} className="text-primary hover:text-indigo-300">Select All Successful</button>
                            <button onClick={() => setSelectedUploads(new Set())} className="text-text-secondary hover:text-text-primary">Deselect All</button>
                        </div>
                    )}
                    
                    {selectedUploads.size > 0 && (
                        <div className="p-3 bg-background/50 rounded-md space-y-2 border border-border">
                           <h4 className="font-semibold text-text-primary">Bulk Tagging ({selectedUploads.size} selected)</h4>
                            <div className="flex flex-col sm:flex-row gap-2">
                               <input 
                                   type="text" 
                                   value={bulkTags} 
                                   // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                                   onChange={e => setBulkTags((e.target as any).value)} 
                                   placeholder="Add comma-separated tags..."
                                   className="flex-grow w-full bg-surface-light border-border rounded-md text-text-primary px-3 py-2 text-sm focus:ring-primary focus:border-primary"
                                />
                               <button 
                                   onClick={handleApplyBulkTags} 
                                   disabled={isBulkTagging || !bulkTags.trim()}
                                   className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary-hover disabled:bg-indigo-900 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                 {isBulkTagging && <Spinner />}
                                 Apply Tags
                               </button>
                            </div>
                             {bulkTagError && <p className="text-xs text-red-400 mt-1">{bulkTagError}</p>}
                        </div>
                    )}

                    {uploadingFiles.map(upload => (
                        <UploadProgressItem
                            key={upload.id}
                            name={upload.name}
                            status={upload.status}
                            error={upload.error}
                            dbId={upload.dbId}
                            isSelected={upload.dbId ? selectedUploads.has(upload.dbId) : false}
                            onSelect={handleToggleUploadSelection}
                        />
                    ))}
                </div>
            )}
            
            <div className="bg-surface p-4 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold">Local Media Folders</h3>
                <p className="text-sm text-text-secondary">Set local folders to browse media without importing. This feature is only available in the desktop app.</p>
                
                {(['video', 'audio', 'image'] as const).map(type => (
                    <div key={type} className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-background/50 rounded-md">
                        <span className="font-semibold capitalize w-16 flex-shrink-0">{type}s</span>
                        <input 
                            type="text"
                            readOnly
                            value={localPaths[type]}
                            placeholder="No folder set"
                            className="flex-grow bg-surface-light border-border rounded-md text-text-secondary px-3 py-1.5 text-sm"
                        />
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleSetPath(type)} className="p-2 bg-surface-light text-text-primary rounded-md hover:bg-border transition-colors" title="Set Folder">
                                <FolderOpenIcon />
                            </button>
                            <button onClick={() => handleScanPath(type)} disabled={!localPaths[type] || isScanning} className="p-2 bg-surface-light text-text-primary rounded-md hover:bg-border transition-colors disabled:opacity-50" title="Scan Folder">
                                <RefreshIcon className={isScanning ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-surface p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
                    <div className="relative w-full sm:flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <SearchIcon />
                        </span>
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                            onChange={(e) => setSearchTerm((e.target as any).value)}
                            className="w-full bg-surface-light border-border rounded-md text-text-primary pl-10 pr-4 py-2 focus:ring-primary focus:border-primary transition-colors"
                            aria-label="Search media by name"
                        />
                    </div>
                    <div className="relative w-full sm:flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <TagIcon />
                        </span>
                        <input
                            type="text"
                            placeholder="Filter by tag..."
                            value={tagFilter}
                            // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                            onChange={(e) => setTagFilter((e.target as any).value)}
                            className="w-full bg-surface-light border-border rounded-md text-text-primary pl-10 pr-4 py-2 focus:ring-primary focus:border-primary transition-colors"
                            aria-label="Filter media by tag"
                        />
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-1 bg-surface-light rounded-md p-1">
                        {(['all', 'image', 'video', 'audio'] as const).map((type) => {
                            const isActive = mediaTypeFilter === type;
                            const typeLabels = { all: 'All', image: 'Images', video: 'Videos', audio: 'Audio' };
                            return (
                                <button
                                    key={type}
                                    onClick={() => setMediaTypeFilter(type)}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                        isActive
                                        ? 'bg-primary text-white shadow'
                                        : 'text-text-secondary hover:bg-border/50'
                                    }`}
                                >
                                    {typeLabels[type]}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <MediaGrid 
                    mediaFiles={filteredMediaFiles} 
                    selectedFileId={selectedFile?.id || null} 
                    onSelectFile={handleFileClick} 
                    isFiltered={isFiltered} isGuest={isGuest}
                    isMultiSelectMode={isMultiSelectMode}
                    selectedIdsForTimeline={selectedIdsForTimeline}
                 />
            </div>
        </div>
      </div>
      {isMultiSelectMode && selectedIdsForTimeline.size > 0 && (
         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface/80 backdrop-blur-md shadow-2xl rounded-lg p-3 z-30 flex items-center gap-4">
            <p className="text-text-primary font-semibold">{selectedIdsForTimeline.size} video{selectedIdsForTimeline.size > 1 ? 's' : ''} selected</p>
            <button
                onClick={handleAddClipsToTimeline}
                className="px-4 py-2 bg-primary text-white rounded-md flex items-center gap-2 hover:bg-primary-hover transition-colors"
            >
                <PlusIcon />
                Add to Timeline
            </button>
            <button
                onClick={() => setSelectedIdsForTimeline(new Set())}
                className="text-sm text-text-secondary hover:text-text-primary"
            >
                Clear
            </button>
         </div>
      )}
      <MediaPreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          onConfirm={handleConfirmSelection}
          file={previewFile}
          onUpdateTags={handleUpdateTags}
      />
    </>
  );
};

export default MediaLibrary;
