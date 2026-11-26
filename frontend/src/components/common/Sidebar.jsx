import { Link, NavLink } from 'react-router-dom';
import { LogOut, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from './Avatar';
import { Brand } from './Brand';
import { navigation } from './navigation';

export function Sidebar({ onOpenCreatePost }) {
  const { user, logout } = useAuth();
  const { unreadNotifications } = useSocket();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand mb-9"><Brand /></div>
      <nav className="grid gap-1" aria-label="Main navigation">
        {navigation.map(({ name, path, icon: Icon }) => (
          <NavLink key={path} to={path} end={path === '/'} className="nav-item relative" title={name} aria-label={name === 'Notifications' ? undefined : name}>
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span className="nav-copy">{name}</span>
            {name === 'Notifications' && unreadNotifications > 0 &&
              <span className="badge nav-copy ml-auto">{Math.min(unreadNotifications, 99)}<span className="sr-only"> unread</span></span>}
          </NavLink>
        ))}
      </nav>
      <button type="button" onClick={onOpenCreatePost} className="pill-button primary-button mt-6 w-full" aria-label="Create post" title="Create post">
        <Plus size={20} /><span className="nav-copy">Create post</span>
      </button>
      <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
        <Link to="/profile" className="sidebar-account flex min-w-0 flex-1 items-center gap-2.5 rounded-xl">
          <span aria-hidden="true"><Avatar src={user.avatar_url} alt={user.full_name} size="sm" /></span>
          <span className="nav-copy min-w-0">
            <span className="block truncate text-xs font-semibold">{user.full_name}</span>
            <span className="block truncate text-[11px] text-text-secondary">@{user.username}</span>
          </span>
        </Link>
        <button type="button" onClick={logout} aria-label="Sign out" title="Sign out" className="icon-button sidebar-logout"><LogOut size={17} /></button>
      </div>
    </aside>
  );
}
