import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { storiesApi } from '../../api/stories';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';

export const StoriesBar = ({ onOpenCreateStory, onOpenStoryViewer }) => {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const data = await storiesApi.getStoriesFeed();
      setStoryGroups(data);
    } catch (err) {
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleStoryClick = (group, index) => {
    onOpenStoryViewer(storyGroups, index);
  };

  return (
    <div className="w-full overflow-x-auto py-3 px-1 no-scrollbar">
      <div className="flex items-center gap-4 min-w-max">
        {/* Add Story Button for current user */}
        <div className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={onOpenCreateStory}>
          <div className="relative">
            <div className="w-16 h-16 rounded-full p-0.5 border-2 border-dashed border-brand-200 group-hover:border-brand-500 transition-colors flex items-center justify-center">
              <Avatar src={user?.avatar_url} alt={user?.full_name} size="lg" />
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-[11px] font-medium text-brand-800 group-hover:text-brand-400">Your Story</span>
        </div>

        {/* Stories from friends & following */}
        {storyGroups.map((group, idx) => (
          <div 
            key={group.user.id} 
            className="flex flex-col items-center gap-1.5 cursor-pointer group"
            onClick={() => handleStoryClick(group, idx)}
          >
            <div className={`p-0.5 rounded-full transition-transform group-hover:scale-105 ${group.has_unseen ? 'story-ring-unseen' : 'story-ring-seen'}`}>
              <div className="p-0.5 rounded-full">
                <Avatar src={group.user.avatar_url} alt={group.user.full_name} size="lg" />
              </div>
            </div>
            <span className="text-[11px] font-medium text-brand-800 max-w-[68px] truncate group-hover:text-brand-400">
              {group.user.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
