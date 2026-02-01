import React, { useState, useRef, useEffect } from 'react';
import { Page } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { DashboardIcon } from './icons/DashboardIcon';
import { PostsIcon } from './icons/PostsIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { MediaLibraryIcon } from './icons/MediaLibraryIcon';
import { AIOrderIcon } from './icons/AIOrderIcon';
import { VideoEditorIcon } from './icons/VideoEditorIcon';

interface HeaderProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const NavItem: React.FC<{
    page: Page;
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
    icon: React.ReactNode;
    label: string;
}> = ({ page, currentPage, setCurrentPage, icon, label }) => {
    const isActive = currentPage === page;
    return (
        <button
            onClick={() => setCurrentPage(page)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
            }`}
        >
            <span className={`${isActive ? 'text-white' : 'text-primary'}`}>{icon}</span>
            <span className="hidden lg:inline">{label}</span>
        </button>
    );
};

const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage }) => {
  const { user, signOut, signIn } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !(dropdownRef.current as any).contains(event.target as any)) {
        setIsDropdownOpen(false);
      }
    };
    (window as any).document.addEventListener('mousedown', handleClickOutside);
    return () => (window as any).document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-surface/90 backdrop-blur-md sticky top-0 z-50 border-b border-border shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/30">
              A
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">
              <span className="text-primary">AI</span> Manager
            </h1>
          </div>

          <nav className="flex items-center bg-background/50 p-1 rounded-xl border border-border">
              <NavItem page={Page.MediaLibrary} currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<MediaLibraryIcon />} label="Library" />
              <NavItem page={Page.VideoEditor} currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<VideoEditorIcon />} label="Editor" />
              <NavItem page={Page.Dashboard} currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<DashboardIcon />} label="Dash" />
              <NavItem page={Page.AIOrder} currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<AIOrderIcon />} label="Order" />
              <NavItem page={Page.GeneratedPosts} currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<PostsIcon />} label="Posts" />
              <NavItem page={Page.Settings} currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<SettingsIcon />} label="Settings" />
          </nav>

          <div className="flex items-center">
              {user ? (
                <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                      className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-surface-light border border-border hover:border-primary transition-colors focus:outline-none"
                    >
                      <img src={user.picture} alt={user.name} className="h-7 w-7 rounded-full object-cover border border-border" />
                      <span className="text-sm font-medium hidden md:inline">{user.name.split(' ')[0]}</span>
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-surface-light rounded-xl shadow-2xl py-2 z-50 border border-border overflow-hidden">
                        <div className="px-4 py-3 border-b border-border bg-background/30">
                            <p className="text-sm font-semibold text-text-primary truncate">{user.name}</p>
                            <p className="text-xs text-text-secondary truncate">{user.email}</p>
                        </div>
                        <button
                          onClick={signOut}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                </div>
              ) : (
                <button
                    onClick={signIn}
                    className="btn-primary"
                >
                    Sign In
                </button>
              )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;