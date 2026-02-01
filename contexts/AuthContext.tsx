import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  googleClientId: string | null;
  setGoogleClientId: (clientId: string) => void;
  signOut: () => void;
  signIn: () => void;
  isClientIdInvalid: boolean;
  dismissClientIdWarning: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GOOGLE_CLIENT_ID_KEY = 'google-client-id';
const USER_SESSION_KEY = 'user-session';
const PKCE_VERIFIER_KEY = 'pkce-verifier';

// Helper to decode JWT tokens without external libraries
function jwtDecode<T>(token: string): T | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload) as T;
  } catch (error) {
    console.error("Failed to decode JWT", error);
    return null;
  }
}

// --- PKCE Helper Functions ---
const generateCodeVerifier = () => {
    const randomBytes = new Uint8Array(32);
    // FIX: Cast 'window' to any to bypass TS lib issue with 'crypto'.
    (window as any).crypto.getRandomValues(randomBytes);
    return btoa(String.fromCharCode(...randomBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
};

const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    // FIX: Cast 'window' to any to bypass TS lib issue with 'crypto'.
    const digest = await (window as any).crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
};
// --- End PKCE Helper Functions ---

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleClientId, setGoogleClientIdState] = useState<string | null>(() => {
    try {
        return (window as any).localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
    } catch (error) {
        console.warn("Could not access localStorage to get Google Client ID:", error);
        return null;
    }
  });
  const [isClientIdInvalid, setIsClientIdInvalid] = useState(false);
  
  useEffect(() => {
    const handleAuthentication = async () => {
        // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'location'.
        const params = new URLSearchParams((window as any).location.search);
        const code = params.get('code');
        // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'sessionStorage'.
        const storedVerifier = (window as any).sessionStorage.getItem(PKCE_VERIFIER_KEY);

        if (code && storedVerifier && googleClientId) {
            // This is the redirect from Google
            try {
                const body = new URLSearchParams({
                    client_id: googleClientId,
                    code: code,
                    code_verifier: storedVerifier,
                    grant_type: 'authorization_code',
                    // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'location'.
                    redirect_uri: (window as any).location.origin,
                });

                const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: body.toString(),
                });

                const tokens = await tokenResponse.json();

                if (tokens.error) {
                    throw new Error(tokens.error_description || 'Token exchange failed.');
                }

                const idToken = tokens.id_token;
                const decodedToken = jwtDecode<{
                    sub: string; name: string; email: string; picture: string;
                }>(idToken);

                if (decodedToken) {
                    const newUser: User = {
                        id: decodedToken.sub, name: decodedToken.name,
                        email: decodedToken.email, picture: decodedToken.picture,
                    };
                    setUser(newUser);
                    // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'localStorage'.
                    (window as any).localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newUser));
                }
            } catch (error) {
                console.error("OAuth callback error:", error);
            } finally {
                // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'sessionStorage'.
                (window as any).sessionStorage.removeItem(PKCE_VERIFIER_KEY);
                // Clean the URL
                // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'history', 'document', and 'location'.
                (window as any).history.replaceState({}, (window as any).document.title, (window as any).location.pathname);
            }
        } else {
            // Standard page load, check for existing session
            try {
                // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'localStorage'.
                const storedUser = (window as any).localStorage.getItem(USER_SESSION_KEY);
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.warn("Could not parse user session from localStorage:", error);
                // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'localStorage'.
                (window as any).localStorage.removeItem(USER_SESSION_KEY);
            }
        }
        
        // Check if client ID is set and seems valid
        if (googleClientId && !googleClientId.endsWith('.apps.googleusercontent.com')) {
            setIsClientIdInvalid(true);
        } else {
            setIsClientIdInvalid(false);
        }

        setAuthLoading(false);
    };

    handleAuthentication();
  }, [googleClientId]);

  const signIn = async () => {
    if (!googleClientId) {
        setIsClientIdInvalid(true);
        console.error("Google Client ID not configured.");
        return;
    }
    
    const verifier = generateCodeVerifier();
    // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'sessionStorage'.
    (window as any).sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    const challenge = await generateCodeChallenge(verifier);

    const params = new URLSearchParams({
        client_id: googleClientId,
        // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'location'.
        redirect_uri: (window as any).location.origin,
        response_type: 'code',
        scope: 'openid email profile',
        code_challenge: challenge,
        code_challenge_method: 'S256',
    });
    
    // Redirect the user to Google's OAuth 2.0 server
    (window as any).location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  };

  const signOut = () => {
    setUser(null);
    // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'localStorage'.
    (window as any).localStorage.removeItem(USER_SESSION_KEY);
    // No need to call Google's sign out, as we are not using their session management
  };

  const setGoogleClientId = (clientId: string) => {
    try {
        // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'localStorage'.
        (window as any).localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId);
    } catch (error) {
        console.warn("Could not write Google Client ID to localStorage:", error);
    }
    setGoogleClientIdState(clientId);
    // Reload to apply the new client ID and re-evaluate auth status
    (window as any).location.reload();
  };

  const dismissClientIdWarning = () => {
      setIsClientIdInvalid(false);
  };

  const value = {
    user,
    authLoading,
    googleClientId,
    setGoogleClientId,
    signOut,
    signIn,
    isClientIdInvalid,
    dismissClientIdWarning
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
