import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Send, Pause, Play, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { storiesApi } from '../../api/stories';
import { chatApi } from '../../api/chat';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';

export const StoryViewerModal = ({ storyGroups, initialGroupIndex = 0, onClose, onStoryDeleted }) => {
  const { user: currentUser } = useAuth();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [reactedEmoji, setReactedEmoji] = useState(null);

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  const timerRef = useRef(null);

  // Mark story as viewed on open
  useEffect(() => {
    if (currentStory && currentUser) {
      storiesApi.markStoryViewed(currentStory.id).catch(console.error);
    }
    setProgress(0);
  }, [groupIndex, storyIndex, currentStory, currentUser]);

  // Story progress timer
  useEffect(() => {
    if (!currentStory || isPaused) return;

    const duration = (currentStory.duration_seconds || 5) * 1000;
    const intervalMs = 50;
    const increment = (intervalMs / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => clearInterval(timerRef.current);
  }, [groupIndex, storyIndex, currentStory, isPaused]);

  const handleNextStory = () => {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
      setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex(prev => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex(prev => prev - 1);
      const prevGroup = storyGroups[groupIndex - 1];
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  };

  const handleEmojiReaction = async (emoji) => {
    if (!currentStory) return;
    try {
      setReactedEmoji(emoji);
      await storiesApi.reactToStory(currentStory.id, emoji);
      setTimeout(() => setReactedEmoji(null), 1500);
    } catch (err) {
      console.error('Error reacting to story:', err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory || !currentGroup) return;

    try {
      // Create conversation and send reply
      const conv = await chatApi.createOrGetConversation([currentGroup.user.id], false);
      await chatApi.sendMessage({
        conversation_id: conv.id,
        content: `Replied to your story: "${replyText.trim()}"`,
        message_type: 'text',
        media_url: currentStory.media_url,
      });
      setReplyText('');
      setReactedEmoji('🚀 Sent!');
      setTimeout(() => setReactedEmoji(null), 1500);
    } catch (err) {
      console.error('Error sending story reply:', err);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    if (!window.confirm('Delete this story?')) return;
    try {
      await storiesApi.deleteStory(currentStory.id);
      if (onStoryDeleted) onStoryDeleted();
      handleNextStory();
    } catch (err) {
      console.error('Error deleting story:', err);
    }
  };

  if (!currentGroup || !currentStory) return null;

  const isOwner = currentUser && currentUser.id === currentGroup.user.id;
  const timeAgo = formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true });

  return (
    <div className="fixed inset-0 z-50 bg-black/90 sm:bg-black/95 backdrop-blur-md flex items-center justify-center select-none p-2 sm:p-4">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 sm:top-5 right-4 sm:right-5 z-50 p-2 sm:p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Prev Navigation Button */}
      <button
        onClick={handlePrevStory}
        className="hidden md:flex absolute left-8 z-40 p-3 rounded-full bg-black/60 text-white hover:bg-black/80 hover:scale-110 transition-all"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Story Card Container */}
      <div 
        className="relative w-full max-w-sm sm:max-w-md h-[88vh] sm:h-[90vh] max-h-[780px] rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl"
        style={{ backgroundColor: currentStory.background_color || '#000000' }}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress Bars Header */}
        <div className="absolute top-0 left-0 right-0 z-30 p-3 space-y-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex gap-1">
            {currentGroup.stories.map((s, idx) => {
              let fill = 0;
              if (idx < storyIndex) fill = 100;
              else if (idx === storyIndex) fill = progress;

              return (
                <div key={s.id || idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                    style={{ width: `${fill}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Author Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar src={currentGroup.user.avatar_url} alt={currentGroup.user.full_name} size="sm" />
              <div>
                <p className="text-xs font-bold text-white leading-tight">{currentGroup.user.username}</p>
                <p className="text-[10px] text-white/70">{timeAgo}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isOwner && (
                <button 
                  onClick={handleDeleteStory}
                  className="p-1.5 rounded-full bg-brand-500/20 text-brand-300 hover:bg-brand-500/40"
                  title="Delete Story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={() => setIsPaused(!isPaused)} 
                className="p-1.5 text-white/80 hover:text-white"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Media Content */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {currentStory.media_type === 'video' ? (
            <video 
              src={currentStory.media_url} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-contain"
            />
          ) : (
            <img 
              src={currentStory.media_url} 
              alt="Story" 
              className="w-full h-full object-contain"
            />
          )}

          {/* Floating Reaction Animation Overlay */}
          {reactedEmoji && (
            <div className="absolute inset-0 flex items-center justify-center z-40 animate-bounce">
              <span className="text-6xl filter drop-shadow-lg">{reactedEmoji}</span>
            </div>
          )}

          {/* Caption text */}
          {currentStory.caption && (
            <div className="absolute bottom-24 left-4 right-4 z-20 text-center">
              <span className="inline-block px-4 py-2 rounded-xl bg-black/60 text-white text-xs sm:text-sm font-medium backdrop-blur-xs">
                {currentStory.caption}
              </span>
            </div>
          )}

          {/* Invisible tap targets for navigation on mobile */}
          <div className="absolute top-16 bottom-20 left-0 w-1/3 z-10" onClick={handlePrevStory} />
          <div className="absolute top-16 bottom-20 right-0 w-1/3 z-10" onClick={handleNextStory} />
        </div>

        {/* Footer Actions: Emoji reactions & Reply box */}
        {!isOwner && (
          <div className="relative z-30 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-2">
            {/* Quick Emoji Bar */}
            <div className="flex justify-around py-1">
              {['❤️', '🔥', '😂', '👏', '😍', '🚀'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiReaction(emoji)}
                  className="text-xl hover:scale-125 active:scale-95 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Reply to ${currentGroup.user.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-white/20 border border-white/30 rounded-full py-2 px-4 text-xs text-white placeholder-white/70 focus:outline-none focus:border-brand-400"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="p-2 rounded-full bg-brand-500 text-white disabled:opacity-40 hover:bg-brand-600 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Next Navigation Button */}
      <button
        onClick={handleNextStory}
        className="hidden md:flex absolute right-8 z-40 p-3 rounded-full bg-black/60 text-white hover:bg-black/80 hover:scale-110 transition-all"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};
