import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, UserPlus, Users, X } from 'lucide-react';
import { usersApi } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';

export const FollowListModal = ({ isOpen, userId, type = 'followers', onClose }) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState({});

  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadList = async () => {
      try {
        setLoading(true);
        const data = type === 'following'
          ? await usersApi.getFollowing(userId)
          : await usersApi.getFollowers(userId);
        const list = Array.isArray(data) ? data : [];
        setUsers(list);
        const map = {};
        list.forEach((u) => {
          map[u.id] = Boolean(u.is_following);
        });
        setFollowingMap(map);
      } catch (err) {
        console.error('Error loading follow list:', err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadList();
  }, [isOpen, userId, type]);

  if (!isOpen || !userId) return null;

  const title = type === 'following' ? 'Following' : 'Followers';

  const handleFollowToggle = async (targetUser) => {
    const isCurrentlyFollowing = followingMap[targetUser.id] ?? targetUser.is_following;
    try {
      if (isCurrentlyFollowing) {
        await usersApi.unfollowUser(targetUser.id);
        setFollowingMap((prev) => ({ ...prev, [targetUser.id]: false }));
      } else {
        await usersApi.followUser(targetUser.id);
        setFollowingMap((prev) => ({ ...prev, [targetUser.id]: true }));
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  const handleUserClick = (username) => {
    onClose();
    navigate(`/profile/${username}`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md h-[82vh] max-h-[620px] rounded-2xl bg-white shadow-xl border border-brand-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3.5 sm:p-4 border-b border-brand-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-brand-900">
              {title} {loading ? '' : `(${users.length})`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-brand-700 hover:text-brand-800 hover:bg-brand-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-brand-600 text-xs">
              {type === 'following' ? 'Not following anyone yet.' : 'No followers yet.'}
            </div>
          ) : (
            users.map((u) => {
              const isMe = currentUser?.id === u.id;
              const isFollowing = followingMap[u.id] ?? u.is_following;
              return (
                <div key={u.id} className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-brand-50/70">
                  <button
                    type="button"
                    className="flex items-center gap-2.5 min-w-0 text-left"
                    onClick={() => handleUserClick(u.username)}
                  >
                    <Avatar src={u.avatar_url} alt={u.full_name} size="sm" isOnline={u.is_online} showOnlineStatus />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-brand-900 truncate">{u.full_name}</p>
                      <p className="text-[10px] text-brand-600 truncate">@{u.username}</p>
                    </div>
                  </button>

                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => handleFollowToggle(u)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1 shrink-0 ${
                        isFollowing
                          ? 'bg-brand-50 text-brand-800 hover:bg-brand-100'
                          : 'bg-brand-500 text-white hover:bg-brand-600'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
