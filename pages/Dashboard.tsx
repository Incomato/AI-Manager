import React, { useState, useEffect } from 'react';
import * as db from '../services/dbService';
import { MediaFile, SocialPlatform, GeneratedPost, Page, Priority } from '../types';
import { generatePostContent } from '../services/geminiService';
import Spinner from '../components/Spinner';
import { GenerateIcon } from '../components/icons/GenerateIcon';
import SchedulePostModal from '../components/SchedulePostModal';
import { useAuth } from '../contexts/AuthContext';
import { useAI } from '../contexts/AIContext';

interface DashboardProps {
  selectedFile: MediaFile | null;
  setSelectedFile: (file: MediaFile | null) => void;
  setCurrentPage: (page: Page) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedFile, setSelectedFile, setCurrentPage }) => {
  const { user } = useAuth();
  const { aiOrder } = useAI();
  const [prompt, setPrompt] = useState<string>('');
  const [platform, setPlatform] = useState<SocialPlatform>(SocialPlatform.TikTok);
  const [priority, setPriority] = useState<Priority>(Priority.Medium);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<{ content: string, hashtags: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    setPrompt('');
    setGeneratedResult(null);
    setError(null);
  }, [selectedFile]);
  
  const handleGeneratePost = async () => {
    if (!selectedFile) {
        setError("Please select a media file from the Media Library first.");
        return;
    }
    setIsGenerating(true);
    setGeneratedResult(null);
    setError(null);

    try {
        const base64Data = selectedFile.data.split(',')[1];
        const result = await generatePostContent({ data: base64Data, mimeType: selectedFile.mimeType }, prompt, platform, aiOrder);
        setGeneratedResult(result);
    } catch (e: any) {
        setError(e.message || "An unknown error occurred during generation.");
    } finally {
        setIsGenerating(false);
    }
  };

  const clearState = () => {
      setGeneratedResult(null);
      setSelectedFile(null);
      setPrompt('');
      setCurrentPage(Page.GeneratedPosts);
  }

  const handleSaveDraft = async () => {
      if (!generatedResult || !selectedFile || !selectedFile.id || !user) {
          return;
      }
      const newPost: Omit<GeneratedPost, 'id'> = {
          userId: user.id,
          mediaFileId: selectedFile.id,
          platform,
          priority,
          content: generatedResult.content,
          hashtags: generatedResult.hashtags,
          createdAt: new Date(),
          status: 'draft',
      };
      await db.addGeneratedPost(newPost);
      clearState();
  };

  const handleSchedule = async (publishAt: Date) => {
    if (!generatedResult || !selectedFile || !selectedFile.id || !user) {
        return;
    }
    setIsScheduling(true);
    try {
        const newPost: Omit<GeneratedPost, 'id'> = {
            userId: user.id,
            mediaFileId: selectedFile.id,
            platform,
            priority,
            content: generatedResult.content,
            hashtags: generatedResult.hashtags,
            createdAt: new Date(),
            status: 'scheduled',
        };
        const postId = await db.addGeneratedPost(newPost);
        await db.addScheduledPost({ userId: user.id, postId, publishAt });
        setIsScheduleModalOpen(false);
        clearState();
    } catch (error) {
        console.error("Failed to schedule post:", error);
    } finally {
        setIsScheduling(false);
    }
  }

  return (
    <>
    <div className="space-y-8">
       <h2 className="text-3xl font-bold tracking-tight">Post Generation Dashboard</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-surface p-6 rounded-lg space-y-4">
            <h3 className="text-2xl font-bold">Post Generator</h3>
            
            <div className="p-4 border border-border rounded-lg bg-background/50">
                {selectedFile ? (
                    <div className="flex items-center gap-4">
                        <img src={selectedFile.data} alt="Selected" className="w-20 h-20 rounded-md object-cover"/>
                        <div>
                            <p className="font-semibold">{selectedFile.name}</p>
                            <p className="text-sm text-text-secondary">{selectedFile.type}</p>
                        </div>
                         <button onClick={() => setSelectedFile(null)} className="ml-auto text-sm text-red-400 hover:text-red-300">Clear</button>
                    </div>
                ) : (
                    <p className="text-text-secondary text-center py-6">Select a file from your Media Library to begin.</p>
                )}
            </div>

            <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-text-secondary mb-2">Your Idea / Prompt</label>
                <textarea
                    id="prompt"
                    value={prompt}
                    // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                    onChange={(e) => setPrompt((e.target as any).value)}
                    rows={3}
                    className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary"
                    placeholder="e.g., A funny clip about my cat's morning routine"
                />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="platform" className="block text-sm font-medium text-text-secondary mb-2">Target Platform</label>
                    <select 
                        id="platform"
                        value={platform}
                        // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                        onChange={(e) => setPlatform((e.target as any).value as SocialPlatform)}
                        className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary"
                    >
                        <option value={SocialPlatform.TikTok}>TikTok</option>
                        <option value={SocialPlatform.Clapper}>Clapper</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-text-secondary mb-2">Priority</label>
                    <select 
                        id="priority"
                        value={priority}
                        onChange={(e) => setPriority((e.target as any).value as Priority)}
                        className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary"
                    >
                        <option value={Priority.High}>High</option>
                        <option value={Priority.Medium}>Medium</option>
                        <option value={Priority.Low}>Low</option>
                    </select>
                </div>
            </div>

            <button
                onClick={handleGeneratePost}
                disabled={!selectedFile || isGenerating || !user}
                title={!user ? "Please sign in to use AI generation" : ""}
                className="w-full py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-green-900 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
                {isGenerating ? <Spinner /> : <GenerateIcon />}
                {isGenerating ? 'Generating with AI...' : 'Generate Post'}
            </button>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <div className="bg-surface p-6 rounded-lg flex flex-col">
            <h3 className="text-2xl font-bold mb-4">AI Output</h3>
            <div className="bg-background/50 border border-border rounded-lg p-4 flex-grow flex flex-col justify-between">
                {isGenerating ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Spinner />
                        <p className="mt-4 text-text-secondary">Gemini is thinking...</p>
                    </div>
                ) : generatedResult ? (
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-text-secondary">Generated Caption:</h4>
                            <p className="text-text-primary mt-1 whitespace-pre-wrap">{generatedResult.content}</p>
                        </div>
                        <div>
                             <h4 className="font-semibold text-text-secondary">Generated Hashtags:</h4>
                             <div className="flex flex-wrap gap-2 mt-2">
                                {generatedResult.hashtags.map((tag, i) => (
                                    <span key={i} className="px-2 py-1 bg-surface-light text-primary text-xs font-medium rounded-full">{tag}</span>
                                ))}
                             </div>
                        </div>
                         <div className="pt-4 space-y-2">
                           <h5 className="text-sm font-semibold text-text-secondary text-center">What's next?</h5>
                           <div className="flex items-center gap-4">
                              <button
                                  onClick={handleSaveDraft}
                                  disabled={!user}
                                  title={!user ? "Please sign in to save your post" : ""}
                                  className="flex-1 py-2 bg-surface-light text-text-primary rounded-md hover:bg-border transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
                              >
                                  Save as Draft
                              </button>
                              <button
                                  onClick={() => setIsScheduleModalOpen(true)}
                                  disabled={!user}
                                  title={!user ? "Please sign in to schedule your post" : ""}
                                  className="flex-1 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:bg-indigo-900 disabled:cursor-not-allowed"
                              >
                                  Schedule Post...
                              </button>
                           </div>
                         </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-text-secondary">{user ? "The generated post will appear here." : "Sign in to generate posts with AI."}</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
    <SchedulePostModal 
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSchedule={handleSchedule}
        isScheduling={isScheduling}
    />
    </>
  );
};

export default Dashboard;