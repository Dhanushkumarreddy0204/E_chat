import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Check, Link as LinkIcon, LogOut, MapPin, MessageCircle, Pencil, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { mediaUrl } from '../../api/urls';
import { Avatar } from '../common/Avatar';

function publicWebsite(value) {
  if (!value) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : 'https://' + value);
    return ['https:', 'http:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

export function ProfileHeader({ profileUser, isFollowing, onFollowToggle, onOpenEditProfile, onOpenFollowList }) {
  const { user, logout } = useAuth();
  const { startConversationWithUser } = useChat();
  const navigate = useNavigate();
  const [pending, setPending] = useState('');
  const [notice, setNotice] = useState('');
  const self = user?.id === profileUser.id;
  const website = publicWebsite(profileUser.website);

  async function action(name, work) {
    setPending(name);
    setNotice('');
    try { await work(); }
    catch { setNotice('Could not complete this action. Try again.'); }
    finally { setPending(''); }
  }

  return (
    <header className="panel overflow-hidden">
      <div className="profile-cover">
        {profileUser.cover_url && <img src={mediaUrl(profileUser.cover_url)} alt="" className="h-full w-full object-cover" decoding="async"
          onError={event => { event.currentTarget.hidden = true; }} />}
      </div>
      <div className="px-5 pb-5 sm:px-8 sm:pb-7">
        <div className="relative -mt-11 flex flex-wrap items-end justify-between gap-3 sm:-mt-14">
          <div className="h-auto w-fit rounded-full bg-surface p-1.5">
            <Avatar size="xl" src={profileUser.avatar_url} alt={profileUser.full_name} isOnline={profileUser.is_online} showOnlineStatus />
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {self ? <>
              <button type="button" className="pill-button secondary-button" onClick={onOpenEditProfile}><Pencil size={16} /> Edit profile</button>
              <button type="button" className="icon-button profile-signout" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={18} /></button>
            </> : <>
              <button type="button" className={`pill-button ${isFollowing ? 'secondary-button' : 'primary-button'}`}
                aria-pressed={isFollowing} disabled={Boolean(pending)} onClick={() => action('follow', onFollowToggle)}>
                {isFollowing ? <Check size={16} /> : <UserPlus size={16} />}{isFollowing ? 'Following' : 'Follow'}
              </button>
              <button type="button" className="pill-button secondary-button" disabled={Boolean(pending)} onClick={() => action('message', async () => {
                const conversation = await startConversationWithUser(profileUser.id);
                if (!conversation) throw new Error('Conversation not available');
                navigate('/messages');
              })}><MessageCircle size={17} /> Message</button>
            </>}
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <h1 className="page-title break-words !text-[clamp(32px,5vw,48px)]">{profileUser.full_name}</h1>
          <p className="text-sm text-text-secondary">@{profileUser.username}</p>
        </div>
        {profileUser.bio && <p className="mt-4 max-w-xl whitespace-pre-wrap break-words text-sm leading-relaxed">{profileUser.bio}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
          {profileUser.location && <span className="flex items-center gap-1.5"><MapPin size={15} />{profileUser.location}</span>}
          {website && <a href={website.href} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-brand-400 hover:underline"><LinkIcon size={15} />{website.hostname}</a>}
          {profileUser.created_at && <span className="flex items-center gap-1.5"><CalendarDays size={15} />Joined {format(new Date(profileUser.created_at), 'MMMM yyyy')}</span>}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-text-secondary">
          <span className="mr-2"><strong className="text-text">{profileUser.posts_count || 0}</strong> posts</span>
          {['followers', 'following'].map(type => <button key={type} type="button" className="pill-button secondary-button !min-h-8 !text-xs"
            onClick={() => onOpenFollowList(type)}>{profileUser[type + '_count'] || 0} {type}</button>)}
          {self && <Link to="/saved" className="ml-auto rounded-md text-brand-400 hover:underline">Saved posts</Link>}
        </div>
        {notice && <p role="status" className="mt-2 text-xs text-text-secondary">{notice}</p>}
      </div>
    </header>
  );
}
