import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Bell, Bookmark, Plus, Search } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import { navigation } from './navigation';

export function Navbar({ onOpenCreatePost }) {
  const { unreadNotifications } = useSocket();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = useState('');
  const title = navigation.find(item => item.path === pathname || (item.path !== '/' && pathname.startsWith(item.path + '/')))?.name || 'Post';

  function submit(event) {
    event.preventDefault();
    if (query.trim()) navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="app-topbar">
      <div className="topbar-inner">
        <div className="md:hidden"><Brand /></div>
        <span className="hidden md:inline text-sm font-semibold tracking-tight">{title}</span>
        <div className="flex-1" />
        <form className="relative hidden w-full max-w-[306px] sm:block" onSubmit={submit} role="search" aria-label="Global search">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input aria-label="Search EChat" className="field h-10 !pl-10 !pr-10" placeholder="Search people or posts" value={query} onChange={event => setQuery(event.target.value)} />
          <button type="submit" aria-label="Search" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md hover:bg-brand-100"><ArrowUpRight size={15} /></button>
        </form>
        <div className="flex items-center gap-0.5 sm:gap-1.5">
          <Link to="/saved" className="icon-button md:hidden" aria-label="Saved posts" title="Saved posts"><Bookmark size={19} /></Link>
          <ThemeToggle />
          <Link to="/notifications" className="icon-button relative" aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'} title="Notifications">
            <Bell size={19} />{unreadNotifications > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-surface" />}
          </Link>
          <button type="button" onClick={onOpenCreatePost} className="icon-button md:hidden" aria-label="Create post" title="Create post"><Plus size={22} /></button>
        </div>
      </div>
    </header>
  );
}
