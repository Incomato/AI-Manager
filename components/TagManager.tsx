import React, { useState, useEffect, useRef } from 'react';
import { MediaFile } from '../types';
import { SavingSpinner } from './icons/SavingSpinner';

interface TagManagerProps {
  file: MediaFile;
  onUpdateTags: (file: MediaFile, newTags: string[]) => Promise<void>;
}

const TagManager: React.FC<TagManagerProps> = ({ file, onUpdateTags }) => {
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debounce timer
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCurrentTags(file.tags || []);
  }, [file]);

  const triggerSave = (tagsToSave: string[]) => {
    if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
    }
    setIsSaving(true);
    setError(null);
    debounceTimeout.current = setTimeout(async () => {
        try {
            await onUpdateTags(file, tagsToSave);
        } catch(e) {
            setError("Failed to save tags.");
            // Revert state on failure
            setCurrentTags(file.tags || []);
        } finally {
            setIsSaving(false);
        }
    }, 1000); // 1-second debounce
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagInput.trim() !== '') {
      e.preventDefault();
      const newTag = newTagInput.trim().toLowerCase();
      if (!currentTags.includes(newTag)) {
        const updatedTags = [...currentTags, newTag];
        setCurrentTags(updatedTags);
        triggerSave(updatedTags);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);
    setCurrentTags(updatedTags);
    triggerSave(updatedTags);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label htmlFor="tag-input" className="block text-sm font-medium text-text-secondary">
          Tags
        </label>
        {isSaving && <div className="flex items-center gap-2 text-xs text-text-secondary"><SavingSpinner /><span>Saving...</span></div>}
        {error && <div className="text-xs text-red-400">{error}</div>}
      </div>
       <div className="flex flex-wrap items-start gap-2">
            <div className="flex flex-wrap gap-2 flex-1">
            {currentTags.length > 0 ? (
                currentTags.map((tag) => (
                <span
                    key={tag}
                    className="flex items-center gap-1.5 bg-surface-light text-primary text-sm font-medium px-2.5 py-1 rounded-full"
                >
                    {tag}
                    <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-indigo-400 hover:text-white"
                    aria-label={`Remove tag ${tag}`}
                    >
                    &times;
                    </button>
                </span>
                ))
            ) : (
                <p className="text-sm text-text-secondary italic py-1">No tags yet.</p>
            )}
            </div>
            <input
                id="tag-input"
                type="text"
                value={newTagInput}
                // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                onChange={(e) => setNewTagInput((e.target as any).value)}
                onKeyDown={handleAddTag}
                placeholder="Add a tag and press Enter"
                className="bg-surface-light border-border rounded-md text-text-primary text-sm focus:ring-primary focus:border-primary transition px-3 py-1.5 flex-shrink-0 min-w-[200px]"
                aria-label="Add a new tag"
            />
       </div>
    </div>
  );
};

export default TagManager;