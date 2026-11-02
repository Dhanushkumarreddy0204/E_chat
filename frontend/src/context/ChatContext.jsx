import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { chatApi } from '../api/chat';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { latestMessage, latestReaction, sendTyping } = useSocket();
  
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

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

  // Load messages when active conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeConversation) {
        setMessages([]);
        return;
      }
      try {
        setLoadingMessages(true);
        const data = await chatApi.getMessages(activeConversation.id);
        setMessages(data);
        // Mark conversation as read
        await chatApi.markConversationRead(activeConversation.id);
        // Update local conversation unread count
        setConversations(prev => prev.map(c => 
          c.id === activeConversation.id ? { ...c, unread_count: 0 } : c
        ));
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [activeConversation]);

  // Listen to incoming real-time messages
  useEffect(() => {
    if (!latestMessage) return;

    // Update conversation last message & list order
    setConversations(prev => {
      const exists = prev.some(c => c.id === latestMessage.conversation_id);
      if (exists) {
        return prev.map(c => {
          if (c.id === latestMessage.conversation_id) {
            const isCurrentChat = activeConversation && activeConversation.id === c.id;
            return {
              ...c,
              last_message: latestMessage,
              unread_count: isCurrentChat ? 0 : (c.unread_count || 0) + 1,
              updated_at: latestMessage.created_at,
            };
          }
          return c;
        }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      } else {
        fetchConversations();
        return prev;
      }
    });

    // If belongs to active chat, append message
    if (activeConversation && activeConversation.id === latestMessage.conversation_id) {
      setMessages(prev => {
        if (prev.some(m => m.id === latestMessage.id)) return prev;
        return [...prev, latestMessage];
      });
      chatApi.markConversationRead(activeConversation.id);
    }
  }, [latestMessage, activeConversation, fetchConversations]);

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
      setMessages(prev => [...prev, newMsg]);

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
