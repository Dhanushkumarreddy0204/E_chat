import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff } from 'lucide-react';
import { postsApi } from '../api/posts';
import { PageSkeleton, PageState } from '../components/common/PageState';
import { PostCard } from '../components/feed/PostCard';
import { CommentsModal } from '../components/feed/CommentsModal';

export function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setPost(null);
    setError(false);
    postsApi.getPostById(id).then(data => { if (active) setPost(data); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [id]);

  function increaseCommentCount() {
    setPost(previous => previous ? { ...previous, comments_count: (previous.comments_count || 0) + 1 } : previous);
  }

  return (
    <div className="page-stack feed-page">
      <div className="flex items-center gap-3">
        <Link to="/" aria-label="Back to feed" className="icon-button"><ArrowLeft size={20} /></Link>
        <h1 className="page-title !text-[38px]">Post</h1>
      </div>
      {error ? <PageState icon={ImageOff} title="Post unavailable" action="Back to feed" onAction={() => navigate('/')} />
        : post ? <PostCard post={post} onOpenComments={() => setOpen(true)} onPostDeleted={() => navigate('/')} onCommentAdded={increaseCommentCount} />
        : <PageSkeleton label="Loading post" media />}
      {open && post && <CommentsModal isOpen post={post} onClose={() => setOpen(false)} onCommentAdded={increaseCommentCount} />}
    </div>
  );
}
