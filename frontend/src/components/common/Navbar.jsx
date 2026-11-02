import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Zap, Bell, MessageSquare, PlusSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from './Avatar';

export const Navbar = ({ onOpenCreatePost }) => {
  const { user } = useAuth();
  const { unreadNotifications } = useSocket();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-20 w-full bg-surface/95 backdrop-blur-md border-b border-brand-100 shadow-xs px-3 sm:px-4 py-2.5 md:hidden">
      <div className="flex items-center justify-between gap-2.5">
        {/* Brand */}
        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-xs">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-base sm:text-lg font-extrabold text-brand-700 tracking-wider">ECHAT</span>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xs relative">
          <input
            type="text"
            placeholder="Search users, posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-50/80 border border-brand-100 rounded-full py-1.5 pl-8 pr-3 text-xs text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
          <Search className="w-3.5 h-3.5 text-brand-400 absolute left-2.5 top-2.5" />
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={onOpenCreatePost}
            aria-label="Create Post"
            className="p-2 text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 transition-colors rounded-full"
          >
            <PlusSquare className="w-4 h-4" />
          </button>
          <button 
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
            className="p-2 text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 transition-colors rounded-full relative"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

