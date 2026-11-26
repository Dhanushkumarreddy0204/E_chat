import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, Search, Users } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from '../common/Avatar';
import { PageSkeleton } from '../common/PageState';

const attachmentNames = { image: 'Photo', video: 'Video', audio: 'Audio', file: 'Attachment' };

export function ChatSidebar({ onOpenCreateGroup }) {
  const { user } = useAuth();
  const { conversations, activeConversation, setActiveConversation, loadingConversations } = useChat();
  const { isUserOnline } = useSocket();
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const rows = conversations.map(conversation => {
    const peer = conversation.participants.find(person => person.id !== user?.id);
    return {
      conversation, peer,
      name: conversation.is_group ? conversation.group_name || 'Group chat' : peer?.full_name || 'Conversation',
      avatar: conversation.is_group ? conversation.group_avatar : peer?.avatar_url,
    };
  }).filter(({ name, peer }) => name.toLowerCase().includes(term) || peer?.username?.toLowerCase().includes(term));

  return (
    <section className="flex h-full w-full flex-col bg-surface md:border-r md:border-border" aria-label="Conversation list">
      <header className="space-y-4 px-4 pb-3 pt-5 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-[34px] leading-none tracking-[-.05em]">Messages</h1>
          <button type="button" className="icon-button !bg-brand-100" onClick={onOpenCreateGroup} aria-label="New group chat" title="New group chat"><Users size={18} /></button>
        </div>
        <label className="relative block">
          <span className="sr-only">Search conversations</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={query} onChange={event => setQuery(event.target.value)} className="field !pl-9" placeholder="Search conversations" />
        </label>
      </header>
      <div className="space-y-1 overflow-y-auto px-3 pb-4">
        {loadingConversations && !rows.length ? <PageSkeleton label="Loading conversations" /> :
          !rows.length ? <div className="px-3 py-10 text-center text-sm text-text-secondary">
            <Clock3 size={24} className="mx-auto mb-3 text-brand-400" />
            <p>{query ? 'No matching conversations.' : 'Your conversations will appear here.'}</p>
            {!query && <Link to="/explore?tab=people" className="pill-button secondary-button mt-3">Find people</Link>}
          </div> : rows.map(({ conversation, peer, name, avatar }) => {
            const last = conversation.last_message;
            const selected = activeConversation?.id === conversation.id;
            const timestamp = new Date(conversation.updated_at);
            return (
              <button key={conversation.id} type="button" onClick={() => setActiveConversation(conversation)}
                aria-pressed={selected} className={`chat-row ${selected ? 'chat-row-selected' : ''}`}>
                <Avatar src={avatar} alt={name} className="shrink-0" isOnline={peer && isUserOnline(peer.id)} showOnlineStatus={!conversation.is_group} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{name}</span>
                    {Number.isFinite(+timestamp) && <span className="shrink-0 text-[10px] text-text-secondary">{formatDistanceToNowStrict(timestamp)}</span>}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{last?.content || attachmentNames[last?.message_type] || 'New conversation'}</span>
                    {conversation.unread_count > 0 && <span className="badge">{conversation.unread_count}</span>}
                  </span>
                </span>
              </button>
            );
          })}
      </div>
    </section>
  );
}
