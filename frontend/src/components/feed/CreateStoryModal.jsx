import { useEffect, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, X } from 'lucide-react';
import { storiesApi } from '../../api/stories';
import { uploadApi } from '../../api/upload';
import { ModalFrame } from '../common/ModalFrame';

const backgrounds = [
  ['Forest', '#244c38'], ['Slate', '#233746'], ['Clay', '#693e30'], ['Plum', '#483452'],
  ['Moss', '#4a552c'], ['Ink', '#172723'],
];

export function CreateStoryModal({ isOpen, onClose, onStoryCreated }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [duration, setDuration] = useState(5);
  const [background, setBackground] = useState(backgrounds[0][1]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const picker = useRef(null);

  useEffect(() => {
    const url = file ? URL.createObjectURL(file) : '';
    setPreview(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file]);

  async function submit(event) {
    event.preventDefault();
    if (!file && !caption.trim()) return;
    setBusy(true);
    setError('');
    try {
      const media = file ? await uploadApi.uploadFile(file) : null;
      await storiesApi.createStory({
        media_url: media?.url || '', media_type: media?.media_type || 'text',
        background_color: background, caption: caption.trim(), duration_seconds: duration,
      });
      onStoryCreated();
      onClose();
    } catch (failure) {
      const detail = failure.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not publish your story.');
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;
  return (
    <ModalFrame label="Create story" onClose={busy ? () => {} : onClose}>
      <div className="modal-panel space-y-4 overflow-y-auto p-5 sm:p-6">
        <header className="flex items-center justify-between border-b border-border pb-3">
          <div><h2 className="section-title">Create story</h2><p className="mt-1 text-xs text-text-secondary">Visible for 24 hours</p></div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose} disabled={busy}><X size={20} /></button>
        </header>
        <div className="relative grid h-[min(28dvh,230px)] place-items-center overflow-hidden rounded-2xl p-4 text-center text-white" style={{ background }}>
          {preview && (file?.type.startsWith('video/') ? <video className="absolute inset-0 h-full w-full object-contain" src={preview} muted controls playsInline />
            : <img className="absolute inset-0 h-full w-full object-contain" src={preview} alt="Story preview" />)}
          {caption.trim() ? <p className={`z-[1] max-w-[90%] break-words ${preview ? 'self-end rounded-lg bg-black/60 px-3 py-1.5 text-sm' : 'font-display text-2xl'}`}>{caption}</p> :
            !preview && <span className="text-sm text-white/90">Story preview</span>}
        </div>
        <form onSubmit={submit} className="grid gap-4" aria-busy={busy}>
          <input ref={picker} type="file" hidden accept="image/*,video/*" onChange={event => {
            const next = event.target.files[0];
            event.target.value = '';
            if (!next) return;
            if (!/^(image|video)\//.test(next.type)) return setError('Choose a photo or video.');
            setFile(next); setError('');
          }} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => picker.current.click()} disabled={busy} className="pill-button secondary-button"><ImagePlus size={17} />{file ? 'Replace media' : 'Add photo or video'}</button>
            {file && <button type="button" onClick={() => setFile(null)} disabled={busy} className="pill-button secondary-button">Remove media</button>}
          </div>
          <label className="auth-label">Story caption<input className="field" placeholder="Write something…" value={caption} disabled={busy}
            onChange={event => setCaption(event.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <fieldset className="space-y-1.5"><legend className="text-xs font-semibold">Duration</legend><div className="flex flex-wrap gap-1.5">
              {[3, 5, 7, 10].map(value => <button key={value} type="button" disabled={busy} aria-pressed={duration === value} onClick={() => setDuration(value)}
                className={`pill-button !min-h-8 !px-2.5 ${duration === value ? 'primary-button' : 'secondary-button'}`}>{value}s</button>)}
            </div></fieldset>
            <fieldset className="space-y-1.5"><legend className="text-xs font-semibold">Background</legend><div className="flex flex-wrap gap-2">
              {backgrounds.map(([name, value]) => <button type="button" key={name} title={name} aria-label={name} aria-pressed={background === value}
                onClick={() => setBackground(value)} disabled={busy}
                className={`h-7 w-7 rounded-full ${background === value ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-surface' : ''}`}
                style={{ background: value }} />)}
            </div></fieldset>
          </div>
          {error && <p role="alert" className="form-error">{error}</p>}
          <button type="submit" disabled={busy || !file && !caption.trim()} className="pill-button primary-button disabled:opacity-45">
            {busy && <LoaderCircle size={16} className="animate-spin" />}{busy ? 'Publishing…' : 'Share story'}
          </button>
        </form>
      </div>
    </ModalFrame>
  );
}
