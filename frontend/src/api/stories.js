import apiClient from './client';

export const storiesApi = {
  getStoriesFeed: async () => {
    const response = await apiClient.get('/stories/feed');
    return response.data;
  },

  createStory: async (storyData) => {
    const response = await apiClient.post('/stories/', storyData);
    return response.data;
  },

  markStoryViewed: async (storyId) => {
    const response = await apiClient.post(`/stories/${storyId}/view`);
    return response.data;
  },

  reactToStory: async (storyId, emoji) => {
    const response = await apiClient.post(`/stories/${storyId}/react`, { emoji });
    return response.data;
  },

  deleteStory: async (storyId) => {
    const response = await apiClient.delete(`/stories/${storyId}`);
    return response.data;
  },
};
