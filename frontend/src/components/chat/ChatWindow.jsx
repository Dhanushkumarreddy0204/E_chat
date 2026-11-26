import { useState, useEffect, useRef } from 'react';
import { mediaUrl as resolveMediaUrl } from '../../api/urls';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Smile,
  Check,
  CheckCheck,
  ChevronLeft,
  Loader2,
  Paperclip,
  Zap,
} from 'lucide-react';
import { useClipFlow } from '../../context/ClipFlowContext';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { uploadApi } from '../../api/upload';
import { Avatar } from '../common/Avatar';
import { PageSkeleton } from '../common/PageState';

export const ChatWindow = ({ onBack }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeConversation, messages, sendMessage, reactToMessage, loadingMessages } = useChat();
  const { isUserOnline, typingUsers, sendTyping } = useSocket();
  const { isClipFlowEnabledFor, toggleClipFlow, triggeringConvId, shouldRestoreClips } = useClipFlow();

  const clipFlowEnabled = activeConversation ? isClipFlowEnabledFor(activeConversation.id) : false;
  const isClipFlowTriggered = Boolean(
    (triggeringConvId && activeConversation && triggeringConvId === activeConversation.id) ||
    shouldRestoreClips
  );

  const [inputContent, setInputContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
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
    messagesEndRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }, [messages, typingUsers]);

  if (!activeConversation) {
    return (
      <div className="hidden md:flex flex-1 h-full items-center justify-center bg-brand-50">
        <div className="text-center space-y-3 p-8 max-w-sm">
          <div className="w-16 h-16 rounded-xl bg-brand-500 mx-auto flex items-center justify-center">
            <Send className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-display text-3xl tracking-tight text-text">Your messages</h3>
          <p className="text-xs text-brand-700">
            Choose a conversation to start chatting.
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
    sendTyping(activeConversation.id, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(activeConversation.id, false);
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
      setSendError('');
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
      
      sendTyping(activeConversation.id, false);

      // Automatically return directly to Clips if user arrived here via ClipFlow
      if (isClipFlowTriggered) {
        navigate('/clips');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setSendError(typeof detail === 'string' ? detail : 'Could not send your message. Try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col relative bg-surface">
      {/* Chat Header */}
      <div className="flex min-h-[64px] items-center justify-between gap-2 border-b border-border bg-surface px-3 sm:px-5">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button 
            onClick={onBack}
            aria-label="Back to conversations"
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
            <p className={`text-[11px] truncate ${isOnline ? 'text-brand-400 font-medium' : 'text-brand-600'}`}>
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Back to Clips button when ClipFlow was triggered */}
          {isClipFlowTriggered && (
            <button
              onClick={() => navigate('/clips')}
              className="pill-button primary-button !min-h-9 !text-xs"
              title="Return to your saved position on Clips"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Clips</span>
            </button>
          )}

          {/* ClipFlow toggle */}
          <button
            id={`clipflow-toggle-${activeConversation?.id}`}
            onClick={() => activeConversation && toggleClipFlow(activeConversation.id)}
            aria-pressed={clipFlowEnabled}
            title={clipFlowEnabled ? 'ClipFlow ON — tap to disable' : 'ClipFlow OFF — tap to enable'}
            className={`pill-button !min-h-9 !px-2.5 !text-[11px] ${
              clipFlowEnabled
                ? 'primary-button'
                : 'secondary-button'
            }`}
          >
            <Zap className={`w-3 h-3 ${clipFlowEnabled ? 'fill-white' : ''}`} />
            <span>ClipFlow</span>
          </button>

        </div>
      </div>

      {/* ClipFlow active banner */}
      {isClipFlowTriggered && (
        <div className="bg-brand-50 border-b border-brand-200 px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs text-brand-800">
          <div className="flex items-center gap-1.5 min-w-0">
            <Zap className="w-3.5 h-3.5 text-brand-600 fill-brand-500 shrink-0" />
            <span className="truncate">Reply to return to your clip.</span>
          </div>
          <button
            onClick={() => navigate('/clips')}
            className="text-brand-600 font-bold hover:underline shrink-0 ml-2"
          >
            Return now
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="chat-history flex-1 overflow-y-auto px-3 py-5 sm:px-6 space-y-4">
        {loadingMessages && (
          <PageSkeleton label="Loading messages" />
        )}

        {!loadingMessages && !messages.length && <p className="py-10 text-center text-sm text-text-secondary">Start the conversation with a message.</p>}
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

              <div className="relative max-w-[76%] sm:max-w-md space-y-1">
                {/* Bubble */}
                <div
                  className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md relative ${
                    isMe
                      ? 'bg-brand-500 text-white rounded-br-md'
                      : 'bg-surface text-text border border-brand-200/60 rounded-bl-md'
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
                        <video src={resolveMediaUrl(msg.media_url)} controls className="w-full h-full object-cover" />
                      ) : msg.message_type === 'audio' ? (
                        <audio src={resolveMediaUrl(msg.media_url)} controls className="max-w-full" />
                      ) : msg.message_type === 'image' ? (
                        <img src={resolveMediaUrl(msg.media_url)} alt="Attachment" className="w-full h-full object-cover" />
                      ) : (
                        <a href={resolveMediaUrl(msg.media_url)} target="_blank" rel="noreferrer" className="underline">
                          {msg.media_name || 'Open attachment'}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Text Content */}
                  {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                  {/* Time and Read Status */}
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-white/85' : 'text-brand-700'}`}>
                    <span>{time}</span>
                    {isMe && (msg.read_by?.some(id => id !== user.id)
                      ? <CheckCheck className="w-3 h-3 text-white/85" aria-label="Read" />
                      : <Check className="w-3 h-3 text-white/85" aria-label="Sent" />)}
                  </div>
                </div>

                {/* Emoji Reactions Badge */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className={`flex gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {msg.reactions.map((r, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded-full bg-surface/90 border border-brand-200 text-[10px] shadow-sm">
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Reaction Button on Hover */}
                <div className={`absolute bottom-0 ${isMe ? '-left-9' : '-right-9'} flex items-center gap-1`}>
                  <button
                    aria-label="React to message"
                    aria-expanded={showEmojiMenu === msg.id}
                    onClick={() => setShowEmojiMenu(showEmojiMenu === msg.id ? null : msg.id)}
                    className="icon-button !min-h-8 !min-w-8 !rounded-full"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Emoji Menu Popover */}
                {showEmojiMenu === msg.id && (
                  <div className={`absolute -top-9 ${isMe ? 'right-0' : 'left-0'} z-20 flex gap-1 p-1 bg-surface border border-brand-200 rounded-full shadow-2xl`}>
                    {['👍', '❤️', '🔥', '😂', '😮', '🚀'].map((em) => (
                      <button
                        key={em}
                        onClick={() => { reactToMessage(msg.id, em); setShowEmojiMenu(null); }}
                        className="icon-button !min-h-8 !min-w-8 text-sm"
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
        <div className="px-4 py-2 bg-surface/90 border-t border-brand-200 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
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
      {sendError && <p className="form-error mx-3 mb-1" role="alert">{sendError}</p>}
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border bg-surface p-3 sm:px-5">
        <button type="button" className="icon-button" aria-label="Attach file" onClick={() => fileInputRef.current?.click()}><Paperclip size={19} /></button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,video/x-m4v,audio/mpeg,audio/wav,audio/ogg,audio/mp4,.pdf,.zip,.doc,.docx,.txt"
            onChange={handleFileAttach}
            className="hidden"
          />
        <input
          type="text"
          aria-label="Type a message"
          placeholder="Type a message..."
          value={inputContent}
          onChange={handleInputChange}
          className="field flex-1"
        />

        <button
          type="submit"
          aria-label="Send message"
          disabled={isSending || (!inputContent.trim() && !mediaFile)}
          className="pill-button primary-button !px-3 disabled:opacity-40"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};
