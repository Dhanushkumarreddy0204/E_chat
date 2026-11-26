import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Grid2X2, UserRound } from 'lucide-react';
import { PageState, PageSkeleton } from '../components/common/PageState';
import { usersApi } from '../api/users';
import { postsApi } from '../api/posts';
import { useAuth } from '../context/AuthContext';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { PostGrid } from '../components/profile/PostGrid';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { CommentsModal } from '../components/feed/CommentsModal';
import { FollowListModal } from '../components/profile/FollowListModal';

export const ProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [followListType, setFollowListType] = useState(null);

  const targetUsername = username || currentUser?.username;

  const fetchProfileData = async () => {
    if (!targetUsername) return;
    try {
      setLoading(true);
      setProfileUser(null);
      const [uData, pData] = await Promise.all([
        usersApi.getProfile(targetUsername),
        postsApi.getUserPosts(targetUsername)
      ]);
      setProfileUser(uData);
      setUserPosts(pData);
      setIsFollowing(uData.is_following);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [targetUsername]);

  const handleFollowToggle = async () => {
    if (!profileUser) return;
    try {
      if (isFollowing) {
        await usersApi.unfollowUser(profileUser.id);
        setIsFollowing(false);
        setProfileUser(prev => ({ ...prev, followers_count: Math.max(0, (prev.followers_count || 1) - 1) }));
      } else {
        await usersApi.followUser(profileUser.id);
        setIsFollowing(true);
        setProfileUser(prev => ({ ...prev, followers_count: (prev.followers_count || 0) + 1 }));
      }
    } catch (err) {
      throw err;
    }
  };

  if (loading) return <div className="page-stack"><PageSkeleton label="Loading profile" media /></div>;
  if (!profileUser) return <div className="page-stack"><PageState icon={UserRound} title="Profile unavailable"
    action="Retry" onAction={fetchProfileData} /></div>;

  return (
    <div className="page-stack mx-auto max-w-[1040px]">
      {/* Header */}
      <ProfileHeader
        profileUser={profileUser}
        isFollowing={isFollowing}
        onFollowToggle={handleFollowToggle}
        onOpenEditProfile={() => setIsEditOpen(true)}
        onOpenFollowList={(type) => setFollowListType(type)}
      />

      {/* Posts Grid Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-brand-200 pb-3">
          <Grid2X2 className="w-4 h-4 text-brand-400" />
          <h3 className="section-title">
            Posts ({userPosts.length})
          </h3>
        </div>

        <PostGrid posts={userPosts} onPostClick={(p) => setActivePost(p)} />
      </section>

      {/* Edit Profile Modal */}
      {isEditOpen && <EditProfileModal
        onClose={() => setIsEditOpen(false)}
        onProfileUpdated={(updated) => {
          setProfileUser(prev => ({ ...prev, ...updated }));
        }}
      />}

      {/* Post Comments Modal */}
      <CommentsModal
        isOpen={Boolean(activePost)}
        post={activePost}
        onClose={() => setActivePost(null)}
      />

      <FollowListModal
        isOpen={Boolean(followListType)}
        userId={profileUser.id}
        type={followListType || 'followers'}
        onClose={() => setFollowListType(null)}
      />
    </div>
  );
};
