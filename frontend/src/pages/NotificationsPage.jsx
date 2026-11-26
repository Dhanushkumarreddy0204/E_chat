import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, CircleAlert, Heart, MessageCircle, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationsApi } from '../api/notifications';
import { useSocket } from '../context/SocketContext';
import { Avatar } from '../components/common/Avatar';
import { PageSkeleton, PageState } from '../components/common/PageState';

const icons = { like_post: Heart, comment_post: MessageCircle, message: MessageCircle, follow: UserPlus };

export function NotificationsPage() {
  const navigate = useNavigate();
  const { latestNotification, setUnreadNotifications } = useSocket();
  const [notifications, setNotifications] = useState(null);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let active = true;
    setError('');
    notificationsApi.getNotifications(50).then(data => {
      if (active) setNotifications(previous => {
        const known = new Set(data.map(item => item.id));
        return [...(previous || []).filter(item => !known.has(item.id)), ...data];
      });
    }).catch(() => { if (active) setError('Could not load activity.'); });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    if (latestNotification) setNotifications(previous =>
      previous?.some(item => item.id === latestNotification.id) ? previous : [latestNotification, ...(previous || [])]);
  }, [latestNotification]);

  async function markAll() {
    setPending(true);
    setError('');
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(previous => previous.map(item => ({ ...item, is_read: true })));
      setUnreadNotifications(0);
    } catch {
      setError('Could not mark activity as read.');
    } finally {
      setPending(false);
    }
  }

  async function open(item) {
    if (!item.is_read) {
      try {
        await notificationsApi.markAsRead(item.id);
        setNotifications(previous => previous.map(notif => notif.id === item.id ? { ...notif, is_read: true } : notif));
        setUnreadNotifications(previous => Math.max(0, previous - 1));
      } catch {
        setError('Could not mark this notification as read.');
      }
    }
    if (item.notification_type === 'message') navigate('/messages');
    else if (item.entity_type === 'post' && item.entity_id) navigate(`/post/${item.entity_id}`);
    else if (item.entity_type === 'user' && item.sender?.username) navigate(`/profile/${item.sender.username}`);
  }

  const visible = notifications?.filter(item => filter === 'all' || !item.is_read);
  return (
    <div className="page-stack feed-page">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2"><h1 className="page-title">Notifications</h1><p className="text-sm text-text-secondary">Activity from people you connect with.</p></div>
        <button type="button" className="pill-button secondary-button disabled:opacity-50" onClick={markAll}
          disabled={pending || !notifications?.some(item => !item.is_read)}><CheckCheck size={17} /> Mark all read</button>
      </header>
      <nav className="flex gap-2" aria-label="Notification filter">
        {['all', 'unread'].map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
          className={`pill-button ${filter === value ? 'primary-button' : 'secondary-button'}`}>{value === 'all' ? 'All activity' : 'Unread'}</button>)}
      </nav>
      {error && <PageState icon={CircleAlert} title={error} action="Retry" onAction={() => setRetry(value => value + 1)} />}
      {!error && !notifications ? <PageSkeleton label="Loading activity" /> : null}
      {visible?.length ? <ul className="panel divide-y divide-border overflow-hidden">
        {visible.map(item => {
          const Icon = icons[item.notification_type] || Bell;
          return <li key={item.id}>
            <button type="button" onClick={() => open(item)}
              className={`flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-brand-50 sm:px-5 ${item.is_read ? '' : 'bg-brand-50'}`}>
              <span className="relative shrink-0"><Avatar src={item.sender?.avatar_url} alt={item.sender?.full_name} size="md" />
                <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-surface text-brand-400 ring-1 ring-border"><Icon size={12} /></span>
              </span>
              <span className="min-w-0 flex-1"><span className="block break-words text-sm">{item.content}</span>
                <span className="mt-1 block text-xs text-text-secondary">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span></span>
              {!item.is_read && <span aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-brand-400" />}
            </button>
          </li>;
        })}
      </ul> : notifications && <PageState icon={Bell} title={filter === 'unread' ? 'No unread notifications' : 'No activity yet'}
        description="New activity will appear here." />}
    </div>
  );
}
