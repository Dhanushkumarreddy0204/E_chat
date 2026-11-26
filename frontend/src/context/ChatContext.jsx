import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { chatApi } from '../api/chat';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { latestMessage, latestReaction, latestConversation, latestReadReceipt } = useSocket();
  
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const lastHandledMessage = useRef(null);
  const activeConversationId = activeConversation?.id;
  const activeId = useRef(activeConversationId);

  useEffect(() => {
    activeId.current = activeConversationId;
  }, [activeConversationId]);

  // Load conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConversations(true);
      const data = await chatApi.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!latestConversation) return;
    setConversations(previous => previous.some(item => item.id === latestConversation.id)
      ? previous
      : [{ ...latestConversation, unread_count: 0 }, ...previous]);
  }, [latestConversation]);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    if (!activeConversationId) {
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    chatApi.getMessages(activeConversationId).then(data => {
      if (cancelled) return;
      setMessages(current => {
        const existing = new Set(data.map(message => message.id));
        return [...data, ...current.filter(message => !existing.has(message.id))];
      });
      setConversations(previous => previous.map(item =>
        item.id === activeConversationId ? { ...item, unread_count: 0 } : item
      ));
      return chatApi.markConversationRead(activeConversationId);
    }).catch(error => {
      if (!cancelled) console.error('Error loading messages:', error.message);
    }).finally(() => {
      if (!cancelled) setLoadingMessages(false);
    });

    return () => { cancelled = true; };
  }, [activeConversationId]);

  useEffect(() => {
    if (!latestMessage || lastHandledMessage.current === latestMessage.id) return;
    lastHandledMessage.current = latestMessage.id;
    const isOpen = activeConversationId === latestMessage.conversation_id;

    if (!conversations.some(item => item.id === latestMessage.conversation_id)) {
      fetchConversations();
    } else {
      setConversations(previous => previous.map(item => item.id !== latestMessage.conversation_id ? item : {
        ...item,
        last_message: latestMessage,
        unread_count: isOpen ? 0 : (item.unread_count || 0) + 1,
        updated_at: latestMessage.created_at,
      }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
    }

    if (isOpen) {
      setMessages(previous => previous.some(message => message.id === latestMessage.id)
        ? previous
        : [...previous, latestMessage]);
      chatApi.markConversationRead(activeConversationId).catch(error => {
        console.error('Error marking conversation read:', error.message);
      });
    }
  }, [latestMessage, activeConversationId, conversations, fetchConversations]);

  useEffect(() => {
    if (!latestReadReceipt || latestReadReceipt.conversation_id !== activeConversationId) return;
    setMessages(previous => previous.map(message => ({
      ...message,
      read_by: [...new Set([...(message.read_by || []), latestReadReceipt.reader_id])],
    })));
  }, [latestReadReceipt, activeConversationId]);

  // Listen to message reactions
  useEffect(() => {
    if (!latestReaction) return;
    setMessages(prev => prev.map(msg => {
      if (msg.id === latestReaction.message_id) {
        const filtered = (msg.reactions || []).filter(r => r.user_id !== latestReaction.reaction.user_id);
        return {
          ...msg,
          reactions: [...filtered, latestReaction.reaction]
        };
      }
      return msg;
    }));
  }, [latestReaction]);

  // Send message action
  const sendMessage = async (content, mediaUrl = null, mediaType = 'text', replyToId = null) => {
    if (!activeConversation) return;

    try {
      const messageData = {
        conversation_id: activeConversation.id,
        content: content || '',
        message_type: mediaType,
        media_url: mediaUrl,
        reply_to_id: replyToId,
      };

      const newMsg = await chatApi.sendMessage(messageData);
      if (activeId.current === newMsg.conversation_id) {
        setMessages(prev => prev.some(message => message.id === newMsg.id) ? prev : [...prev, newMsg]);
      }

      // Update conversations list
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversation.id) {
          return { ...c, last_message: newMsg, updated_at: newMsg.created_at };
        }
        return c;
      }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));

      return newMsg;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  // Add reaction action
  const reactToMessage = async (messageId, emoji) => {
    try {
      const res = await chatApi.reactToMessage(messageId, emoji);
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const filtered = (msg.reactions || []).filter(r => r.user_id !== user.id);
          return {
            ...msg,
            reactions: [...filtered, res.reaction]
          };
        }
        return msg;
      }));
    } catch (err) {
      console.error('Error reacting to message:', err);
    }
  };

  const startConversationWithUser = async (otherUserId) => {
    try {
      const conv = await chatApi.createOrGetConversation([otherUserId], false);
      setConversations(prev => {
        if (prev.some(c => c.id === conv.id)) return prev;
        return [conv, ...prev];
      });
      setActiveConversation(conv);
      return conv;
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  return (
    <ChatContext.Provider value={{
      conversations,
      activeConversation,
      setActiveConversation,
      messages,
      loadingConversations,
      loadingMessages,
      sendMessage,
      reactToMessage,
      fetchConversations,
      startConversationWithUser,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
