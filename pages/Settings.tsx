import React, { useState } from 'react';
import { useScheduledPosts } from '../hooks/useDb';
import { useAuth } from '../contexts/AuthContext';
import { CheckIcon } from '../components/icons/CheckIcon';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { data: scheduledPosts, loading } = useScheduledPosts(user?.id);
  const { googleClientId, setGoogleClientId } = useAuth();
  const [clientIdInput, setClientIdInput] = useState(googleClientId || '');
  // FIX: Add state for validation error and save success feedback.
  const [clientIdError, setClientIdError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveClientId = () => {
    // FIX: Add validation to ensure the Client ID format is correct before saving.
    if (!clientIdInput.trim().endsWith('.apps.googleusercontent.com')) {
      setClientIdError('This does not look like a valid Google Client ID. It should end with ".apps.googleusercontent.com"');
      setSaveSuccess(false);
      return;
    }
    setClientIdError(null);
    setGoogleClientId(clientIdInput.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000); // Hide success message after 2 seconds
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold tracking-tight">Settings</h2>

      {/* API Keys */}
      <div className="bg-surface p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">API Configurations</h3>
        <div className="space-y-4">
            <div>
                <label htmlFor="google-client-id" className="block text-sm font-medium text-text-secondary mb-2">Google Client ID</label>
                <input
                    type="text"
                    id="google-client-id"
                    value={clientIdInput}
                    // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
                    onChange={(e) => setClientIdInput((e.target as any).value)}
                    className="w-full bg-surface-light border-border rounded-md text-text-primary focus:ring-primary focus:border-primary"
                    // FIX: Add a placeholder to guide the user on the correct format.
                    placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                />
                 {clientIdError && <p className="text-red-400 text-sm mt-2">{clientIdError}</p>}
                 <div className="mt-3 p-3 bg-surface-light/50 border border-yellow-600/50 rounded-md text-xs text-text-secondary space-y-2">
                    {/* FIX: Improve instructional text to be clearer about potential errors and required configuration. */}
                    <p className="font-bold text-yellow-400">Important Configuration Note:</p>
                    <p>A sign-in error (like 'redirect_uri_mismatch') is almost always caused by an incorrect configuration in your Google Cloud Console.</p>
                    <p>Please ensure you are using the <strong className="text-text-primary">OAuth 2.0 Client ID for Web applications</strong>. It should have the format shown in the placeholder.</p>
                    <p>Crucially, you must add your application's URL to the <strong className="text-text-primary">"Authorized redirect URIs"</strong> for your Client ID. For local development, this will typically be:</p>
                    <ul className="list-disc list-inside pl-2">
                        <li className="font-mono bg-surface px-1 py-0.5 rounded-md inline-block">http://localhost</li>
                        <li className="font-mono bg-surface px-1 py-0.5 rounded-md inline-block">http://localhost:5173</li>
                    </ul>
                     <p>You should also add these same URLs to <strong className="text-text-primary">"Authorized JavaScript origins"</strong>.</p>
                    <a 
                        href="https://console.cloud.google.com/apis/credentials" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-semibold"
                    >
                        Open Google Cloud Credentials
                    </a>
                </div>
            </div>
            <div className="text-right flex items-center justify-end gap-4">
                {saveSuccess && (
                    <div className="flex items-center gap-2 text-green-400 transition-opacity duration-300">
                        <CheckIcon className="h-5 w-5" />
                        <span>Saved!</span>
                    </div>
                )}
                <button 
                    onClick={handleSaveClientId}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
                >
                    Save Client ID
                </button>
            </div>
        </div>
      </div>
      
      {/* Social Connections */}
      <div className="bg-surface p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Social Media Connections</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-surface-light rounded-md">
            <div>
              <p className="font-bold">TikTok</p>
              <p className="text-sm text-text-secondary">Not Connected</p>
            </div>
            <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">Connect</button>
          </div>
          <div className="flex justify-between items-center p-4 bg-surface-light rounded-md">
            <div>
              <p className="font-bold">Clapper</p>
              <p className="text-sm text-text-secondary">Not Connected</p>
            </div>
            <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">Connect</button>
          </div>
           <p className="text-xs text-text-secondary pt-2">
            Note: Direct API connections require a backend and official approval from the platforms. This is a UI demonstration.
          </p>
        </div>
      </div>
      
      {/* Auto-Posting Scheduler */}
      <div className="bg-surface p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Scheduled Auto-Posts</h3>
        <p className="text-sm text-text-secondary mb-4">
          The application automatically checks for and publishes scheduled posts every minute while it's open.
        </p>
        <div className="space-y-3">
          {loading ? <p>Loading schedule...</p> : 
            scheduledPosts.length > 0 ? scheduledPosts.map(sp => (
              <div key={sp.id} className="p-3 bg-surface-light rounded-md flex justify-between items-center">
                <p>
                  Post #{sp.postId} for <span className="font-bold text-primary">{sp.post?.platform}</span>
                </p>
                <p className="text-sm text-text-secondary">
                  Scheduled for: {new Date(sp.publishAt).toLocaleString()}
                </p>
              </div>
            )) : <p className="text-text-secondary">No posts are currently scheduled.</p>
          }
        </div>
      </div>

    </div>
  );
};

export default Settings;