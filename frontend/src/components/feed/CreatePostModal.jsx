import React, { useState } from 'react';
import { X, Image, MapPin, Hash, Loader2, Sparkles, Video } from 'lucide-react';
import { postsApi } from '../../api/posts';
import { uploadApi } from '../../api/upload';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';

export const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const { user } = useAuth();
  const [postType, setPostType] = useState('post'); // 'post' or 'clip'
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (postType === 'clip') {
      const videoFiles = files.filter(f => f.type.startsWith('video/'));
      if (videoFiles.length === 0) {
        alert('Please select a video file for a Clip.');
        return;
      }
      setMediaFiles([videoFiles[0]]);
      setMediaPreviews([{ url: URL.createObjectURL(videoFiles[0]), type: 'video' }]);
    } else {
      setMediaFiles(files);
      const previews = files.map(f => ({
        url: URL.createObjectURL(f),
        type: f.type.startsWith('video/') ? 'video' : 'image'
      }));
      setMediaPreviews(previews);
    }
  };

  const handleRemoveMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (postType === 'post' && !caption.trim() && mediaFiles.length === 0) return;
    if (postType === 'clip' && mediaFiles.length === 0) {
      alert('A video is required for a Clip.');
      return;
    }

    try {
      setLoading(true);
      const uploadedMedia = [];

      for (const file of mediaFiles) {
        const uploadRes = await uploadApi.uploadFile(file);
        uploadedMedia.push({
          url: uploadRes.url,
          media_type: uploadRes.media_type,
          aspect_ratio: 1.0,
        });
      }

      const tags = tagsInput
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      await postsApi.createPost({
        caption: caption.trim(),
        media: uploadedMedia,
        location: location.trim(),
        tags: tags,
        is_clip: postType === 'clip'
      });

      setCaption('');
      setLocation('');
      setTagsInput('');
      setMediaFiles([]);
      setMediaPreviews([]);
      
      onPostCreated();
      onClose();
    } catch (err) {
      console.error('Error creating post:', err);
      alert('Failed to publish.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-brand-200 p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-200 pb-3">
          <div className="flex items-center gap-3">
            <Avatar src={user?.avatar_url} alt={user?.full_name} size="md" />
            <div>
              <p className="text-sm font-bold text-brand-900">{user?.full_name}</p>
              <p className="text-xs text-brand-700">Create new {postType === 'clip' ? 'Clip' : 'Post'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-brand-700 hover:text-brand-800 hover:bg-brand-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post Type Selector */}
        <div className="flex p-1 bg-brand-50 rounded-xl">
          <button
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
              postType === 'post' ? 'bg-white text-brand-800 shadow-sm' : 'text-brand-600 hover:text-brand-800'
            }`}
            onClick={() => { setPostType('post'); setMediaFiles([]); setMediaPreviews([]); }}
          >
            <Image className="w-4 h-4" />
            Standard Post
          </button>
          <button
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
              postType === 'clip' ? 'bg-white text-brand-800 shadow-sm' : 'text-brand-600 hover:text-brand-800'
            }`}
            onClick={() => { setPostType('clip'); setMediaFiles([]); setMediaPreviews([]); }}
          >
            <Video className="w-4 h-4" />
            Short Clip
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            rows="3"
            placeholder={postType === 'clip' ? "Describe your clip..." : "What's happening in your world?"}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full bg-white border border-brand-200 rounded-xl p-3.5 text-sm text-brand-900 placeholder-brand-300 focus:outline-none focus:border-brand-500 transition-colors resize-none"
          />

          {mediaPreviews.length > 0 && (
            <div className={`grid gap-2 overflow-y-auto p-1 ${postType === 'clip' ? 'grid-cols-1' : 'grid-cols-2 max-h-56'}`}>
              {mediaPreviews.map((m, idx) => (
                <div key={idx} className={`relative rounded-xl overflow-hidden border border-brand-200 ${postType === 'clip' ? 'h-64 flex justify-center bg-black' : 'h-36'}`}>
                  {m.type === 'video' ? (
                    <video src={m.url} className={postType === 'clip' ? "h-full object-contain" : "w-full h-full object-cover"} controls />
                  ) : (
                    <img src={m.url} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/70 text-brand-900 hover:bg-brand-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Add location (e.g. Tokyo)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white border border-brand-200 rounded-xl py-2 pl-8 pr-3 text-xs text-brand-900 placeholder-brand-300 focus:outline-none focus:border-brand-500"
              />
              <MapPin className="w-3.5 h-3.5 text-brand-400 absolute left-2.5 top-2.5" />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Tags (e.g. funny, tech)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-white border border-brand-200 rounded-xl py-2 pl-8 pr-3 text-xs text-brand-900 placeholder-brand-300 focus:outline-none focus:border-brand-500"
              />
              <Hash className="w-3.5 h-3.5 text-brand-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-brand-200">
            <label className="py-2 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-800 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors">
              {postType === 'clip' ? (
                <><Video className="w-4 h-4 text-brand-500" /><span>Select Video</span></>
              ) : (
                <><Image className="w-4 h-4 text-brand-500" /><span>Attach Media</span></>
              )}
              <input 
                type="file" 
                multiple={postType !== 'clip'} 
                accept={postType === 'clip' ? 'video/*' : 'image/*,video/*'} 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>

            <button
              type="submit"
              disabled={loading || (postType === 'post' && !caption.trim() && mediaFiles.length === 0) || (postType === 'clip' && mediaFiles.length === 0)}
              className="py-2.5 px-6 rounded-xl bg-brand-500 text-white font-bold text-xs flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Publish {postType === 'clip' ? 'Clip' : 'Post'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
