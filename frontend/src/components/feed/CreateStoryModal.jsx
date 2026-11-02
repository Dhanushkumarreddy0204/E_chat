import React, { useState } from 'react';
import { X, Image, Film, Sparkles, Loader2 } from 'lucide-react';
import { storiesApi } from '../../api/stories';
import { uploadApi } from '../../api/upload';

export const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }) => {
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('image');
  const [caption, setCaption] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#0f172a');
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const bgColors = [
    '#0f172a', '#1e1b4b', '#4c0519', '#022c22', '#172554', '#3b0764',
    'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
    'linear-gradient(135deg, #3b82f6, #06b6d4, #10b981)',
    'linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)'
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMediaFile(file);
    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      let mediaUrl = mediaPreview;

      if (mediaFile) {
        const uploadRes = await uploadApi.uploadFile(mediaFile);
        mediaUrl = uploadRes.url;
      } else {
        // Text story fallback placeholder image or solid background
        mediaUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
      }

      await storiesApi.createStory({
        media_url: mediaUrl,
        media_type: mediaType,
        caption: caption.trim(),
        duration_seconds: duration,
        background_color: backgroundColor,
      });

      onStoryCreated();
      onClose();
    } catch (err) {
      console.error('Error creating story:', err);
      alert('Failed to publish story.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-brand-100 p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-bold text-brand-900">Create New Story</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-brand-700 hover:text-brand-800 hover:bg-brand-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview Box */}
        <div 
          className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden flex items-center justify-center border border-brand-200/60 shadow-inner"
          style={{ background: backgroundColor }}
        >
          {mediaPreview ? (
            mediaType === 'video' ? (
              <video src={mediaPreview} className="w-full h-full object-contain" autoPlay muted loop />
            ) : (
              <img src={mediaPreview} alt="Preview" className="w-full h-full object-contain" />
            )
          ) : (
            <div className="text-center p-6 space-y-2">
              <p className="text-sm font-semibold text-brand-800">Choose a photo or video</p>
              <p className="text-xs text-brand-600">Stories disappear after 24 hours</p>
            </div>
          )}

          {caption && (
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <span className="inline-block px-3 py-1.5 rounded-xl bg-black/60 text-white text-xs font-medium backdrop-blur-xs">
                {caption}
              </span>
            </div>
          )}
        </div>

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Button */}
          <div className="flex items-center gap-3">
            <label className="flex-1 py-2.5 px-4 rounded-xl bg-brand-50 border border-brand-200 hover:border-brand-500 text-brand-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Image className="w-4 h-4 text-brand-500" />
              <span className="truncate max-w-xs">{mediaFile ? mediaFile.name : 'Upload Media (Photo/Video)'}</span>
              <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {/* Caption Input */}
          <div>
            <label className="text-xs font-semibold text-brand-700">Story Caption</label>
            <input
              type="text"
              placeholder="Add text or thought to your story..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="mt-1 w-full bg-white border border-brand-200 rounded-xl py-2.5 px-4 text-xs text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Duration Selector */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-brand-700">Duration (seconds)</label>
            <div className="flex gap-2">
              {[3, 5, 7, 10].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    duration === d ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Background Color Picker */}
          <div>
            <label className="text-xs font-semibold text-brand-700">Card Background</label>
            <div className="flex gap-2 mt-1.5 overflow-x-auto py-1">
              {bgColors.map((bg, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setBackgroundColor(bg)}
                  style={{ background: bg }}
                  className={`w-7 h-7 rounded-full shrink-0 border-2 transition-transform ${
                    backgroundColor === bg ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (!mediaFile && !caption)}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Share to Story</span>
          </button>
        </form>
      </div>
    </div>
  );
};
