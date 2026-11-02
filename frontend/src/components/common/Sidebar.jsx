import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Compass, 
  PlaySquare,
  MessageSquare, 
  Bell, 
  Bookmark, 
  User, 
  PlusSquare, 
  LogOut, 
  Zap,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from './Avatar';

export const Sidebar = ({ onOpenCreatePost }) => {
  const { user, logout } = useAuth();
  const { unreadNotifications } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Search', path: '/explore', icon: Compass },
    { name: 'Clips', path: '/clips', icon: PlaySquare },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { 
      name: 'Notifications', 
      path: '/notifications', 
      icon: Bell, 
      badge: unreadNotifications > 0 ? unreadNotifications : null 
    },
    { name: 'Saved', path: '/saved', icon: Bookmark },
    { name: 'Profile', path: user ? `/profile/${user.username}` : '/profile', icon: User },
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between w-60 lg:w-68 xl:w-72 h-screen sticky top-0 p-4 shrink-0 overflow-y-auto border-r border-brand-100 bg-surface z-30">
      <div className="space-y-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-3 py-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-brand-700 font-sans">ECHAT</h1>
            <p className="text-[10px] text-brand-500 -mt-1 font-medium tracking-widest">REALTIME SOCIAL</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all duration-200 group
                  ${isActive 
                    ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm' 
                    : 'text-text-secondary hover:text-brand-700 hover:bg-brand-50 border border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span className="text-sm">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-brand-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Create Post Button */}
        <button
          onClick={onOpenCreatePost}
          className="w-full py-3.5 px-4 rounded-xl bg-brand-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-brand-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <PlusSquare className="w-5 h-5" />
          <span>New Post</span>
        </button>
      </div>

      {/* User Footer Profile & Logout */}
      {user && (
        <div className="pt-4 border-t border-brand-100">
          <div className="flex items-center justify-between p-2 rounded-xl bg-brand-50 border border-brand-100">
            <div 
              className="flex items-center gap-3 cursor-pointer overflow-hidden"
              onClick={() => navigate(`/profile/${user.username}`)}
            >
              <Avatar src={user.avatar_url} alt={user.full_name} size="md" isOnline={true} showOnlineStatus={true} />
              <div className="truncate">
                <p className="text-xs font-bold text-text truncate">{user.full_name}</p>
                <p className="text-[11px] text-text-secondary truncate">@{user.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Log Out"
              className="p-2 text-text-secondary hover:text-brand-600 hover:bg-brand-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

