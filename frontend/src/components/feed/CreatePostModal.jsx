import { useEffect, useRef, useState } from 'react';
import { Film, Image, LoaderCircle, Plus, X } from 'lucide-react';
import { postsApi } from '../../api/posts';
import { uploadApi } from '../../api/upload';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { ModalFrame } from '../common/ModalFrame';

export function CreatePostModal({ isOpen, onClose, onPostCreated }) {
  const { user } = useAuth();
  const [postType, setPostType] = useState('post');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const picker = useRef(null);

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (postType === 'clip' ? !files.length : !caption.trim() && !files.length) return;
    setBusy(true);
    setError('');
    try {
      const media = [];
      for (const file of files) {
        const response = await uploadApi.uploadFile(file);
        media.push({ url: response.url, media_type: response.media_type, aspect_ratio: 1 });
      }
      await postsApi.createPost({
        caption: caption.trim(),
        media,
        location: form.get('location').trim(),
        tags: [...new Set(form.get('tags').split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean))],
        is_clip: postType === 'clip',
      });
      onPostCreated(postType);
      onClose();
    } catch (failure) {
      const detail = failure.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not publish. Your draft is still here.');
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;
  return (
    <ModalFrame label="Create post" onClose={busy ? () => {} : onClose}>
      <div className="modal-panel space-y-4 overflow-y-auto p-5 sm:p-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="section-title">Create post</h2>
          <button type="button" aria-label="Close" disabled={busy} className="icon-button" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2.5"><Avatar src={user?.avatar_url} alt={user?.full_name} size="sm" />
            <span className="truncate text-sm font-semibold">{user?.full_name}</span></span>
          <div className="flex gap-1.5">
            {[['post', 'Post', Image], ['clip', 'Clip', Film]].map(([value, label, Icon]) =>
              <button key={value} type="button" disabled={busy} aria-pressed={postType === value}
                className={`pill-button ${postType === value ? 'primary-button' : 'secondary-button'}`}
                onClick={() => {
                  setPostType(value);
                  setFiles(previous => value === 'clip' ? previous.filter(file => file.type.startsWith('video/')).slice(0, 1) : previous);
                  setError('');
                }}><Icon size={15} />{label}</button>)}
          </div>
        </div>
        <form className="grid gap-4" onSubmit={submit} aria-busy={busy}>
          <label className="auth-label">Caption<textarea className="field min-h-24 resize-y" placeholder="What would you like to share?"
            value={caption} onChange={event => setCaption(event.target.value)} disabled={busy} /></label>
          {files.length > 0 && <div className="grid grid-cols-2 gap-2">
            {files.map((file, index) => <div key={previews[index] || index} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-brand-100">
              {previews[index] && (file.type.startsWith('video/')
                ? <video src={previews[index]} controls playsInline className="h-full w-full object-contain" />
                : <img src={previews[index]} alt={file.name} className="h-full w-full object-cover" />)}
              <button type="button" aria-label={`Remove ${file.name}`} className="media-remove" disabled={busy}
                onClick={() => setFiles(previous => previous.filter((_, position) => position !== index))}><X size={16} /></button>
            </div>)}
          </div>}
          <input ref={picker} type="file" hidden accept={postType === 'clip' ? 'video/*' : 'image/*,video/*'} multiple={postType === 'post'}
            onChange={event => {
              const selected = [...event.target.files];
              event.target.value = '';
              if (!selected.length) return;
              const usable = selected.filter(file => postType === 'clip' ? file.type.startsWith('video/') : /^(image|video)\//.test(file.type));
              if (!usable.length) return setError(postType === 'clip' ? 'Choose a video for your clip.' : 'Choose a photo or video.');
              setError('');
              setFiles(previous => postType === 'clip' ? usable.slice(0, 1) : [...previous, ...usable]);
            }} />
          <button type="button" onClick={() => picker.current.click()} disabled={busy}
            className="pill-button secondary-button justify-self-start"><Plus size={17} /> {postType === 'clip' ? 'Choose video' : 'Add photos or video'}</button>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="auth-label">Location <input className="field" name="location" placeholder="Optional" disabled={busy} /></label>
            <label className="auth-label">Tags <input className="field" name="tags" placeholder="Design, travel" disabled={busy} /></label>
          </div>
          {error && <div role="alert" className="form-error">{error}</div>}
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} disabled={busy} className="pill-button secondary-button">Cancel</button>
            <button type="submit" disabled={busy || (postType === 'clip' ? !files.length : !files.length && !caption.trim())}
              className="pill-button primary-button disabled:opacity-45">
              {busy && <LoaderCircle size={16} className="animate-spin" />}{busy ? 'Publishing…' : postType === 'clip' ? 'Publish clip' : 'Publish post'}
            </button>
          </footer>
        </form>
      </div>
    </ModalFrame>
  );
}
