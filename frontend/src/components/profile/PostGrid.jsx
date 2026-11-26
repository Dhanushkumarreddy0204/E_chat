import { Film, Heart, MessageCircle } from 'lucide-react';
import { mediaUrl } from '../../api/urls';
import { PageState } from '../common/PageState';

export function PostGrid({ posts, onPostClick }) {
  if (!posts?.length) return <PageState icon={Film} title="No posts yet" />;
  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {posts.map(post => {
        const media = post.media?.[0];
        const video = media?.media_type === 'video';
        return (
          <button type="button" key={post.id} onClick={() => onPostClick(post)}
            aria-label={post.caption ? `Open post: ${post.caption.slice(0, 70)}` : 'Open post'}
            className="panel group relative flex min-h-[155px] flex-col overflow-hidden text-left transition-colors hover:border-brand-400 sm:min-h-[185px]">
            <div className="relative aspect-[5/4] w-full overflow-hidden bg-brand-50">
              {video ? <video src={mediaUrl(media.url)} muted playsInline preload="metadata" className="h-full w-full object-cover" /> :
                media ? <img src={mediaUrl(media.url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform group-hover:scale-[1.025]" /> :
                <div className="grid h-full place-items-center p-4 sm:p-6"><p className="line-clamp-4 break-words font-display text-lg leading-tight text-text sm:text-2xl">{post.caption || 'Post'}</p></div>}
              {video && <span className="absolute right-2 top-2 rounded-full bg-black/65 p-2 text-white"><Film size={14} /></span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1.5"><Heart size={14} />{post.likes_count || 0}</span>
              <span className="inline-flex items-center gap-1.5"><MessageCircle size={14} />{post.comments_count || 0}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
