import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { postsApi } from '../api/posts';
import { StoriesBar } from '../components/feed/StoriesBar';
import { PostCard } from '../components/feed/PostCard';
import { StoryViewerModal } from '../components/feed/StoryViewerModal';
import { CreateStoryModal } from '../components/feed/CreateStoryModal';
import { CommentsModal } from '../components/feed/CommentsModal';

export const HomePage = ({ onOpenCreatePost }) => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Story modals
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [storyViewerData, setStoryViewerData] = useState(null); // { groups, initialIndex }
  const [activeCommentsPost, setActiveCommentsPost] = useState(null);

  const fetchFeed = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const data = await postsApi.getFeed(pageNum, 10);
      if (pageNum === 1) {
        setPosts(data.items);
      } else {
        setPosts(prev => [...prev, ...data.items]);
      }
      setHasMore(data.has_more);
    } catch (err) {
      console.error('Error loading feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(1);
  }, [fetchFeed]);

  const handleRefresh = () => {
    setPage(1);
    fetchFeed(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFeed(nextPage);
    }
  };

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-4 px-3 sm:px-4 space-y-6">
      {/* Stories Carousel */}
      <section className="p-3 rounded-xl bg-white shadow-sm border border-brand-100">
        <StoriesBar
          onOpenCreateStory={() => setIsCreateStoryOpen(true)}
          onOpenStoryViewer={(groups, index) => setStoryViewerData({ groups, initialIndex: index })}
        />
      </section>

      {/* Feed Stream */}
      <section className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <p className="text-xs text-brand-600 font-medium">Loading your personalized feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-white shadow-sm border border-brand-100 space-y-3">
            <Sparkles className="w-8 h-8 text-brand-400 mx-auto" />
            <h3 className="text-base font-bold text-brand-900">Your feed is quiet</h3>
            <p className="text-xs text-brand-700 max-w-xs mx-auto">
              Follow some friends or creators, or create your first post to see what happens!
            </p>
            <button
              onClick={onOpenCreatePost}
              className="mt-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-xs hover:scale-105 transition-transform"
            >
              Create a Post
            </button>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPostDeleted={handlePostDeleted}
                onOpenComments={(p) => setActiveCommentsPost(p)}
              />
            ))}

            {/* Load More Trigger */}
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-xs font-bold text-brand-800 transition-colors"
                >
                  Load More Posts
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onStoryCreated={() => {
          setIsCreateStoryOpen(false);
          handleRefresh();
        }}
      />

      {/* Story Viewer Modal */}
      {storyViewerData && (
        <StoryViewerModal
          storyGroups={storyViewerData.groups}
          initialGroupIndex={storyViewerData.initialIndex}
          onClose={() => setStoryViewerData(null)}
          onStoryDeleted={() => handleRefresh()}
        />
      )}

      {/* Comments Modal */}
      <CommentsModal
        isOpen={Boolean(activeCommentsPost)}
        post={activeCommentsPost}
        onClose={() => setActiveCommentsPost(null)}
      />
    </div>
  );
};
