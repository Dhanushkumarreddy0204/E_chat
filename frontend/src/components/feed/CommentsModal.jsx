import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, LoaderCircle, MessageCircle, Send, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { postsApi } from '../../api/posts';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { ModalFrame } from '../common/ModalFrame';
import { PageSkeleton } from '../common/PageState';

export function CommentsModal({ isOpen, post, onClose, onCommentAdded }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(null);
  const [comment, setComment] = useState('');
  const [loadingError, setLoadingError] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retries, setRetries] = useState(0);
  const postId = isOpen ? post?.id : null;

  useEffect(() => {
    if (!postId) return;
    let active = true;
    setComments(null);
    setLoadingError(false);
    postsApi.getComments(postId).then(data => {
      if (active) setComments(previous => {
        const ids = new Set(data.map(item => item.id));
        return [...data, ...(previous || []).filter(item => !ids.has(item.id))];
      });
    }).catch(() => { if (active) setLoadingError(true); });
    return () => { active = false; };
  }, [postId, retries]);

  async function submit(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    setError('');
    try {
      const result = await postsApi.addComment(postId, comment.trim());
      setComments(previous => [...(previous || []), result]);
      setComment('');
      onCommentAdded?.(result);
    } catch {
      setError('Could not post your comment.');
    } finally {
      setBusy(false);
    }
  }

  if (!postId) return null;
  return (
    <ModalFrame label="Comments" onClose={onClose}>
      <div className="modal-panel flex h-[min(76dvh,630px)] flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h2 className="section-title">Comments {comments?.length ? <span className="badge ml-1">{comments.length}</span> : null}</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="rounded-xl bg-brand-50 p-3">
            <div className="flex items-center gap-2.5">
              <Avatar src={post.user?.avatar_url} alt={post.user?.full_name} size="sm" className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{post.user?.full_name || 'EChat member'}</span>
              <Link to={`/post/${postId}`} aria-label="View post" title="View post" onClick={onClose} className="icon-button !min-h-8 !min-w-8"><ExternalLink size={16} /></Link>
            </div>
            {post.caption && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{post.caption}</p>}
          </div>
          {loadingError ? <p className="form-error" role="alert">Could not load comments. <button type="button" className="underline" onClick={() => setRetries(previous => previous + 1)}>Retry</button></p> :
            !comments ? <PageSkeleton label="Loading comments" /> :
            comments.length ? <ul className="space-y-4">{comments.map(item =>
              <li key={item.id} className="flex items-start gap-2.5">
                <Avatar src={item.user?.avatar_url} alt={item.user?.full_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-semibold">{item.user?.full_name || item.user?.username || 'EChat member'}</span>
                    {item.created_at && <time className="text-[11px] text-text-secondary">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</time>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.content}</p>
                </div>
              </li>)}</ul> : <div className="py-10 text-center text-sm text-text-secondary">
                <MessageCircle size={25} className="mx-auto mb-2 text-brand-400" /> No comments yet.
              </div>}
        </div>
        {error && <p role="alert" className="form-error mx-4 mb-2">{error}</p>}
        <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-border p-3 sm:px-5">
          <Avatar src={user?.avatar_url} alt={user?.full_name} size="sm" className="hidden shrink-0 sm:block" />
          <input aria-label="Add a comment" className="field flex-1" placeholder="Add a comment…" value={comment} onChange={event => setComment(event.target.value)} />
          <button type="submit" aria-label="Send comment" disabled={busy || !comment.trim()} className="pill-button primary-button !px-3 disabled:opacity-45">
            {busy ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </form>
      </div>
    </ModalFrame>
  );
}
