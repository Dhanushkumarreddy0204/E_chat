import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Send, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { mediaUrl } from '../../api/urls';
import { storiesApi } from '../../api/stories';
import { chatApi } from '../../api/chat';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { ModalFrame } from '../common/ModalFrame';

export function StoryViewerModal({ storyGroups, initialGroupIndex = 0, onClose, onStoryDeleted }) {
  const { user } = useAuth();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const video = useRef(null);

  const group = storyGroups[groupIndex];
  const story = group?.stories[storyIndex];
  const isOwner = user?.id === group?.user.id;
  const canGoBack = storyIndex > 0 || groupIndex > 0;

  const next = useCallback(() => {
    setProgress(0);
    setReply('');
    setNotice('');
    if (storyIndex + 1 < group.stories.length) setStoryIndex(storyIndex + 1);
    else if (groupIndex + 1 < storyGroups.length) {
      setStoryIndex(0);
      setGroupIndex(groupIndex + 1);
    } else onClose();
  }, [storyIndex, group, groupIndex, storyGroups.length, onClose]);

  function previous() {
    if (!canGoBack) return;
    setProgress(0);
    setReply('');
    setNotice('');
    if (storyIndex > 0) setStoryIndex(storyIndex - 1);
    else {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(storyGroups[groupIndex - 1].stories.length - 1);
    }
  }

  useEffect(() => {
    if (story?.id) storiesApi.markStoryViewed(story.id).catch(() => {});
  }, [story?.id]);

  useEffect(() => {
    if (!story || paused || busy || deleting) return;
    const increment = 100 / (Math.max(1, story.duration_seconds || 5) * 1000);
    const timer = setInterval(() => setProgress(value => Math.min(value + increment, 1)), 100);
    return () => clearInterval(timer);
  }, [story, paused, busy, deleting]);

  useEffect(() => {
    if (progress >= 1) next();
  }, [progress, next]);

  useEffect(() => {
    if (!video.current) return;
    if (paused || busy || deleting) video.current.pause();
    else video.current.play().catch(() => {});
  }, [story, paused, busy, deleting]);

  async function interact(action, success) {
    setBusy(true);
    setNotice('');
    try {
      await action();
      setNotice(success);
      return true;
    } catch {
      setNotice('Could not complete this action. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!story) return null;
  const hasMedia = Boolean(story.media_url);
  return (
    <ModalFrame label="Story viewer" onClose={onClose} immersive>
      <div className="story-stage" onKeyDown={event => {
        if (event.target instanceof HTMLInputElement) return;
        if (event.key === 'ArrowLeft') previous();
        if (event.key === 'ArrowRight') next();
      }} style={{ background: story.background_color || '#22392d' }}>
        <div className="story-shade" aria-hidden="true" />
        {hasMedia && (story.media_type === 'video' ? <video key={story.id} ref={video} src={mediaUrl(story.media_url)}
          muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-contain" /> :
          <img src={mediaUrl(story.media_url)} alt={story.caption || 'Story photo'} className="absolute inset-0 h-full w-full object-contain" />)}
        <header className="absolute inset-x-0 top-0 z-[2] p-3 sm:p-4">
          <div className="mb-3 flex gap-1" role="progressbar" aria-label="Story progress" aria-valuenow={Math.round(progress * 100)}>
            {group.stories.map((item, index) => <span key={item.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/40">
              <span className="block h-full origin-left rounded-full bg-white" style={{ transform: `scaleX(${index < storyIndex ? 1 : index === storyIndex ? progress : 0})` }} />
            </span>)}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <Avatar src={group.user.avatar_url} alt={group.user.full_name} size="sm" className="shrink-0" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{group.user.full_name}</p>
              <p className="text-xs text-white/80">{formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}</p></div>
            {isOwner && <button type="button" className="story-icon" aria-label="Delete story" onClick={() => { setPaused(true); setDeleting(true); }}><Trash2 size={17} /></button>}
            <button type="button" className="story-icon" aria-label={paused ? 'Resume story' : 'Pause story'}
              onClick={() => setPaused(!paused)}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>
            <button type="button" className="story-icon" aria-label="Close" onClick={onClose}><X size={20} /></button>
          </div>
        </header>
        {!hasMedia && <p className="absolute inset-0 grid place-items-center break-words px-12 text-center font-display text-3xl tracking-tight">{story.caption}</p>}
        <div className="pointer-events-none absolute inset-x-2 top-1/2 z-[1] flex -translate-y-1/2 justify-between">
          <button type="button" className="story-icon pointer-events-auto disabled:invisible" aria-label="Previous story" disabled={!canGoBack} onClick={previous}><ChevronLeft size={22} /></button>
          <button type="button" className="story-icon pointer-events-auto" aria-label="Next story" onClick={next}><ChevronRight size={22} /></button>
        </div>
        <footer className="absolute inset-x-0 bottom-0 z-[2] space-y-2 p-3 sm:p-4">
          {hasMedia && story.caption && <p className="break-words text-center text-sm leading-relaxed">{story.caption}</p>}
          {!isOwner && <>
            <div className="flex justify-center gap-1.5">
              {['❤️', '👍', '😂', '🙌'].map(emoji => <button key={emoji} type="button" aria-label={`React ${emoji}`} className="story-icon"
                disabled={busy} onClick={() => { setPaused(true); interact(() => storiesApi.reactToStory(story.id, emoji), 'Reaction sent.'); }}>{emoji}</button>)}
            </div>
            <form className="flex gap-2" onSubmit={async event => {
              event.preventDefault();
              if (!reply.trim()) return;
              if (await interact(async () => {
                const conversation = await chatApi.createOrGetConversation([group.user.id], false);
                await chatApi.sendMessage({ conversation_id: conversation.id, content: `Replied to your story: "${reply.trim()}"`, message_type: 'text', media_url: story.media_url || null });
              }, 'Reply sent.')) setReply('');
            }}>
              <input className="min-w-0 flex-1 rounded-xl border border-white/40 bg-black/30 px-3 text-sm text-white placeholder:text-white/80"
                aria-label="Reply to story" placeholder="Reply to story…" value={reply} onFocus={() => setPaused(true)} onChange={event => setReply(event.target.value)} />
              <button type="submit" aria-label="Send reply" disabled={busy || !reply.trim()} className="story-icon disabled:opacity-50"><Send size={17} /></button>
            </form>
          </>}
          {notice && <p className="text-center text-xs text-white" role="status">{notice}</p>}
        </footer>
        {deleting && <div className="absolute inset-0 z-[3] grid place-items-center bg-black/55 p-3">
          <div className="panel w-full max-w-xs space-y-4 p-4 text-text">
            <h2 className="section-title">Delete this story?</h2>
            {notice && <p role="alert" className="text-xs text-text-secondary">{notice}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="pill-button secondary-button" disabled={busy} onClick={() => setDeleting(false)}>Cancel</button>
              <button type="button" className="pill-button danger-button" disabled={busy} onClick={async () => {
                if (await interact(() => storiesApi.deleteStory(story.id), 'Story deleted.')) {
                  onStoryDeleted?.();
                  onClose();
                }
              }}>Delete</button>
            </div>
          </div>
        </div>}
      </div>
    </ModalFrame>
  );
}
