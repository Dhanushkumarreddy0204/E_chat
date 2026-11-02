import React, { useState, useEffect } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { postsApi } from '../api/posts';
import { PostGrid } from '../components/profile/PostGrid';
import { CommentsModal } from '../components/feed/CommentsModal';

export const SavedPage = () => {
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState(null);

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        setLoading(true);
        const data = await postsApi.getSavedPosts();
        setSavedPosts(data);
      } catch (err) {
        console.error('Error fetching saved posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-3 sm:px-4 space-y-6">
      <div className="p-4 rounded-xl bg-white shadow-sm border border-brand-100 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-brand-500 text-white">
          <Bookmark className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-brand-900">Saved Posts</h2>
          <p className="text-xs text-brand-700">Only you can see what you've saved</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : savedPosts.length === 0 ? (
        <div className="text-center py-16 text-xs text-brand-600 rounded-xl bg-white shadow-sm border border-brand-100 space-y-2">
          <Bookmark className="w-8 h-8 mx-auto text-brand-500" />
          <p>No saved posts yet. Bookmark posts you'd like to revisit!</p>
        </div>
      ) : (
        <PostGrid posts={savedPosts} onPostClick={(p) => setActivePost(p)} />
      )}

      <CommentsModal
        isOpen={Boolean(activePost)}
        post={activePost}
        onClose={() => setActivePost(null)}
      />
    </div>
  );
};
