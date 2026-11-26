import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ChevronLeft, ChevronRight, Heart, MapPin, MessageCircle, MoreHorizontal, Send, Share2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { mediaUrl } from '../../api/urls';
import { postsApi } from '../../api/posts';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { ModalFrame } from '../common/ModalFrame';

export function PostCard({ post, onPostDeleted, onOpenComments, onCommentAdded }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(Boolean(post.is_liked));
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [saved, setSaved] = useState(Boolean(post.is_bookmarked));
  const [comment, setComment] = useState('');
  const [mediaIndex, setMediaIndex] = useState(0);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const actions = useRef(null);
  const media = post.media?.[mediaIndex];
  const author = post.user;
  const canDelete = user?.id === author?.id;

  useEffect(() => {
    setLiked(Boolean(post.is_liked));
    setLikes(post.likes_count || 0);
    setSaved(Boolean(post.is_bookmarked));
  }, [post.id, post.is_liked, post.likes_count, post.is_bookmarked]);

  async function run(action, work) {
    setPending(previous => ({ ...previous, [action]: true }));
    setNotice('');
    try {
      await work();
    } catch {
      setNotice('That action could not be completed. Try again.');
    } finally {
      setPending(previous => ({ ...previous, [action]: false }));
    }
  }

  function like() {
    if (pending.like) return;
    run('like', async () => {
      const result = await postsApi.toggleLike(post.id);
      setLiked(result.is_liked);
      setLikes(result.likes_count);
    });
  }

  async function share() {
    const url = new URL(`/post/${post.id}`, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: 'EChat post', url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice('Link copied.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') setNotice('Could not share this post.');
    }
  }

  const comments = post.comments_count || 0;
  const createdAt = new Date(post.created_at);
  return (
    <article className="panel overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-4 py-3.5 sm:px-5">
        <Link to={author ? `/profile/${author.username}` : '/'} className="flex min-w-0 items-center gap-3 rounded-md">
          <Avatar src={author?.avatar_url} alt={author?.full_name} size="md" className="shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{author?.full_name || 'EChat member'}</span>
            <span className="flex items-center gap-1.5 truncate text-xs text-text-secondary">
              {post.location ? <><MapPin size={13} /><span className="truncate">{post.location}</span></> : author ? '@' + author.username : null}
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {Number.isFinite(+createdAt) && <time dateTime={createdAt.toISOString()} className="max-w-[94px] truncate text-[11px] text-text-secondary">{formatDistanceToNow(createdAt, { addSuffix: true })}</time>}
          <details className="relative" ref={actions}>
            <summary className="icon-button list-none cursor-pointer !min-h-9 !min-w-9" aria-label="Post options"><MoreHorizontal size={20} /></summary>
            <div className="panel absolute right-0 top-full z-10 min-w-40 space-y-1 p-1.5">
              <button type="button" className="nav-item !min-h-9" onClick={() => { actions.current.open = false; share(); }}><Share2 size={15} /> Share post</button>
              {canDelete && <button type="button" className="nav-item !min-h-9" onClick={() => { actions.current.open = false; setConfirmDelete(true); }}>
                <Trash2 size={15} /> Delete post
              </button>}
            </div>
          </details>
        </div>
      </header>

      {post.caption && <p className="whitespace-pre-wrap break-words px-4 pb-3 text-sm leading-relaxed sm:px-5">{post.caption}</p>}
      {post.tags?.length > 0 && <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">
        {post.tags.map(tag => <Link key={tag} to={`/explore?q=${encodeURIComponent('#' + tag.replace(/^#/, ''))}`}
          className="text-xs font-medium text-brand-400 hover:underline">#{tag.replace(/^#/, '')}</Link>)}
      </div>}

      {media && <div className="post-media relative mx-3 overflow-hidden rounded-[15px] bg-brand-50 sm:mx-4" onDoubleClick={() => { if (!liked) like(); }}>
        {media.media_type === 'video' ? <video key={media.url} className="max-h-[530px] min-h-32 w-full object-contain" controls playsInline preload="metadata" src={mediaUrl(media.url)} />
          : <img key={media.url} className="max-h-[530px] min-h-24 w-full object-contain" src={mediaUrl(media.url)} alt={post.caption || 'Photo shared in this post'} loading="lazy" decoding="async" />}
        {post.media.length > 1 && <>
          <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2 py-1 text-xs text-white">{mediaIndex + 1} / {post.media.length}</span>
          {mediaIndex > 0 && <button type="button" className="media-arrow left-2" aria-label="Previous media" onClick={() => setMediaIndex(mediaIndex - 1)}><ChevronLeft size={20} /></button>}
          {mediaIndex + 1 < post.media.length && <button type="button" className="media-arrow right-2" aria-label="Next media" onClick={() => setMediaIndex(mediaIndex + 1)}><ChevronRight size={20} /></button>}
        </>}
      </div>}

      <div className="space-y-2 px-4 pb-4 pt-2.5 sm:px-5">
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label={`${liked ? 'Unlike post' : 'Like post'}, ${likes} likes`} aria-pressed={liked} disabled={pending.like}
            className="icon-button !gap-1.5 !px-2.5" onClick={like}>
            <Heart size={19} className={liked ? 'fill-brand-400 text-brand-400' : ''} /><span className="text-xs tabular-nums">{likes}</span>
          </button>
          <button type="button" aria-label={`Open comments, ${comments} comments`} className="icon-button !gap-1.5 !px-2.5" onClick={() => onOpenComments(post)}>
            <MessageCircle size={19} /><span className="text-xs tabular-nums">{comments}</span>
          </button>
          <button type="button" aria-label="Share post" className="icon-button" onClick={share}><Share2 size={18} /></button>
          <div className="flex-1" />
          <button type="button" aria-label={saved ? 'Remove from saved posts' : 'Save post'} aria-pressed={saved}
            className="icon-button" disabled={pending.save} onClick={() => run('save', async () => {
              const result = await postsApi.toggleBookmark(post.id);
              setSaved(result.is_bookmarked);
              setNotice(result.is_bookmarked ? 'Post saved.' : 'Post removed from saved.');
            })}><Bookmark size={19} className={saved ? 'fill-brand-400 text-brand-400' : ''} /></button>
        </div>
        <form className="flex items-center gap-2 border-t border-border pt-3" onSubmit={event => {
          event.preventDefault();
          if (comment.trim()) run('comment', async () => {
            await postsApi.addComment(post.id, comment.trim());
            onCommentAdded(post.id);
            setComment('');
          });
        }}>
          <input aria-label="Write a comment" className="field !py-2" placeholder="Write a comment…" value={comment}
            onChange={event => setComment(event.target.value)} />
          <button type="submit" aria-label="Post comment" className="icon-button !bg-brand-100" disabled={!comment.trim() || pending.comment}><Send size={17} /></button>
        </form>
        {notice && <p role="status" className="text-xs text-text-secondary">{notice}</p>}
      </div>
      {confirmDelete && <ModalFrame label="Delete post" onClose={() => setConfirmDelete(false)}>
        <div className="modal-panel space-y-4 p-5">
          <h2 className="section-title">Delete this post?</h2>
          <p className="text-sm text-text-secondary">The post will be removed from your profile and the feed.</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="pill-button secondary-button" onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button type="button" disabled={pending.delete} className="pill-button danger-button" onClick={() => run('delete', async () => {
              await postsApi.deletePost(post.id);
              setConfirmDelete(false);
              onPostDeleted?.(post.id);
            })}>Delete post</button>
          </div>
        </div>
      </ModalFrame>}
    </article>
  );
}
