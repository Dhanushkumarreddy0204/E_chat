import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useClipFlow } from '../context/ClipFlowContext';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatWindow } from '../components/chat/ChatWindow';
import { CreateGroupModal } from '../components/chat/CreateGroupModal';

export const ChatPage = () => {
  const navigate = useNavigate();
  const { activeConversation, setActiveConversation } = useChat();
  const { triggeringConvId, shouldRestoreClips } = useClipFlow();
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const handleBack = () => {
    if (triggeringConvId || shouldRestoreClips) {
      navigate('/clips');
    } else {
      setActiveConversation(null);
    }
  };

  return (
    <div className="w-full h-[calc(100dvh-112px)] md:h-full flex overflow-hidden rounded-none md:rounded-2xl bg-white shadow-sm border-0 md:border md:border-brand-200">
      {/* Sidebar List (Hidden on mobile when conversation is active) */}
      <div className={`w-full md:w-80 lg:w-96 h-full shrink-0 ${activeConversation ? 'hidden md:block' : 'block'}`}>
        <ChatSidebar onOpenCreateGroup={() => setIsGroupModalOpen(true)} />
      </div>

      {/* Chat Conversation View (Hidden on mobile when no conversation active) */}
      <div className={`flex-1 min-w-0 h-full ${activeConversation ? 'block' : 'hidden md:block'}`}>
        <ChatWindow onBack={handleBack} />
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
    </div>
  );
};
