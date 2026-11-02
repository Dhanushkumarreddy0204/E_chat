import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Link as LinkIcon, 
  Calendar, 
  UserPlus, 
  Check, 
  MessageSquare, 
  Edit3 
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { usersApi } from '../../api/users';
import { Avatar } from '../common/Avatar';

export const ProfileHeader = ({ profileUser, isFollowing, onFollowToggle, onOpenEditProfile, onOpenFollowList }) => {
  const { user: currentUser } = useAuth();
  const { startConversationWithUser } = useChat();
  const navigate = useNavigate();

  const isMe = currentUser && currentUser.id === profileUser.id;

  const handleMessageClick = async () => {
    await startConversationWithUser(profileUser.id);
    navigate('/messages');
  };

  return (
    <div className="rounded-xl bg-white shadow-sm border border-brand-100 overflow-hidden mb-6">
      {/* Cover Banner */}
      <div className="relative h-36 sm:h-52 md:h-56 w-full bg-brand-50 overflow-hidden">
        {profileUser.cover_url ? (
          <img 
            src={profileUser.cover_url} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-brand-400 to-emerald-600 opacity-30" />
        )}
      </div>

      {/* Profile Details Bar */}
      <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-0 relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 -mt-14 sm:-mt-20 mb-4">
          {/* Avatar */}
          <div className="p-1 rounded-full bg-white inline-block shadow-sm">
            <Avatar 
              src={profileUser.avatar_url} 
              alt={profileUser.full_name} 
              size="2xl" 
              isOnline={profileUser.is_online}
              showOnlineStatus={true}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isMe ? (
              <button
                onClick={onOpenEditProfile}
                className="px-4 py-2 rounded-xl bg-brand-50 border border-brand-200 text-xs font-semibold text-brand-900 hover:bg-brand-100 flex items-center gap-2 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                <button
                  onClick={onFollowToggle}
                  className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                    isFollowing
                      ? 'bg-brand-50 text-brand-800 hover:bg-brand-100 hover:text-brand-900 border border-brand-200'
                      : 'bg-brand-500 text-white shadow-brand-500/30 hover:bg-brand-600 active:scale-95'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Follow</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleMessageClick}
                  className="px-4 py-2 rounded-xl bg-brand-50 border border-brand-200 text-xs font-semibold text-brand-900 hover:bg-brand-100 hover:text-brand-900 flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Message</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bio & Details */}
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold text-brand-900 flex items-center gap-2">
              {profileUser.full_name}
            </h2>
            <p className="text-xs text-brand-700">@{profileUser.username}</p>
          </div>

          {profileUser.bio && (
            <p className="text-xs sm:text-sm text-brand-800 leading-relaxed max-w-2xl whitespace-pre-line">
              {profileUser.bio}
            </p>
          )}

          {/* Links & Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-brand-700 pt-1">
            {profileUser.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-pink-400" />
                <span>{profileUser.location}</span>
              </div>
            )}
            {profileUser.website && (
              <a 
                href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`}
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1 text-brand-400 hover:underline"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{profileUser.website}</span>
              </a>
            )}
            {profileUser.created_at && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                <span>Joined {format(new Date(profileUser.created_at), 'MMMM yyyy')}</span>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 pt-3 border-t border-brand-200/60 text-xs">
            <div>
              <strong className="text-brand-900 font-bold">{profileUser.posts_count || 0}</strong>{' '}
              <span className="text-brand-700">Posts</span>
            </div>
            <button
              type="button"
              onClick={() => onOpenFollowList && onOpenFollowList('followers')}
              className="hover:text-brand-500 transition-colors"
            >
              <strong className="text-brand-900 font-bold">{profileUser.followers_count || 0}</strong>{' '}
              <span className="text-brand-700">Followers</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenFollowList && onOpenFollowList('following')}
              className="hover:text-brand-500 transition-colors"
            >
              <strong className="text-brand-900 font-bold">{profileUser.following_count || 0}</strong>{' '}
              <span className="text-brand-700">Following</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
