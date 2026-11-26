import { useEffect, useState } from 'react';
import { Check, LoaderCircle, Search, X } from 'lucide-react';
import { usersApi } from '../../api/users';
import { chatApi } from '../../api/chat';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { ModalFrame } from '../common/ModalFrame';
import { PageSkeleton } from '../common/PageState';

export function CreateGroupModal({ onClose }) {
  const { user } = useAuth();
  const { fetchConversations, setActiveConversation } = useChat();
  const [groupName, setGroupName] = useState('');
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState(null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setMembers(null);
    let active = true;
    const term = query.trim();
    const timer = setTimeout(() => {
      (term ? usersApi.searchUsers(term) : usersApi.getSuggestions(20))
        .then(data => { if (active) setMembers(data.filter(person => person.id !== user.id)); })
        .catch(() => { if (active) { setMembers([]); setError('Could not load people.'); } });
    }, term ? 220 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [query, user.id]);

  async function submit(event) {
    event.preventDefault();
    if (!groupName.trim() || !selected.length) return;
    setBusy(true);
    setError('');
    try {
      const conversation = await chatApi.createOrGetConversation(selected.map(person => person.id), true, groupName.trim());
      await fetchConversations();
      setActiveConversation(conversation);
      onClose();
    } catch {
      setError('Could not create the group.');
    } finally {
      setBusy(false);
    }
  }

  function toggle(person) {
    setSelected(previous => previous.some(entry => entry.id === person.id) ? previous.filter(entry => entry.id !== person.id) : [...previous, person]);
  }

  return (
    <ModalFrame label="Create group chat" onClose={busy ? () => {} : onClose}>
      <div className="modal-panel space-y-4 overflow-y-auto p-5 sm:p-6">
        <header className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="section-title">New group chat</h2>
          <button type="button" aria-label="Close" className="icon-button" onClick={onClose} disabled={busy}><X size={20} /></button>
        </header>
        <form onSubmit={submit} className="grid gap-3">
          <label className="auth-label">Group name<input required className="field" value={groupName} onChange={event => setGroupName(event.target.value)} disabled={busy} /></label>
          <label className="relative block">
            <span className="sr-only">Find members</span>
            <Search size={17} className="absolute left-3 top-3 text-text-secondary" />
            <input className="field !pl-10" placeholder="Find members" value={query} onChange={event => setQuery(event.target.value)} disabled={busy} />
          </label>
          {selected.length > 0 && <div className="flex flex-wrap gap-1.5" aria-label="Selected members">
            {selected.map(person => <button type="button" key={person.id} aria-label={`Remove ${person.full_name}`}
              onClick={() => toggle(person)} disabled={busy} className="pill-button secondary-button !min-h-8 !text-xs">{person.full_name}<X size={13} /></button>)}
          </div>}
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {!members ? <PageSkeleton label="Loading people" /> : !members.length ? <p className="p-3 text-sm text-text-secondary">No matching people.</p> :
              members.map(person => {
                const checked = selected.some(entry => entry.id === person.id);
                return <button type="button" key={person.id} aria-pressed={checked} onClick={() => toggle(person)} disabled={busy}
                  className={`chat-row ${checked ? 'chat-row-selected' : ''}`}>
                  <Avatar src={person.avatar_url} alt={person.full_name} size="sm" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{person.full_name}</span>
                    <span className="block truncate text-xs text-text-secondary">@{person.username}</span></span>
                  {checked && <Check size={17} className="text-brand-400" />}
                </button>;
              })}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="pill-button primary-button disabled:opacity-50" disabled={busy || !groupName.trim() || !selected.length}>
            {busy && <LoaderCircle size={16} className="animate-spin" />} Create group
          </button>
        </form>
      </div>
    </ModalFrame>
  );
}
