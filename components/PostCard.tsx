import React, { useState, useEffect } from 'react';
import { GeneratedPost, SocialPlatform, Priority } from '../types';
import * as socialService from '../services/socialService';
import * as db from '../services/dbService';
import Spinner from './Spinner';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import SchedulePostModal from './SchedulePostModal';
import { SavingSpinner } from './icons/SavingSpinner';
import { CheckIcon } from './icons/CheckIcon';
import { ScheduleIcon } from './icons/ScheduleIcon';
import { useAuth } from '../contexts/AuthContext';

interface PostCardProps {
  post: GeneratedPost;
  onPostUpdate: () => void;
}

const DRAFT_KEY_PREFIX = 'post-draft-';
const getDraftKey = (postId: number) => `${DRAFT_KEY_PREFIX}${postId}`;
const AUTO_SAVE_DELAY = 2000; // 2 seconds

const PostCard: React.FC<PostCardProps> = ({ post, onPostUpdate }) => {
  const { user } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [editedHashtags, setEditedHashtags] = useState(post.hashtags.join(', '));
  const [editedPriority, setEditedPriority] = useState(post.priority || Priority.Medium);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing || !post.id) {
      return;
    }

    setDraftStatus('saving');

    const handler = setTimeout(() => {
        const draft = { content: editedContent, hashtags: editedHashtags, priority: editedPriority };
        try {
            // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'localStorage'.
            (window as any).localStorage.setItem(getDraftKey(post.id!), JSON.stringify(draft));
            setDraftStatus('saved');
        } catch (error) {
            console.warn("Could not save draft to localStorage", error);
            setDraftStatus('idle'); // Or some error state
        }
    }, AUTO_SAVE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [editedContent, editedHashtags, editedPriority, isEditing, post.id]);


  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishStatus(null);
    try {
      let result;
      if (post.platform === SocialPlatform.TikTok) {
        result = await socialService.publishToTikTok(post);
      } else if (post.platform === SocialPlatform.Clapper) {
        result = await socialService.publishToClapper(post);
      }
      if(user) {
        await db.updateGeneratedPost({ ...post, status: 'published', userId: user.id });
        onPostUpdate();
      }
      setPublishStatus(result || "Published successfully (Simulated)");
    } catch (error: any) {
      setPublishStatus(error.message || "Failed to publish (Simulated)");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEdit = () => {
    if (!post.id) return;
    setSaveError(null);
    const draftKey = getDraftKey(post.id);
    let savedDraft: string | null = null;
    try {
        // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'localStorage'.
        savedDraft = (window as any).localStorage.getItem(draftKey);
    } catch (error) {
        console.warn("Could not read draft from localStorage", error);
    }
    

    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setEditedContent(draft.content || post.content);
        setEditedHashtags(draft.hashtags || post.hashtags.join(', '));
        setEditedPriority(draft.priority || post.priority || Priority.Medium);
        setDraftStatus('saved');
      } catch (e) {
        console.error("Failed to parse draft:", e);
        setEditedContent(post.content);
        setEditedHashtags(post.hashtags.join(', '));
        setEditedPriority(post.priority || Priority.Medium);
        setDraftStatus('idle');
      }
    } else {
      setEditedContent(post.content);
      setEditedHashtags(post.hashtags.join(', '));
      setEditedPriority(post.priority || Priority.Medium);
      setDraftStatus('idle');
    }
    setIsEditing(true);
  };

  const clearDraft = () => {
      if (post.id) {
          try {
            // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'localStorage'.
            (window as any).localStorage.removeItem(getDraftKey(post.id));
          } catch (error) {
            console.warn("Could not remove draft from localStorage", error);
          }
      }
      setDraftStatus('idle');
  }

  const handleCancel = () => {
    clearDraft();
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if(!post.id || !user) return;
    setIsSaving(true);
    setSaveError(null);
    const updatedPost: GeneratedPost = {
      ...post,
      userId: user.id,
      content: editedContent,
      hashtags: editedHashtags.split(',').map(h => h.trim()).filter(h => h),
      priority: editedPriority,
    };

    try {
      await db.updateGeneratedPost(updatedPost);
      clearDraft();
      onPostUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save post:", error);
      setSaveError('Failed to save post. Your draft is still safe.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!post.id || !user) return;
    
    setIsDeleting(true);
    try {
        await db.deleteGeneratedPost(post.id, user.id);
        clearDraft();
        onPostUpdate();
        setIsDeleteModalOpen(false);
    } catch (error) {
        console.error("Failed to delete post:", error);
    } finally {
        setIsDeleting(false);
    }
  };

  const handleSchedule = async (publishAt: Date) => {
    if (!post.id || !user) return;
    setIsScheduling(true);
    try {
        await db.addScheduledPost({ userId: user.id, postId: post.id, publishAt });
        await db.updateGeneratedPost({ ...post, status: 'scheduled', userId: user.id });
        onPostUpdate();
        setIsScheduleModalOpen(false);
    } catch (error) {
        console.error("Failed to schedule post:", error);
    } finally {
        setIsScheduling(false);
    }
  };

  const handleUnschedule = async () => {
    if (!post.id || !user) return;
    try {
        await db.unschedulePost(post.id, user.id);
        onPostUpdate();
    } catch(error) {
        console.error("Failed to unschedule post:", error);
    }
  }

  const PostStatusIndicator: React.FC = () => {
      let color = 'bg-gray-500';
      let text = 'Draft';
      if (post.status === 'scheduled') {
          color = 'bg-blue-500';
          text = 'Scheduled';
      } else if (post.status === 'published') {
          color = 'bg-green-500';
          text = 'Published';
      }
      return <span className={`text-xs font-semibold uppercase px-2 py-1 ${color} text-white rounded-full`}>{text}</span>;
  }

  const PriorityIndicator: React.FC<{ priority: Priority }> = ({ priority }) => {
    const priorityStyles: Record<Priority, string> = {
        [Priority.High]: 'bg-red-600 text-red-100',
        [Priority.Medium]: 'bg-yellow-500 text-yellow-900',
        [Priority.Low]: 'bg-gray-500 text-gray-100',
    };
    const currentPriority = priority || Priority.Medium;
    return <span className={`text-xs font-semibold uppercase px-2 py-1 ${priorityStyles[currentPriority]} rounded-full`}>{currentPriority}</span>;
  }

  return (
    <>
        <div className="bg-surface rounded-lg shadow-lg overflow-hidden flex flex-col sm:flex-row">
        {post.mediaFile && (
            <div className="sm:w-1/3 flex-shrink-0">
            {post.mediaFile.type === 'image' ? (
                <img src={post.mediaFile.data} alt={post.mediaFile.name} className="w-full h-48 sm:h-full object-cover" />
            ) : (
                <video src={post.mediaFile.data} className="w-full h-48 sm:h-full object-cover" controls />
            )}
            </div>
        )}
        <div className="p-5 flex flex-col justify-between flex-grow">
            {isEditing ? (
            <div className="space-y-4">
                <div>
                    <label htmlFor={`content-${post.id}`} className="block text-sm font-medium text-text-secondary mb-1">Content</label>
                    <textarea
                        id={`content-${post.id}`}
                        value={editedContent}
                        // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                        onChange={(e) => setEditedContent((e.target as any).value)}
                        rows={5}
                        className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary transition"
                    />
                </div>
                <div>
                    <label htmlFor={`hashtags-${post.id}`} className="block text-sm font-medium text-text-secondary mb-1">Hashtags (comma-separated)</label>
                    <input
                        type="text"
                        id={`hashtags-${post.id}`}
                        value={editedHashtags}
                        // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                        onChange={(e) => setEditedHashtags((e.target as any).value)}
                        className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary transition"
                    />
                </div>
                <div>
                    <label htmlFor={`priority-${post.id}`} className="block text-sm font-medium text-text-secondary mb-1">Priority</label>
                    <select
                        id={`priority-${post.id}`}
                        value={editedPriority}
                        onChange={(e) => setEditedPriority((e.target as any).value as Priority)}
                        className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary transition"
                    >
                        <option value={Priority.High}>High</option>
                        <option value={Priority.Medium}>Medium</option>
                        <option value={Priority.Low}>Low</option>
                    </select>
                </div>
            </div>
            ) : (
            <div>
                <p className="text-text-secondary whitespace-pre-wrap">{post.content}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                {post.hashtags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-surface-light text-primary text-xs font-medium rounded-full">
                    {tag}
                    </span>
                ))}
                </div>
            </div>
            )}
            
            <div className="mt-auto pt-6">
                {isEditing && saveError && (
                  <div className="mb-3 text-center p-2 rounded-md bg-red-900/50 text-red-300 text-sm">
                    {saveError}
                  </div>
                )}

                <div className="flex justify-between items-center flex-wrap gap-y-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-text-secondary">
                            Platform: <span className="text-primary">{post.platform}</span>
                        </span>
                        <PostStatusIndicator />
                        <PriorityIndicator priority={post.priority} />
                    </div>
                    {isEditing ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm transition-opacity">
                                {draftStatus === 'saving' && <div className="flex items-center gap-2 text-text-secondary"><SavingSpinner /><span>Saving...</span></div>}
                                {draftStatus === 'saved' && <div className="flex items-center gap-2 text-green-400"><CheckIcon className="h-4 w-4" /><span>Draft saved</span></div>}
                            </div>
                            <button onClick={handleCancel} className="px-4 py-2 bg-surface-light text-text-primary rounded-md hover:bg-border transition-colors flex-shrink-0">Cancel</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-900 disabled:cursor-not-allowed flex items-center gap-2 transition-colors flex-shrink-0">
                                {isSaving && <Spinner />}
                                Save Changes
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button onClick={handleDeleteClick} title="Delete this post permanently" className="p-2 bg-surface-light text-text-secondary rounded-md hover:bg-red-800 hover:text-white transition-colors disabled:opacity-50" aria-label="Delete Post"><DeleteIcon /></button>
                            {post.status !== 'published' && <button onClick={handleEdit} title="Edit post content and hashtags" className="p-2 bg-surface-light text-text-secondary rounded-md hover:bg-border hover:text-text-primary transition-colors disabled:opacity-50" aria-label="Edit Post"><EditIcon /></button>}
                            {post.status === 'draft' && <button onClick={() => setIsScheduleModalOpen(true)} title="Schedule this post for a future date" className="p-2 bg-surface-light text-text-secondary rounded-md hover:bg-blue-800 hover:text-white transition-colors" aria-label="Schedule Post"><ScheduleIcon /></button>}
                            {post.status === 'draft' && <button onClick={handlePublish} disabled={isPublishing} title="Publish this post immediately" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:bg-indigo-900 disabled:cursor-not-allowed flex items-center gap-2 transition-colors">
                                {isPublishing ? <><Spinner />Publishing...</> : 'Publish'}
                            </button>}
                            {post.status === 'scheduled' && <button onClick={handleUnschedule} title="Cancel scheduling and return to draft" className="px-4 py-2 bg-surface-light text-text-primary rounded-md hover:bg-border transition-colors">Unschedule</button>}
                        </div>
                    )}
                </div>
                {post.status === 'scheduled' && post.scheduledAt && (
                    <p className="mt-3 text-sm text-center p-2 rounded-md bg-blue-900/50 text-blue-300">
                        Scheduled for: {new Date(post.scheduledAt).toLocaleString()}
                    </p>
                )}
                {publishStatus && (
                    <p className={`mt-3 text-sm text-center p-2 rounded-md ${publishStatus.includes('Failed') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
                        {publishStatus}
                    </p>
                )}
            </div>
        </div>
        </div>
        <ConfirmDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} isDeleting={isDeleting} />
        <SchedulePostModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} onSchedule={handleSchedule} isScheduling={isScheduling} />
    </>
  );
};

export default PostCard;