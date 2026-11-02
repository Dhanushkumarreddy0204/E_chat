import React, { useState, useEffect } from 'react';
import { X, Users, Check, Loader2 } from 'lucide-react';
import { usersApi } from '../../api/users';
import { chatApi } from '../../api/chat';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';

export const CreateGroupModal = ({ isOpen, onClose }) => {
  const { fetchConversations, setActiveConversation } = useChat();
  const [groupName, setGroupName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await usersApi.getSuggestions(15);
        setSuggestions(data);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleUserSelect = (uid) => {
    setSelectedUserIds(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;

    try {
      setSubmitting(true);
      const conv = await chatApi.createOrGetConversation(
        selectedUserIds, 
        true, 
        groupName.trim(), 
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80'
      );
      await fetchConversations();
      setActiveConversation(conv);
      onClose();
    } catch (err) {
      console.error('Error creating group:', err);
      alert('Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-brand-100 p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between border-b border-brand-200 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-500" />
            <h3 className="text-base font-bold text-brand-900">Create New Group</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-brand-700 hover:text-brand-800 hover:bg-brand-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-brand-700">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Frontend Dream Team 🚀"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mt-1 w-full bg-white border border-brand-200 rounded-xl py-2.5 px-4 text-xs sm:text-sm text-brand-900 placeholder-brand-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-700">Select Members ({selectedUserIds.length})</label>
            <div className="mt-2 max-h-56 overflow-y-auto space-y-2 border border-brand-200 rounded-xl p-2 bg-brand-50/40">
              {loading ? (
                <div className="text-center py-4 text-xs text-brand-600">Loading users...</div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-4 text-xs text-brand-600">No users found.</div>
              ) : (
                suggestions.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleUserSelect(u.id)}
                      className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-brand-600/20 border border-brand-500/40' : 'hover:bg-brand-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar src={u.avatar_url} alt={u.full_name} size="sm" />
                        <div>
                          <p className="text-xs font-bold text-brand-900">{u.full_name}</p>
                          <p className="text-[10px] text-brand-600">@{u.username}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        isSelected ? 'bg-brand-600 border-brand-500 text-white' : 'border-brand-200'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !groupName.trim() || selectedUserIds.length === 0}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            <span>Create Group</span>
          </button>
        </form>
      </div>
    </div>
  );
};
