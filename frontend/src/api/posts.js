import apiClient from './client';

export const postsApi = {
  getFeed: async (page = 1, limit = 15) => {
    const response = await apiClient.get(`/posts/feed?page=${page}&limit=${limit}`);
    return response.data;
  },

  getExplore: async (page = 1, limit = 20) => {
    const response = await apiClient.get(`/posts/explore?page=${page}&limit=${limit}`);
    return response.data;
  },

  getUserPosts: async (usernameOrId) => {
    const response = await apiClient.get(`/posts/user/${usernameOrId}`);
    return response.data;
  },

  getPostById: async (postId) => {
    const response = await apiClient.get(`/posts/${postId}`);
    return response.data;
  },

  createPost: async (postData) => {
    const response = await apiClient.post('/posts/', postData);
    return response.data;
  },

  deletePost: async (postId) => {
    const response = await apiClient.delete(`/posts/${postId}`);
    return response.data;
  },

  toggleLike: async (postId) => {
    const response = await apiClient.post(`/posts/${postId}/like`);
    return response.data;
  },

  getComments: async (postId) => {
    const response = await apiClient.get(`/posts/${postId}/comments`);
    return response.data;
  },

  addComment: async (postId, content) => {
    const response = await apiClient.post(`/posts/${postId}/comments`, { content });
    return response.data;
  },

  toggleBookmark: async (postId) => {
    const response = await apiClient.post(`/posts/${postId}/bookmark`);
    return response.data;
  },

  getSavedPosts: async () => {
    const response = await apiClient.get('/posts/saved/all');
    return response.data;
  },

  getClips: async (page = 1, limit = 10) => {
    const response = await apiClient.get(`/posts/clips?page=${page}&limit=${limit}`);
    return response.data;
  },

  viewPost: async (postId) => {
    const response = await apiClient.post(`/posts/${postId}/view`);
    return response.data;
  },
};
