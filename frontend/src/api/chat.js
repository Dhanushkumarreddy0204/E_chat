import apiClient from './client';

export const chatApi = {
  getConversations: async () => {
    const response = await apiClient.get('/chat/conversations');
    return response.data;
  },

  createOrGetConversation: async (participantIds, isGroup = false, groupName = null, groupAvatar = null) => {
    const response = await apiClient.post('/chat/conversations', {
      participant_ids: participantIds,
      is_group: isGroup,
      group_name: groupName,
      group_avatar: groupAvatar,
    });
    return response.data;
  },

  getMessages: async (conversationId, limit = 50, beforeId = null) => {
    let url = `/chat/conversations/${conversationId}/messages?limit=${limit}`;
    if (beforeId) url += `&before_id=${beforeId}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  sendMessage: async (messageData) => {
    const response = await apiClient.post('/chat/messages', messageData);
    return response.data;
  },

  reactToMessage: async (messageId, emoji) => {
    const response = await apiClient.post(`/chat/messages/${messageId}/react?emoji=${encodeURIComponent(emoji)}`);
    return response.data;
  },

  markConversationRead: async (conversationId) => {
    const response = await apiClient.post(`/chat/conversations/${conversationId}/read`);
    return response.data;
  },
};
