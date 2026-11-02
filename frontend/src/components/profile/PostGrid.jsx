import React from 'react';
import { Heart, MessageCircle, Film } from 'lucide-react';

export const PostGrid = ({ posts, onPostClick }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-16 text-brand-600 text-xs rounded-xl bg-white shadow-sm border border-brand-100">
        No posts published yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
      {posts.map((post) => {
        const hasMedia = post.media && post.media.length > 0;
        const media = hasMedia ? post.media[0] : null;

        return (
          <div
            key={post.id}
            onClick={() => onPostClick && onPostClick(post)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-white border border-brand-200 cursor-pointer"
          >
            {hasMedia ? (
              media.media_type === 'video' ? (
                <video src={media.url} className="w-full h-full object-cover" />
              ) : (
                <img src={media.url} alt="Post preview" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              )
            ) : (
              <div className="w-full h-full p-4 flex items-center justify-center bg-gradient-to-br from-brand-900 to-emerald-950 text-brand-100 text-xs text-center line-clamp-4 font-medium">
                {post.caption}
              </div>
            )}

            {/* Video Badge */}
            {hasMedia && media.media_type === 'video' && (
              <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white shadow-xs">
                <Film className="w-3.5 h-3.5" />
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-xs">
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 fill-white" />
                <span>{post.likes_count}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>{post.comments_count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
