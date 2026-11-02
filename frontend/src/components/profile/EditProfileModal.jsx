import React, { useState } from 'react';
import { X, Image, Loader2, Sparkles } from 'lucide-react';
import { usersApi } from '../../api/users';
import { uploadApi } from '../../api/upload';
import { useAuth } from '../../context/AuthContext';

export const EditProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
  const { user, updateUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [location, setLocation] = useState(user?.location || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [coverUrl, setCoverUrl] = useState(user?.cover_url || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      const res = await uploadApi.uploadFile(file);
      setAvatarUrl(res.url);
    } catch (err) {
      console.error('Error uploading avatar:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      const res = await uploadApi.uploadFile(file);
      setCoverUrl(res.url);
    } catch (err) {
      console.error('Error uploading cover:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const updated = await usersApi.updateProfile({
        full_name: fullName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        location: location.trim(),
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      });

      updateUser(updated);
      if (onProfileUpdated) onProfileUpdated(updated);
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl border border-brand-100 p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-brand-200 pb-3 shrink-0">
          <h3 className="text-base font-bold text-brand-900">Edit Profile</h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-brand-700 hover:text-brand-800 hover:bg-brand-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Avatar & Cover Upload Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <label className="p-3 rounded-xl bg-white border border-brand-200 hover:border-brand-500 flex flex-col items-center gap-1.5 cursor-pointer text-center">
              <Image className="w-5 h-5 text-brand-500" />
              <span className="text-xs font-semibold text-brand-800">Change Avatar</span>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>

            <label className="p-3 rounded-xl bg-white border border-brand-200 hover:border-brand-500 flex flex-col items-center gap-1.5 cursor-pointer text-center">
              <Image className="w-5 h-5 text-pink-500" />
              <span className="text-xs font-semibold text-brand-800">Change Cover</span>
              <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-700">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full bg-white border border-brand-200 rounded-xl py-2.5 px-4 text-xs sm:text-sm text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-700">Bio</label>
            <textarea
              rows="3"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself..."
              className="mt-1 w-full bg-white border border-brand-200 rounded-xl p-3 text-xs sm:text-sm text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-700">Location</label>
            <input
              type="text"
              value={location}
              placeholder="City, Country"
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full bg-white border border-brand-200 rounded-xl py-2.5 px-4 text-xs sm:text-sm text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-700">Website</label>
            <input
              type="text"
              value={website}
              placeholder="https://yourwebsite.com"
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 w-full bg-white border border-brand-200 rounded-xl py-2.5 px-4 text-xs sm:text-sm text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-brand-600 active:scale-[0.99] disabled:opacity-50 transition-all shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Save Profile</span>
          </button>
        </form>
      </div>
    </div>
  );
};
