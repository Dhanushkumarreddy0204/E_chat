import apiClient from './client';

export const notificationsApi = {
  getNotifications: async (limit = 30) => {
    const response = await apiClient.get(`/notifications/?limit=${limit}`);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (notificationId) => {
    const response = await apiClient.post(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.post('/notifications/read-all');
    return response.data;
  },
};
