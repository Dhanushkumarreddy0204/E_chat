import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { postsApi } from '../../api/posts';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';

export const CommentsModal = ({ isOpen, post, onClose, onCommentAdded }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const open = Boolean(isOpen && post);

  useEffect(() => {
    if (!open || !post) return;

    let cancelled = false;
    const fetchComments = async () => {
      try {
        setLoading(true);
        const data = await postsApi.getComments(post.id);
        if (!cancelled) {
          setComments(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error loading comments:', err);
        if (!cancelled) setComments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchComments();
    return () => {
      cancelled = true;
    };
  }, [open, post]);

  if (!open) return null;

  const handleAddComment = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const created = await postsApi.addComment(post.id, newComment.trim());
      setComments((prev) => [...prev, created]);
      setNewComment('');
      if (onCommentAdded) onCommentAdded(created);
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg h-[82vh] max-h-[650px] rounded-2xl bg-white shadow-xl border border-brand-100 flex flex-col justify-between overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3.5 sm:p-4 border-b border-brand-200 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-brand-900">Comments ({comments.length})</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-brand-700 hover:text-brand-800 hover:bg-brand-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
          {post.caption && (
            <div className="flex gap-3 pb-3 border-b border-brand-200">
              <Avatar src={post.user?.avatar_url} alt={post.user?.full_name} size="sm" className="shrink-0" />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand-900 truncate">{post.user?.username}</span>
                  <span className="text-[10px] text-brand-600 shrink-0">Author</span>
                </div>
                <p className="text-xs text-brand-800">{post.caption}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-brand-600 text-xs">
              No comments yet. Be the first to comment! 💬
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 items-start group">
                <Avatar src={c.user?.avatar_url} alt={c.user?.full_name} size="sm" className="shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brand-900 truncate">{c.user?.username}</span>
                    <span className="text-[10px] text-brand-600 shrink-0">
                      {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-brand-800 leading-relaxed break-words">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddComment} className="p-3 border-t border-brand-200 bg-white flex items-center gap-2 shrink-0">
          <Avatar src={user?.avatar_url} alt={user?.full_name} size="sm" className="shrink-0" />
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 bg-brand-50/80 border border-brand-200 rounded-full py-2 px-4 text-xs text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="p-2 rounded-full bg-brand-500 text-white disabled:opacity-40 hover:bg-brand-600 hover:scale-105 active:scale-95 transition-all shrink-0"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
