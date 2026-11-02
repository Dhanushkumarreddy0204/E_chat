import apiClient from './client';

export const usersApi = {
  getProfile: async (usernameOrId) => {
    const response = await apiClient.get(`/users/${usernameOrId}`);
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await apiClient.put('/users/profile', profileData);
    return response.data;
  },

  searchUsers: async (query) => {
    const response = await apiClient.get(`/users/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getSuggestions: async (limit = 10) => {
    const response = await apiClient.get(`/users/suggestions?limit=${limit}`);
    return response.data;
  },

  followUser: async (userId) => {
    const response = await apiClient.post(`/users/${userId}/follow`);
    return response.data;
  },

  unfollowUser: async (userId) => {
    const response = await apiClient.delete(`/users/${userId}/unfollow`);
    return response.data;
  },

  getFollowers: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/followers`);
    return response.data;
  },

  getFollowing: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/following`);
    return response.data;
  },
};
