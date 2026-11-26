import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bookmark, Hash, UserPlus, Users } from 'lucide-react';
import { usersApi } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './Avatar';
import { PageSkeleton } from './PageState';

const topics = ['Design', 'Photography', 'Technology', 'Travel'];

export function RightPanel() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState(null);
  const [followed, setFollowed] = useState({});
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    usersApi.getSuggestions(4).then(data => { if (active) setSuggestions(data); })
      .catch(() => { if (active) { setSuggestions([]); setError('Could not load suggestions.'); } });
    return () => { active = false; };
  }, [user.id]);

  async function toggle(person) {
    setPending(person.id);
    setError('');
    const isFollowing = followed[person.id] ?? person.is_following;
    try {
      if (isFollowing) await usersApi.unfollowUser(person.id);
      else await usersApi.followUser(person.id);
      setFollowed(previous => ({ ...previous, [person.id]: !isFollowing }));
    } catch {
      setError('Could not update this follow. Try again.');
    } finally {
      setPending(null);
    }
  }

  return (
    <aside className="app-rail space-y-5 pt-[clamp(20px,3.1vw,36px)]" aria-label="Discover">
      <section className="panel px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><Users size={17} className="text-brand-400" /><h2 className="text-sm font-semibold">People to follow</h2></div>
          <Link to="/explore?tab=people" aria-label="Discover people" className="icon-button !min-h-8 !min-w-8"><ArrowUpRight size={16} /></Link>
        </div>
        {suggestions === null ? <PageSkeleton label="Loading suggestions" /> : suggestions.length ? (
          <ul className="space-y-3">
            {suggestions.map(person => (
              <li key={person.id} className="flex items-center justify-between gap-2">
                <Link to={`/profile/${person.username}`} className="flex min-w-0 items-center gap-2.5 rounded-lg">
                  <Avatar src={person.avatar_url} alt={person.full_name} size="sm" className="shrink-0" />
                  <span className="min-w-0"><span className="block truncate text-xs font-semibold">{person.full_name}</span>
                    <span className="block truncate text-[11px] text-text-secondary">@{person.username}</span></span>
                </Link>
                <button type="button" aria-label={`${followed[person.id] ?? person.is_following ? 'Unfollow' : 'Follow'} ${person.full_name}`}
                  title={followed[person.id] ?? person.is_following ? 'Following' : 'Follow'}
                  onClick={() => toggle(person)} disabled={pending !== null} className="pill-button secondary-button !min-h-8 !px-2.5 !text-[11px]">
                  {(followed[person.id] ?? person.is_following) ? 'Following' : <UserPlus size={15} />}
                </button>
              </li>
            ))}
          </ul>
        ) : !error && <p className="pb-1 text-xs text-text-secondary">You’re all caught up.</p>}
        {error && <p role="status" className="mt-2 text-xs text-text-secondary">{error}</p>}
      </section>
      <section className="panel p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Hash size={18} className="text-brand-400" /> Explore topics</h2>
        <div className="flex flex-wrap gap-2">
          {topics.map(topic => <Link key={topic} to={`/explore?q=${encodeURIComponent('#' + topic)}`}
            className="pill-button secondary-button !min-h-8 !rounded-full !px-3 !text-xs">#{topic}</Link>)}
        </div>
      </section>
      <Link to="/saved" className="panel flex items-center justify-between gap-3 p-4 text-sm font-semibold hover:bg-brand-50">
        <span className="flex items-center gap-2"><Bookmark size={18} className="text-brand-400" /> Saved posts</span><ArrowUpRight size={16} className="text-text-secondary" />
      </Link>
    </aside>
  );
}
