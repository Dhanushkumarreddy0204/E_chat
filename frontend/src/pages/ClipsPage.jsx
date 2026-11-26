import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, CircleAlert, Film, Heart, LoaderCircle, MessageCircle, Pause, Play, Share2, Volume2, VolumeX } from 'lucide-react';
import { mediaUrl } from '../api/urls';
import { postsApi } from '../api/posts';
import { useClipFlow } from '../context/ClipFlowContext';
import { Avatar } from '../components/common/Avatar';
import { PageSkeleton, PageState } from '../components/common/PageState';
import { CommentsModal } from '../components/feed/CommentsModal';

export function ClipsPage() {
  const [clips, setClips] = useState([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [active, setActive] = useState(null);
  const [comments, setComments] = useState(null);
  const [restore, setRestore] = useState(null);
  const currentPage = useRef(0);
  const loadingPage = useRef(false);
  const scroller = useRef(null);
  const { shouldRestoreClips, consumeRestoredScrollTop } = useClipFlow();
  const restoreOnMount = useRef(shouldRestoreClips);

  const fetchPage = useCallback(async () => {
    if (loadingPage.current) return;
    loadingPage.current = true;
    setLoading(true);
    setError(false);
    try {
      const result = await postsApi.getClips(currentPage.current + 1, 10);
      setClips(previous => [...previous, ...result.items.filter(item => !previous.some(clip => clip.id === item.id))]);
      setActive(previous => previous ?? result.items[0]?.id ?? null);
      setHasMore(result.has_more);
      currentPage.current += 1;
    } catch {
      setError(true);
    } finally {
      loadingPage.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(); }, [fetchPage]);
  useEffect(() => {
    window.__clipsScrollRef = scroller;
    return () => { window.__clipsScrollRef = null; };
  }, []);
  useEffect(() => {
    if (restoreOnMount.current) {
      restoreOnMount.current = false;
      setRestore(consumeRestoredScrollTop());
    }
  }, [consumeRestoredScrollTop]);
  useLayoutEffect(() => {
    if (restore === null || !scroller.current || !clips.length) return;
    const element = scroller.current;
    if (restore > element.scrollHeight - element.clientHeight + 2 && hasMore && !error) {
      fetchPage();
      return;
    }
    element.scrollTop = restore;
    setRestore(null);
  }, [restore, clips.length, hasMore, error, fetchPage]);

  function onScroll() {
    const element = scroller.current;
    if (element && hasMore && !error && element.scrollHeight - element.scrollTop < element.clientHeight * 2) fetchPage();
  }

  function move(direction) {
    const element = scroller.current;
    if (!element) return;
    element.scrollBy({ top: element.clientHeight * direction, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  if (!clips.length) return <div className="page-stack">
    <h1 className="page-title">Clips</h1>
    {loading ? <PageSkeleton media label="Loading clips" /> : error
      ? <PageState icon={CircleAlert} title="Could not load clips" action="Retry" onAction={fetchPage} />
      : <PageState icon={Film} title="No clips yet" description="Short videos shared on EChat will appear here." />}
  </div>;

  return (
    <div className="clip-stage relative">
      <h1 className="clip-heading">Clips</h1>
      <div className="clip-scroll no-scrollbar" onScroll={onScroll} ref={scroller} aria-label="Clips feed"
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            move(event.key === 'ArrowDown' ? 1 : -1);
          }
        }}>
        {clips.map(clip => <ClipItem key={clip.id} clip={clip} isActive={active === clip.id} onActive={setActive} onOpenComments={setComments} />)}
      </div>
      <div className="absolute bottom-4 right-3 z-10 hidden gap-2 md:flex">
        <button type="button" aria-label="Previous clip" className="clip-control" onClick={() => move(-1)}><ChevronUp size={20} /></button>
        <button type="button" aria-label="Next clip" className="clip-control" onClick={() => move(1)}><ChevronDown size={20} /></button>
      </div>
      {error && <button type="button" className="pill-button primary-button absolute bottom-4 left-4 z-10" onClick={fetchPage}>Retry loading clips</button>}
      {comments && <CommentsModal isOpen post={comments} onClose={() => setComments(null)} onCommentAdded={() => {
        setClips(previous => previous.map(clip => clip.id === comments.id
          ? { ...clip, comments_count: (clip.comments_count || 0) + 1 } : clip));
      }} />}
    </div>
  );
}

function ClipItem({ clip, isActive, onActive, onOpenComments }) {
  const item = useRef(null);
  const player = useRef(null);
  const viewRecorded = useRef(false);
  const [liked, setLiked] = useState(clip.is_liked);
  const [likes, setLikes] = useState(clip.likes_count || 0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState('');
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onActive(clip.id);
    }, { threshold: .6 });
    if (item.current) observer.observe(item.current);
    return () => observer.disconnect();
  }, [clip.id, onActive]);

  useEffect(() => {
    const video = player.current;
    if (isActive && video && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.play().catch(() => setBuffering(false));
    } else video?.pause();
    return () => video?.pause();
  }, [isActive]);

  async function toggleLike() {
    if (liking) return;
    setLiking(true);
    try {
      const result = await postsApi.toggleLike(clip.id);
      setLiked(result.is_liked);
      setLikes(result.likes_count);
    } catch { setNotice('Could not update the like.'); }
    finally { setLiking(false); }
  }

  async function share() {
    const url = new URL(`/post/${clip.id}`, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: 'EChat clip', url });
      else { await navigator.clipboard.writeText(url); setNotice('Link copied.'); }
    } catch (failure) { if (failure.name !== 'AbortError') setNotice('Could not share this clip.'); }
  }

  const source = mediaUrl(clip.media?.[0]?.url);
  return (
    <article ref={item} className="clip-item" aria-label={`Clip by ${clip.user.full_name}`} aria-hidden={!isActive} data-active={isActive} inert={!isActive ? '' : undefined}>
      <div className="clip-player">
        {source && <video ref={player} src={source} loop playsInline muted={muted} preload={isActive ? 'auto' : 'metadata'}
          className="h-full w-full object-contain" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onWaiting={() => setBuffering(true)} onCanPlay={() => setBuffering(false)}
          onPlaying={() => {
            setBuffering(false);
            if (!viewRecorded.current) {
              viewRecorded.current = true;
              postsApi.viewPost(clip.id).catch(() => { viewRecorded.current = false; });
            }
          }}
          onError={() => { setFailed(true); setBuffering(false); }} />}
        {failed || !source ? <div className="absolute inset-0 z-[2] grid place-content-center justify-items-center gap-3 p-5 text-center text-white">
          <CircleAlert size={24} /><p>This clip is unavailable.</p>
          {source && <button type="button" className="pill-button primary-button" onClick={() => {
            setFailed(false);
            player.current?.load();
            player.current?.play().catch(() => {});
          }}>Retry</button>}
        </div> : <button type="button" className="clip-play" aria-label={playing ? 'Pause clip' : 'Play clip'}
          onClick={() => { if (player.current.paused) player.current.play().catch(() => {}); else player.current.pause(); }}>
          {buffering ? <span className="clip-control"><LoaderCircle size={24} className="animate-spin" /></span> :
            !playing ? <span className="clip-control"><Play size={25} /></span> : <span className="clip-pause clip-control"><Pause size={22} /></span>}
        </button>}
        <button type="button" className="clip-control absolute right-3 top-3 z-[3]" onClick={() => setMuted(!muted)}
          aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
        <div className="absolute bottom-5 right-3 z-[3] flex flex-col items-center gap-3 text-white sm:right-4">
          <button type="button" className="clip-control" aria-label={liked ? 'Unlike clip' : 'Like clip'} aria-pressed={liked} disabled={liking} onClick={toggleLike}><Heart size={21} className={liked ? 'fill-white' : ''} /></button>
          <span className="-mt-2 text-xs">{likes}</span>
          <button type="button" className="clip-control" aria-label="Open clip comments" onClick={() => onOpenComments(clip)}><MessageCircle size={20} /></button>
          <span className="-mt-2 text-xs">{clip.comments_count || 0}</span>
          <button type="button" className="clip-control" aria-label="Share clip" onClick={share}><Share2 size={18} /></button>
        </div>
        <div className="absolute bottom-5 left-4 right-[72px] z-[3] space-y-2 text-white">
          <Link to={`/profile/${clip.user.username}`} className="inline-flex min-w-0 items-center gap-2 rounded-lg text-sm font-semibold">
            <Avatar src={clip.user.avatar_url} alt={clip.user.full_name} size="sm" className="shrink-0" /><span className="truncate">@{clip.user.username}</span>
          </Link>
          <p className="line-clamp-3 break-words text-sm leading-relaxed">{clip.caption}</p>
          {notice && <p role="status" className="text-xs text-white">{notice}</p>}
        </div>
      </div>
    </article>
  );
}
