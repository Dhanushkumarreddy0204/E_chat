import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Image,
  Smile,
  Check,
  CheckCheck,
  ChevronLeft,
  Loader2,
  Paperclip,
  MoreVertical,
  Zap,
} from 'lucide-react';
import { useClipFlow } from '../../context/ClipFlowContext';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { uploadApi } from '../../api/upload';
import { Avatar } from '../common/Avatar';

export const ChatWindow = ({ onBack }) => {
  const { user } = useAuth();
  const { activeConversation, messages, sendMessage, reactToMessage, loadingMessages } = useChat();
  const { isUserOnline, typingUsers, sendTyping } = useSocket();
  const { isClipFlowEnabledFor, toggleClipFlow } = useClipFlow();

  const clipFlowEnabled = activeConversation ? isClipFlowEnabledFor(activeConversation.id) : false;

  const [inputContent, setInputContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(null); // messageId for emoji reaction

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  if (!activeConversation) {
    return (
      <div className="hidden md:flex flex-1 h-full items-center justify-center">
        <div className="text-center space-y-3 p-8 max-w-sm">
          <div className="w-16 h-16 rounded-xl bg-brand-500 mx-auto flex items-center justify-center">
            <Send className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-brand-900">Your Messages</h3>
          <p className="text-xs text-brand-700">
            Send private messages, share photos, react with emojis, and chat in real-time with friends.
          </p>
        </div>
      </div>
    );
  }

  const isGroup = activeConversation.is_group;
  const otherUser = !isGroup ? activeConversation.participants.find(p => p.id !== user?.id) : null;
  const isOnline = otherUser ? isUserOnline(otherUser.id) : false;
  const title = isGroup ? activeConversation.group_name : (otherUser?.full_name || 'Chat');
  const subtitle = isGroup 
    ? `${activeConversation.participants.length} members` 
    : (isOnline ? 'Online' : 'Offline');

  const typingInThisChat = (typingUsers[activeConversation.id] || []).filter(id => id !== user?.id);

  const handleInputChange = (e) => {
    setInputContent(e.target.value);

    // Broadcast typing event
    const recipientIds = activeConversation.participants.map(p => p.id);
    sendTyping(activeConversation.id, recipientIds, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(activeConversation.id, recipientIds, false);
    }, 2000);
  };

  const handleFileAttach = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputContent.trim() && !mediaFile) return;

    try {
      setIsSending(true);
      let mediaUrl = null;
      let mediaType = 'text';

      if (mediaFile) {
        const uploadRes = await uploadApi.uploadFile(mediaFile);
        mediaUrl = uploadRes.url;
        mediaType = uploadRes.media_type;
      }

      await sendMessage(inputContent.trim(), mediaUrl, mediaType);
      
      setInputContent('');
      setMediaFile(null);
      setMediaPreview(null);
      
      const recipientIds = activeConversation.participants.map(p => p.id);
      sendTyping(activeConversation.id, recipientIds, false);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col relative bg-white">
      {/* Chat Header */}
      <div className="p-3 sm:p-3.5 px-3 sm:px-4 border-b border-brand-200 flex items-center justify-between bg-white/95 backdrop-blur-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button 
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 rounded-lg text-brand-700 hover:text-brand-900"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Avatar
            src={isGroup ? activeConversation.group_avatar : otherUser?.avatar_url}
            alt={title}
            size="md"
            isOnline={isOnline}
            showOnlineStatus={!isGroup}
            className="shrink-0"
          />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-brand-900 truncate">{title}</h3>
            <p className={`text-[11px] truncate ${isOnline ? 'text-emerald-500 font-medium' : 'text-brand-600'}`}>
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* ClipFlow toggle */}
          <button
            id={`clipflow-toggle-${activeConversation?.id}`}
            onClick={() => activeConversation && toggleClipFlow(activeConversation.id)}
            title={clipFlowEnabled ? 'ClipFlow ON — tap to disable' : 'ClipFlow OFF — tap to enable'}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
              clipFlowEnabled
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-400/40'
                : 'bg-brand-100 text-brand-500 hover:bg-brand-200'
            }`}
          >
            <Zap className={`w-3 h-3 ${clipFlowEnabled ? 'fill-white' : ''}`} />
            <span>ClipFlow</span>
          </button>

          <button className="p-2 text-brand-700 hover:text-brand-900 rounded-lg hover:bg-brand-50">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
        {loadingMessages && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          const time = format(new Date(msg.created_at), 'hh:mm a');

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                <Avatar
                  src={msg.sender?.avatar_url}
                  alt={msg.sender?.full_name}
                  size="xs"
                />
              )}

              <div className="relative max-w-[82%] sm:max-w-md space-y-1">
                {/* Bubble */}
                <div
                  className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md relative ${
                    isMe
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-br-none'
                      : 'bg-brand-50/90 text-brand-900 border border-brand-200/60 rounded-bl-none'
                  }`}
                >
                  {/* Sender Name in Groups */}
                  {isGroup && !isMe && msg.sender && (
                    <p className="text-[10px] font-bold text-brand-300 mb-1">
                      {msg.sender.username}
                    </p>
                  )}

                  {/* Media Attachment */}
                  {msg.media_url && (
                    <div className="rounded-xl overflow-hidden mb-2 max-h-60">
                      {msg.message_type === 'video' ? (
                        <video src={msg.media_url} controls className="w-full h-full object-cover" />
                      ) : msg.message_type === 'audio' ? (
                        <audio src={msg.media_url} controls className="max-w-full" />
                      ) : msg.message_type === 'image' ? (
                        <img src={msg.media_url} alt="Attachment" className="w-full h-full object-cover" />
                      ) : (
                        <a href={msg.media_url} target="_blank" rel="noreferrer" className="underline">
                          {msg.media_name || 'Open attachment'}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Text Content */}
                  {msg.content && <p className="whitespace-pre-line">{msg.content}</p>}

                  {/* Time and Read Status */}
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-brand-200' : 'text-brand-700'}`}>
                    <span>{time}</span>
                    {isMe && (
                      <CheckCheck className="w-3 h-3 text-brand-200" />
                    )}
                  </div>
                </div>

                {/* Emoji Reactions Badge */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className={`flex gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {msg.reactions.map((r, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded-full bg-white/90 border border-brand-200 text-[10px] shadow-sm">
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Reaction Button on Hover */}
                <div className={`absolute top-0 ${isMe ? '-left-8' : '-right-8'} hidden group-hover:flex items-center gap-1`}>
                  <button
                    onClick={() => setShowEmojiMenu(showEmojiMenu === msg.id ? null : msg.id)}
                    className="p-1 rounded-full bg-brand-50 text-brand-700 hover:text-brand-800"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Emoji Menu Popover */}
                {showEmojiMenu === msg.id && (
                  <div className={`absolute -top-9 ${isMe ? 'right-0' : 'left-0'} z-20 flex gap-1 p-1 bg-white border border-brand-200 rounded-full shadow-2xl animate-fade-in`}>
                    {['👍', '❤️', '🔥', '😂', '😮', '🚀'].map((em) => (
                      <button
                        key={em}
                        onClick={() => { reactToMessage(msg.id, em); setShowEmojiMenu(null); }}
                        className="text-sm hover:scale-125 transition-transform px-1"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {typingInThisChat.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-brand-700 italic py-1">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.4s]" />
            </span>
            <span>Typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Media Preview before send */}
      {mediaPreview && (
        <div className="px-4 py-2 bg-white/90 border-t border-brand-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {mediaFile?.type.startsWith('image/') ? (
              <img src={mediaPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-brand-200" />
            ) : mediaFile?.type.startsWith('video/') ? (
              <video src={mediaPreview} controls className="w-12 h-12 rounded-lg object-cover border border-brand-200" />
            ) : mediaFile?.type.startsWith('audio/') ? (
              <audio src={mediaPreview} controls className="max-w-[180px]" />
            ) : (
              <Paperclip className="w-5 h-5 text-brand-700 shrink-0" />
            )}
            <span className="text-xs text-brand-800 font-medium truncate max-w-xs">{mediaFile?.name}</span>
          </div>
          <button 
            onClick={() => { setMediaFile(null); setMediaPreview(null); }}
            className="text-xs text-brand-600 hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Message Input Footer */}
      <form onSubmit={handleSend} className="p-2.5 sm:p-3 px-3 sm:px-4 border-t border-brand-200 bg-white/95 flex items-center gap-2">
        <label className="p-2 text-brand-700 hover:text-brand-900 rounded-full hover:bg-brand-50 cursor-pointer transition-colors shrink-0">
          <Image className="w-5 h-5" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,video/x-m4v,audio/mpeg,audio/wav,audio/ogg,audio/mp4,.pdf,.zip,.doc,.docx,.txt"
            onChange={handleFileAttach}
            className="hidden"
          />
        </label>

        <input
          type="text"
          placeholder="Type a message..."
          value={inputContent}
          onChange={handleInputChange}
          className="flex-1 bg-brand-50/80 border border-brand-200 rounded-full py-2 sm:py-2.5 px-4 text-xs sm:text-sm text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
        />

        <button
          type="submit"
          disabled={isSending || (!inputContent.trim() && !mediaFile)}
          className="p-2.5 rounded-full bg-brand-500 text-white hover:bg-brand-600 hover:scale-105 active:scale-95 disabled:opacity-40 transition-all shrink-0"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};
