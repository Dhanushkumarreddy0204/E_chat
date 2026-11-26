import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, X } from 'lucide-react';
import { usersApi } from '../../api/users';
import { uploadApi } from '../../api/upload';
import { mediaUrl } from '../../api/urls';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { ModalFrame } from '../common/ModalFrame';

export function EditProfileModal({ onClose, onProfileUpdated }) {
  const { user, updateUser } = useAuth();
  const [avatar, setAvatar] = useState(user.avatar_url || '');
  const [cover, setCover] = useState(user.cover_url || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const avatarPicker = useRef(null);
  const coverPicker = useRef(null);

  async function upload(file, update) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Choose an image file.');
    setError('');
    setBusy(true);
    try {
      const result = await uploadApi.uploadFile(file);
      update(result.url);
    } catch {
      setError('Could not upload the image.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const fullName = fields.get('full_name').trim();
    if (!fullName) return setError('Enter your full name.');
    setError('');
    setBusy(true);
    try {
      const result = await usersApi.updateProfile({
        full_name: fullName,
        bio: fields.get('bio').trim(),
        website: fields.get('website').trim(),
        location: fields.get('location').trim(),
        avatar_url: avatar,
        cover_url: cover,
      });
      updateUser(result);
      onProfileUpdated(result);
      onClose();
    } catch {
      setError('Could not save your profile. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalFrame label="Edit profile" onClose={busy ? () => {} : onClose}>
      <div className="modal-panel space-y-4 overflow-y-auto p-5 sm:p-6">
        <header className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="section-title">Edit profile</h2>
          <button type="button" aria-label="Close" className="icon-button" disabled={busy} onClick={onClose}><X size={20} /></button>
        </header>
        <div className="relative mb-12">
          <div className="profile-cover !h-[115px] overflow-hidden rounded-xl">
            {cover && <img src={mediaUrl(cover)} alt="" className="h-full w-full object-cover" onError={event => { event.currentTarget.hidden = true; }} />}
          </div>
          <input type="file" accept="image/*" ref={avatarPicker} hidden onChange={event => {
            upload(event.target.files[0], setAvatar); event.target.value = '';
          }} />
          <input type="file" accept="image/*" ref={coverPicker} hidden onChange={event => {
            upload(event.target.files[0], setCover); event.target.value = '';
          }} />
          <button type="button" aria-label="Change cover photo" className="media-remove" onClick={() => coverPicker.current.click()} disabled={busy}><ImagePlus size={16} /></button>
          <button type="button" aria-label="Change profile picture" className="absolute -bottom-7 left-3 rounded-full bg-surface p-1.5"
            onClick={() => avatarPicker.current.click()} disabled={busy}><Avatar src={avatar} alt={user.full_name} size="lg" />
            <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-white"><ImagePlus size={13} /></span></button>
        </div>
        <form className="grid gap-3" onSubmit={submit} aria-busy={busy}>
          <label className="auth-label">Full name<input className="field" name="full_name" defaultValue={user.full_name} required disabled={busy} /></label>
          <label className="auth-label">Bio<textarea className="field resize-y" name="bio" rows={3} defaultValue={user.bio || ''} disabled={busy} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="auth-label">Location<input className="field" name="location" defaultValue={user.location || ''} disabled={busy} /></label>
            <label className="auth-label">Website<input className="field" name="website" inputMode="url" defaultValue={user.website || ''} disabled={busy} /></label>
          </div>
          {error && <p role="alert" className="form-error">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" className="pill-button secondary-button" disabled={busy} onClick={onClose}>Cancel</button>
            <button type="submit" className="pill-button primary-button disabled:opacity-50" disabled={busy}>
              {busy && <LoaderCircle size={16} className="animate-spin" />} Save profile
            </button>
          </div>
        </form>
      </div>
    </ModalFrame>
  );
}
