import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { storiesApi } from '../../api/stories';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';

export function StoriesBar({ revision, onOpenCreateStory, onOpenStoryViewer }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    storiesApi.getStoriesFeed().then(data => { if (active) setGroups(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  return (
    <div className="no-scrollbar flex items-start gap-4 overflow-x-auto px-1 py-3.5 sm:gap-5">
      <button type="button" onClick={onOpenCreateStory} className="flex w-[68px] shrink-0 flex-col items-center gap-2 rounded-xl text-xs font-medium">
        <span aria-hidden="true" className="relative flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-brand-300 bg-brand-50">
          <Avatar src={user?.avatar_url} alt={user?.full_name} size="lg" />
          <span className="absolute -right-0.5 bottom-0.5 grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-white ring-2 ring-surface"><Plus size={15} /></span>
        </span>
        Your story
      </button>
      {loading && <div className="flex gap-4" role="status" aria-label="Loading stories">
        {[1, 2, 3].map(slot => <div key={slot} className="skeleton h-16 w-16 shrink-0 !rounded-full" />)}
      </div>}
      {!loading && !error && groups.length === 0 && <p className="self-center px-2 text-xs text-text-secondary">New stories will appear here.</p>}
      {error && <p role="status" className="self-center px-2 text-xs text-text-secondary">Stories are unavailable.</p>}
      {groups.map((group, index) => (
        <button key={group.user.id} type="button" onClick={() => onOpenStoryViewer(groups, index)}
          className="flex w-[68px] shrink-0 flex-col items-center gap-2 rounded-xl text-xs font-medium">
          <span aria-hidden="true" className={`p-0.5 ${group.has_unseen ? 'story-ring-unseen' : 'story-ring-seen'}`}>
            <span className="block rounded-full bg-surface p-0.5"><Avatar src={group.user.avatar_url} alt={group.user.full_name} size="lg" /></span>
          </span>
          <span className="sr-only">View story by </span><span className="max-w-full truncate">{group.user.full_name}</span>
        </button>
      ))}
    </div>
  );
}
