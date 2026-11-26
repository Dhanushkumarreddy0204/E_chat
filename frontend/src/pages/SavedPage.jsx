import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, CircleAlert } from 'lucide-react';
import { postsApi } from '../api/posts';
import { PageSkeleton, PageState } from '../components/common/PageState';
import { PostGrid } from '../components/profile/PostGrid';

export function SavedPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    postsApi.getSavedPosts().then(data => { if (active) setPosts(data); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [retry]);
  return (
    <div className="page-stack">
      <header className="space-y-2"><h1 className="page-title">Saved posts</h1><p className="text-sm text-text-secondary">Only you can see what you save.</p></header>
      {error ? <PageState icon={CircleAlert} title="Could not load saved posts" action="Retry" onAction={() => setRetry(value => value + 1)} /> :
        !posts ? <PageSkeleton label="Loading saved posts" media /> :
        posts.length ? <PostGrid posts={posts} onPostClick={post => navigate(`/post/${post.id}`)} /> :
        <PageState icon={Bookmark} title="Nothing saved yet" description="Use the bookmark on any post to keep it here."
          action="Explore posts" onAction={() => navigate('/explore')} />}
    </div>
  );
}
