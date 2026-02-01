import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

// This is a browser-only library, so we need to declare the google object
declare const google: any;

const Login: React.FC = () => {
    const { googleClientId } = useAuth();
    const signInButtonRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (googleClientId && typeof google !== 'undefined' && signInButtonRef.current) {
            // Prevent re-rendering the button if it already exists
            // FIX: Cast to 'any' to access 'childElementCount' and bypass TypeScript lib issue.
            if ((signInButtonRef.current as any).childElementCount === 0) {
                 try {
                    google.accounts.id.renderButton(
                        signInButtonRef.current,
                        { theme: "outline", size: "large", type: "standard", text: "signin_with" }
                    );
                } catch(error) {
                    console.error("Error rendering Google Sign-In button:", error);
                }
            }
        }
    }, [googleClientId]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">
                <span className="text-indigo-400">AI</span> Manager
            </h1>
            <p className="text-gray-400 mb-8">Your personal AI-powered social media assistant.</p>
        </div>
        
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-sm">
            {!googleClientId ? (
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-white mb-4">Configuration Required</h2>
                    <p className="text-gray-300">
                        Please go to the <span className="font-bold text-indigo-300">Settings</span> page and enter your Google Client ID to enable Sign-In.
                    </p>
                    <p className="text-xs text-gray-500 mt-4">
                        This is a one-time setup to connect the app to Google's authentication service securely.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center space-y-6">
                    <p className="text-gray-300">Sign in to continue</p>
                    <div ref={signInButtonRef}></div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Login;
