import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal, 
  Send, 
  MapPin, 
  Trash2 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { postsApi } from '../../api/posts';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';

export const PostCard = ({ post, onPostDeleted, onOpenComments }) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked);
  const [commentInput, setCommentInput] = useState('');
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthor = currentUser && currentUser.id === post.user.id;

  const handleLikeToggle = async () => {
    try {
      const res = await postsApi.toggleLike(post.id);
      setIsLiked(res.is_liked);
      setLikesCount(res.likes_count);
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLikeToggle();
    }
    setShowHeartPop(true);
    setTimeout(() => setShowHeartPop(false), 800);
  };

  const handleBookmarkToggle = async () => {
    try {
      const res = await postsApi.toggleBookmark(post.id);
      setIsBookmarked(res.is_bookmarked);
    } catch (err) {
      console.error('Error bookmarking post:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    try {
      await postsApi.addComment(post.id, commentInput.trim());
      setCommentInput('');
      setCommentsCount(prev => prev + 1);
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await postsApi.deletePost(post.id);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <article className="rounded-xl bg-white shadow-sm border border-brand-100 overflow-hidden mb-6 transition-all duration-300">
      {/* Post Header */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-2">
        <div 
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0 flex-1 mr-2"
          onClick={() => navigate(`/profile/${post.user.username}`)}
        >
          <Avatar src={post.user.avatar_url} alt={post.user.full_name} size="md" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-brand-900 group-hover:text-brand-500 transition-colors truncate max-w-[140px] sm:max-w-xs">
                {post.user.full_name}
              </span>
              <span className="text-xs text-brand-600 font-normal truncate">@{post.user.username}</span>
            </div>
            {post.location && (
              <div className="flex items-center gap-1 text-[11px] text-brand-700 truncate">
                <MapPin className="w-3 h-3 text-brand-400 shrink-0" />
                <span className="truncate">{post.location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 relative shrink-0">
          <span className="text-[11px] text-brand-600 shrink-0">{timeAgo}</span>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-brand-700 hover:text-brand-900 rounded-lg hover:bg-brand-50"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-8 w-36 rounded-xl bg-white border border-brand-200 py-1 z-20">
              {isAuthor && (
                <button
                  onClick={handleDeletePost}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-brand-600 hover:bg-brand-100 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Post</span>
                </button>
              )}
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.origin + `/post/${post.id}`); setMenuOpen(false); }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-brand-800 hover:bg-brand-50 flex items-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Caption */}
      {post.caption && (
        <div className="px-4 pb-3">
          <p className="text-xs sm:text-sm text-brand-900 leading-relaxed whitespace-pre-line">
            {post.caption}
          </p>
        </div>
      )}

      {/* Post Media (Image/Video) */}
      {post.media && post.media.length > 0 && (
        <div 
          className="relative w-full max-h-[460px] sm:max-h-[550px] bg-brand-50/40 flex items-center justify-center overflow-hidden cursor-pointer select-none"
          onDoubleClick={handleDoubleTap}
        >
          {post.media[0].media_type === 'video' ? (
            <video 
              src={post.media[0].url} 
              controls 
              className="w-full max-h-[460px] sm:max-h-[550px] object-contain"
            />
          ) : (
            <img 
              src={post.media[0].url} 
              alt="Post content" 
              className="w-full max-h-[460px] sm:max-h-[550px] object-contain"
            />
          )}

          {/* Double Tap Floating Heart */}
          {showHeartPop && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
              <Heart className="w-24 h-24 text-brand-500 fill-brand-500 filter drop-shadow-2xl" />
            </div>
          )}
        </div>
      )}

      {/* Post Actions Bar */}
      <div className="p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5 sm:gap-4">
            {/* Like */}
            <button
              onClick={handleLikeToggle}
              className={`flex items-center gap-1.5 text-xs font-semibold transition-all ${
                isLiked ? 'text-brand-500 scale-105' : 'text-brand-700 hover:text-brand-400'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-brand-500' : ''}`} />
              <span>{likesCount}</span>
            </button>

            {/* Comment */}
            <button
              onClick={() => onOpenComments(post)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-400 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{commentsCount}</span>
            </button>

            {/* Share */}
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'EChat Post', url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }
              }}
              className="text-brand-700 hover:text-brand-400 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Bookmark */}
          <button
            onClick={handleBookmarkToggle}
            className={`transition-colors ${
              isBookmarked ? 'text-brand-400' : 'text-brand-700 hover:text-brand-300'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-brand-400' : ''}`} />
          </button>
        </div>

        {/* View all comments trigger */}
        {commentsCount > 0 && (
          <button
            onClick={() => onOpenComments(post)}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium"
          >
            View all {commentsCount} comments
          </button>
        )}

        {/* Inline Comment Input */}
        <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-brand-200/60">
          <input
            type="text"
            placeholder="Write a comment..."
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            className="flex-1 bg-transparent py-1.5 text-xs text-brand-900 placeholder-brand-300 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!commentInput.trim()}
            className="text-xs font-bold text-brand-400 hover:text-brand-300 disabled:opacity-30 transition-opacity"
          >
            Post
          </button>
        </form>
      </div>
    </article>
  );
};
