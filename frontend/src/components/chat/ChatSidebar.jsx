import React, { useState } from 'react';
import { Search, Plus, Users, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from '../common/Avatar';

export const ChatSidebar = ({ onOpenCreateGroup }) => {
  const { user } = useAuth();
  const { conversations, activeConversation, setActiveConversation, loadingConversations } = useChat();
  const { isUserOnline } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(c => {
    if (c.is_group) {
      return c.group_name?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    const other = c.participants.find(p => p.id !== user?.id);
    return other?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           other?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full h-full flex flex-col border-r border-brand-200 bg-white">
      {/* Header */}
      <div className="p-4 border-b border-brand-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-bold text-brand-900">Messages</h2>
        </div>
        <button
          onClick={onOpenCreateGroup}
          title="New Group Chat"
          className="p-2 rounded-xl bg-brand-50 text-brand-800 hover:text-brand-900 hover:bg-brand-100 transition-colors"
        >
          <Users className="w-4 h-4" />
        </button>
      </div>

      {/* Search Conversations */}
      <div className="p-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-50/70 border border-brand-200 rounded-xl py-2 pl-9 pr-4 text-xs text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500"
          />
          <Search className="w-4 h-4 text-brand-600 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {loadingConversations && conversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-brand-600">Loading chats...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-brand-600">
            No conversations found. Search a user to start chatting! 💬
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isGroup = conv.is_group;
            const otherUser = !isGroup ? conv.participants.find(p => p.id !== user?.id) : null;
            const isOnline = otherUser ? isUserOnline(otherUser.id) : false;
            const isSelected = activeConversation?.id === conv.id;

            const title = isGroup ? conv.group_name : (otherUser?.full_name || 'Chat');
            const avatarSrc = isGroup ? conv.group_avatar : otherUser?.avatar_url;
            const lastMessageText = conv.last_message ? (
              conv.last_message.message_type === 'image' ? '📷 Image' :
              conv.last_message.message_type === 'video' ? '🎥 Video' :
              conv.last_message.content
            ) : 'Started a conversation';

            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-brand-600/15 border-l-4 border-brand-500' 
                    : 'hover:bg-white/60'
                }`}
              >
                <Avatar
                  src={avatarSrc}
                  alt={title}
                  size="md"
                  isOnline={isOnline}
                  showOnlineStatus={!isGroup}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-brand-900 truncate">{title}</h4>
                    {conv.updated_at && (
                      <span className="text-[10px] text-brand-600 shrink-0">
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-[11px] truncate ${conv.unread_count > 0 ? 'text-brand-900 font-semibold' : 'text-brand-700'}`}>
                      {lastMessageText}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-pink-500 text-white shrink-0 ml-1">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
