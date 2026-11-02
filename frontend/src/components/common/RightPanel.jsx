import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, UserPlus, Check, TrendingUp } from 'lucide-react';
import { usersApi } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './Avatar';
import { FollowListModal } from '../profile/FollowListModal';

export const RightPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [followingMap, setFollowingMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [followListType, setFollowListType] = useState(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const data = await usersApi.getSuggestions(5);
        setSuggestions(data);
      } catch (err) {
        console.error('Error loading suggestions:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchSuggestions();
    }
  }, [user]);

  const handleFollowToggle = async (targetUser) => {
    const isCurrentlyFollowing = followingMap[targetUser.id] ?? targetUser.is_following;
    try {
      if (isCurrentlyFollowing) {
        await usersApi.unfollowUser(targetUser.id);
        setFollowingMap(prev => ({ ...prev, [targetUser.id]: false }));
      } else {
        await usersApi.followUser(targetUser.id);
        setFollowingMap(prev => ({ ...prev, [targetUser.id]: true }));
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  const trendingTags = [
    { tag: 'FastAPI', posts: '12.4K posts', category: 'Technology' },
    { tag: 'WebSockets', posts: '8.1K posts', category: 'Engineering' },
    { tag: 'UIUXDesign', posts: '24.9K posts', category: 'Creative' },
    { tag: 'FullStack', posts: '19.3K posts', category: 'Development' },
    { tag: 'Docker', posts: '15.6K posts', category: 'DevOps' },
  ];

  return (
    <aside className="hidden xl:block w-80 2xl:w-96 h-screen sticky top-0 p-5 space-y-6 shrink-0 overflow-y-auto border-l border-brand-200 bg-surface">
      {/* Current User Card */}
      {user && (
        <div 
          onClick={() => navigate(`/profile/${user.username}`)}
          className="flex items-center justify-between p-3.5 rounded-xl bg-white shadow-sm border border-brand-100 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar_url} alt={user.full_name} size="lg" isOnline={true} showOnlineStatus={true} />
            <div>
              <p className="text-sm font-bold text-brand-900 hover:text-brand-400 transition-colors">{user.full_name}</p>
              <p className="text-xs text-brand-700">@{user.username}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-brand-700">
                <span
                  className="hover:text-brand-500"
                  onClick={(e) => { e.stopPropagation(); setFollowListType('followers'); }}
                >
                  <strong className="text-brand-900">{user.followers_count}</strong> followers
                </span>
                <span
                  className="hover:text-brand-500"
                  onClick={(e) => { e.stopPropagation(); setFollowListType('following'); }}
                >
                  <strong className="text-brand-900">{user.following_count}</strong> following
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Users */}
      <div className="p-4 rounded-xl bg-white shadow-sm border border-brand-100 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-800">Suggested For You</h3>
          </div>
          <span className="text-xs text-brand-400 hover:underline cursor-pointer" onClick={() => navigate('/explore')}>See all</span>
        </div>

        <div className="space-y-3">
          {suggestions.length === 0 && !loading && (
            <p className="text-xs text-brand-600 py-2">No new suggestions right now.</p>
          )}

          {suggestions.map((sug) => {
            const isFollowing = followingMap[sug.id] ?? sug.is_following;
            return (
              <div key={sug.id} className="flex items-center justify-between gap-2">
                <div 
                  className="flex items-center gap-2.5 cursor-pointer min-w-0"
                  onClick={() => navigate(`/profile/${sug.username}`)}
                >
                  <Avatar src={sug.avatar_url} alt={sug.full_name} size="sm" isOnline={sug.is_online} showOnlineStatus={true} />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-brand-900 hover:text-brand-400 truncate">{sug.full_name}</p>
                    <p className="text-[10px] text-brand-600 truncate">@{sug.username}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleFollowToggle(sug)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1 shrink-0 ${
                    isFollowing 
                      ? 'bg-brand-50 text-brand-800 hover:bg-brand-100 hover:text-brand-900 border border-brand-200'
                      : 'bg-brand-500 text-white hover:bg-brand-600 shadow-xs'
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="p-4 rounded-xl bg-white shadow-sm border border-brand-100 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-pink-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-800">Trending Right Now</h3>
        </div>

        <div className="space-y-2.5">
          {trendingTags.map((item) => (
            <div 
              key={item.tag} 
              className="group cursor-pointer hover:bg-brand-50/40 p-2 rounded-xl transition-colors"
              onClick={() => navigate(`/explore?q=${item.tag}`)}
            >
              <div className="flex items-center justify-between text-[11px] text-brand-600">
                <span>{item.category}</span>
                <span>{item.posts}</span>
              </div>
              <p className="text-xs font-semibold text-brand-900 group-hover:text-brand-400 transition-colors">#{item.tag}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Meta */}
      <div className="px-2 text-[11px] text-brand-500 space-y-1">
        <p>© 2025 EChat Inc. Production Social & Messaging Architecture.</p>
        <p>Built with FastAPI, React, MongoDB & WebSockets.</p>
      </div>

      {user && (
        <FollowListModal
          isOpen={Boolean(followListType)}
          userId={user.id}
          type={followListType || 'followers'}
          onClose={() => setFollowListType(null)}
        />
      )}
    </aside>
  );
};
