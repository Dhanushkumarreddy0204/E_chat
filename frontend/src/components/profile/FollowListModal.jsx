import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, UserPlus, X } from 'lucide-react';
import { usersApi } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { ModalFrame } from '../common/ModalFrame';
import { PageSkeleton } from '../common/PageState';

export function FollowListModal({ isOpen, userId, type = 'followers', onClose }) {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const title = type === 'following' ? 'Following' : 'Followers';

  useEffect(() => {
    if (!isOpen || !userId) return;
    setList(null);
    setError('');
    let active = true;
    const request = type === 'following' ? usersApi.getFollowing(userId) : usersApi.getFollowers(userId);
    request.then(data => { if (active) setList(data); })
      .catch(() => { if (active) setError('Could not load this list.'); });
    return () => { active = false; };
  }, [isOpen, userId, type]);

  if (!isOpen || !userId) return null;
  async function toggle(person) {
    setBusy(person.id);
    setError('');
    try {
      if (person.is_following) await usersApi.unfollowUser(person.id);
      else await usersApi.followUser(person.id);
      setList(previous => previous.map(entry => entry.id === person.id ? { ...entry, is_following: !entry.is_following } : entry));
    } catch {
      setError('Could not update this follow.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <ModalFrame label={title} onClose={onClose}>
      <div className="modal-panel flex h-[min(63dvh,540px)] flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h2 className="section-title">{title}</h2>
          <button type="button" aria-label="Close" className="icon-button" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          {error && <p className="form-error mb-3" role="alert">{error}</p>}
          {!list ? !error && <PageSkeleton label={`Loading ${title.toLowerCase()}`} /> : list.length ?
            <ul className="space-y-2">
              {list.map(person => <li key={person.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-brand-50">
                <Link to={`/profile/${person.username}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md">
                  <Avatar src={person.avatar_url} alt={person.full_name} size="sm" className="shrink-0" />
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{person.full_name}</span>
                    <span className="block truncate text-xs text-text-secondary">@{person.username}</span></span>
                </Link>
                {user.id !== person.id && <button type="button" onClick={() => toggle(person)} disabled={busy !== null} aria-pressed={Boolean(person.is_following)}
                  className="pill-button secondary-button !min-h-8 !px-2.5 !text-xs">
                  {person.is_following ? <Check size={14} /> : <UserPlus size={14} />}{person.is_following ? 'Following' : 'Follow'}
                </button>}
              </li>)}
            </ul> : <p className="p-8 text-center text-sm text-text-secondary">{type === 'following' ? 'Not following anyone yet.' : 'No followers yet.'}</p>}
        </div>
      </div>
    </ModalFrame>
  );
}
