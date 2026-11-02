import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Sparkles, 
  CheckCheck, 
  Loader2 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationsApi } from '../api/notifications';
import { useSocket } from '../context/SocketContext';
import { Avatar } from '../components/common/Avatar';

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { latestNotification, setUnreadNotifications } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.getNotifications(50);
      setNotifications(data);
      setUnreadNotifications(0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen to incoming live notification
  useEffect(() => {
    if (latestNotification) {
      setNotifications(prev => [latestNotification, ...prev]);
    }
  }, [latestNotification]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotifications(0);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await notificationsApi.markAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }

    if (notif.notification_type === 'message') {
      navigate('/messages');
    } else if (notif.entity_type === 'user') {
      navigate(`/profile/${notif.sender?.username}`);
    } else if (notif.entity_type === 'post') {
      navigate('/');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'like_post':
        return <Heart className="w-4 h-4 text-brand-500 fill-brand-500" />;
      case 'comment_post':
        return <MessageCircle className="w-4 h-4 text-brand-400" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-cyan-400" />;
      case 'story_reaction':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-brand-600" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-4 px-3 sm:px-4 space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-white shadow-sm border border-brand-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-500 text-white">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-brand-900">Notifications</h2>
            <p className="text-xs text-brand-700">Activity and alerts from your network</p>
          </div>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-3.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-xs font-semibold text-brand-800 flex items-center gap-1.5 transition-colors"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Mark all read</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="rounded-xl bg-white shadow-sm border border-brand-100 overflow-hidden divide-y divide-slate-800/40">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-xs text-brand-600 space-y-2">
            <Bell className="w-8 h-8 mx-auto text-brand-500" />
            <p>No notifications yet. You're all caught up! ✨</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 flex items-center gap-3.5 cursor-pointer transition-colors ${
                notif.is_read ? 'hover:bg-brand-50/40' : 'bg-brand-600/10 hover:bg-brand-600/15'
              }`}
            >
              <div className="relative">
                <Avatar src={notif.sender?.avatar_url} alt={notif.sender?.full_name} size="md" />
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white border border-brand-200">
                  {getIcon(notif.notification_type)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-brand-900 leading-snug">
                  <strong className="font-bold text-brand-900 mr-1">{notif.sender?.full_name}</strong>
                  {notif.content}
                </p>
                <span className="text-[10px] text-brand-600">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </span>
              </div>

              {!notif.is_read && (
                <div className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
