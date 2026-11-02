import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, PlaySquare, MessageSquare, Bookmark, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export const BottomNav = () => {
  const { user } = useAuth();
  const { unreadNotifications } = useSocket();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Search', path: '/explore', icon: Compass },
    { name: 'Clips', path: '/clips', icon: PlaySquare },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Profile', path: user ? `/profile/${user.username}` : '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-surface/95 backdrop-blur-md border-t border-brand-100 px-2 sm:px-4 py-1.5 pb-safe flex items-center justify-around shadow-xs">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              p-2 rounded-xl flex flex-col items-center gap-0.5 transition-all
              ${isActive ? 'text-brand-600 font-bold scale-105' : 'text-text-secondary hover:text-brand-600'}
            `}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">{item.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

