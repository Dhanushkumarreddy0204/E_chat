import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, CircleAlert, Image, Layers, Plus, RefreshCw } from 'lucide-react';
import { postsApi } from '../api/posts';
import { StoriesBar } from '../components/feed/StoriesBar';
import { PostCard } from '../components/feed/PostCard';
import { StoryViewerModal } from '../components/feed/StoryViewerModal';
import { CreateStoryModal } from '../components/feed/CreateStoryModal';
import { CommentsModal } from '../components/feed/CommentsModal';
import { PageSkeleton, PageState } from '../components/common/PageState';

export function HomePage({ onOpenCreatePost, postRevision }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [storyRevision, setStoryRevision] = useState(0);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [storyViewerData, setStoryViewerData] = useState(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState(null);

  const fetchFeed = useCallback(async (pageNumber = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await postsApi.getFeed(pageNumber, 10);
      setPosts(previous => pageNumber === 1 ? data.items : [
        ...previous, ...data.items.filter(item => !previous.some(post => post.id === item.id)),
      ]);
      setHasMore(data.has_more);
      setPage(pageNumber);
    } catch {
      setError('Could not load posts. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed, postRevision]);

  function increaseCommentCount(id) {
    setPosts(previous => previous.map(post => post.id === id ? { ...post, comments_count: (post.comments_count || 0) + 1 } : post));
  }

  return (
    <div className="page-stack feed-page">
      <section className="feed-hero">
        <img src={import.meta.env.BASE_URL + 'echat-table.webp'} alt="" className="feed-hero-image" fetchPriority="high" />
        <div className="grid justify-items-start gap-3">
          <h1>Share a moment.</h1>
          <p>Post a thought, a photo, or a short clip.</p>
          <button type="button" onClick={onOpenCreatePost} className="pill-button mt-1"><Plus size={17} /> Create a post</button>
        </div>
      </section>

      <section className="panel overflow-hidden px-4 pb-3 pt-4 sm:px-5" aria-label="Stories">
        <div className="flex items-center justify-between gap-2">
          <h2 className="section-title">Stories</h2>
          <button onClick={() => setIsCreateStoryOpen(true)} className="pill-button secondary-button !min-h-8 !text-xs">Add story <ArrowRight size={14} /></button>
        </div>
        <StoriesBar revision={storyRevision} onOpenCreateStory={() => setIsCreateStoryOpen(true)}
          onOpenStoryViewer={(groups, index) => setStoryViewerData({ groups, initialIndex: index })} />
      </section>

      <section className="space-y-3" aria-label="Feed">
        <div className="flex items-center justify-between px-1">
          <h2 className="section-title flex items-center gap-2"><Layers size={17} className="text-brand-400" /> Your feed</h2>
          <button type="button" title="Refresh feed" aria-label="Refresh feed" disabled={loading} onClick={() => fetchFeed()}
            className="icon-button"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button>
        </div>
        {loading && !posts.length ? <PageSkeleton label="Loading posts" media /> : null}
        {!loading && !posts.length && !error && <PageState icon={Image} title="Your feed is quiet"
          description="Follow people in Explore or share a post to get started." />}
        {posts.map(post => <PostCard key={post.id} post={post}
          onPostDeleted={id => setPosts(previous => previous.filter(item => item.id !== id))}
          onOpenComments={setActiveCommentsPost} onCommentAdded={increaseCommentCount} />)}
        {error && <PageState icon={CircleAlert} title="Feed unavailable" description={error} action="Retry"
          onAction={() => fetchFeed(posts.length ? page + 1 : 1)} />}
        {hasMore && !error && <div className="text-center">
          <button type="button" disabled={loading} onClick={() => fetchFeed(page + 1)} className="pill-button secondary-button">
            {loading ? 'Loading…' : 'Load more posts'}
          </button>
        </div>}
      </section>

      {isCreateStoryOpen && <CreateStoryModal isOpen onClose={() => setIsCreateStoryOpen(false)}
        onStoryCreated={() => setStoryRevision(previous => previous + 1)} />}
      {storyViewerData && <StoryViewerModal storyGroups={storyViewerData.groups} initialGroupIndex={storyViewerData.initialIndex}
        onClose={() => setStoryViewerData(null)} onStoryDeleted={() => setStoryRevision(previous => previous + 1)} />}
      {activeCommentsPost && <CommentsModal isOpen post={activeCommentsPost} onClose={() => setActiveCommentsPost(null)}
        onCommentAdded={() => increaseCommentCount(activeCommentsPost.id)} />}
    </div>
  );
}
