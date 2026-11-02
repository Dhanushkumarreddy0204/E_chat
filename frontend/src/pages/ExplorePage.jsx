import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Sparkles, UserPlus, Check, Hash, Grid } from 'lucide-react';
import { postsApi } from '../api/posts';
import { usersApi } from '../api/users';
import { Avatar } from '../components/common/Avatar';
import { PostGrid } from '../components/profile/PostGrid';
import { CommentsModal } from '../components/feed/CommentsModal';

export const ExplorePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'people'
  const [posts, setPosts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activePost, setActivePost] = useState(null);

  useEffect(() => {
    const fetchExplore = async () => {
      try {
        setLoading(true);
        const data = await postsApi.getExplore(1, 30);
        setPosts(data.items);
      } catch (err) {
        console.error('Error fetching explore posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExplore();
  }, []);

  // Handle Search Queries
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await usersApi.searchUsers(searchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-3 sm:px-4 space-y-6">
      {/* Search Input Header */}
      <div className="p-4 rounded-xl bg-white shadow-sm border border-brand-100 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search creators, tech tags, topics (#FastAPI, #Design)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/90 border border-brand-200 rounded-xl py-3 pl-11 pr-4 text-xs sm:text-sm text-brand-900 placeholder-brand-300 focus:outline-none focus:border-brand-500 transition-colors shadow-inner"
          />
          <Search className="w-5 h-5 text-brand-600 absolute left-3.5 top-3" />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'posts'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                : 'bg-white text-brand-700 hover:text-brand-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Top Posts</span>
          </button>

          <button
            onClick={() => setActiveTab('people')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'people'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                : 'bg-white text-brand-700 hover:text-brand-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>People {searchResults.length > 0 && `(${searchResults.length})`}</span>
          </button>
        </div>
      </div>

      {/* Search Results / People Tab */}
      {activeTab === 'people' && (
        <div className="rounded-xl bg-white shadow-sm border border-brand-100 p-4 space-y-3">
          <h3 className="text-xs font-bold text-brand-700 uppercase tracking-wider">
            {searchQuery ? `Users matching "${searchQuery}"` : 'Discover People'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {searchResults.map((u) => (
              <div
                key={u.id}
                onClick={() => navigate(`/profile/${u.username}`)}
                className="p-3 rounded-xl bg-brand-50/30 border border-brand-200 hover:border-brand-500/40 cursor-pointer flex items-center justify-between gap-2.5 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Avatar src={u.avatar_url} alt={u.full_name} size="md" isOnline={u.is_online} showOnlineStatus={true} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-brand-900 truncate">{u.full_name}</p>
                    <p className="text-[11px] text-brand-600 truncate">@{u.username}</p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${u.username}`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 text-xs font-semibold hover:bg-brand-100 hover:text-brand-900 transition-colors shrink-0"
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explore Posts Gallery Grid */}
      {activeTab === 'posts' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-700">Discover Content</h3>
            <span className="text-xs text-brand-600">{posts.length} trending items</span>
          </div>

          <PostGrid
            posts={posts}
            onPostClick={(p) => setActivePost(p)}
          />
        </section>
      )}

      {/* Post Details / Comments Modal */}
      <CommentsModal
        isOpen={Boolean(activePost)}
        post={activePost}
        onClose={() => setActivePost(null)}
      />
    </div>
  );
};
