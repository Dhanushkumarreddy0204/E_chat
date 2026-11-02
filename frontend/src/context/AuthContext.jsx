import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);
const currentUserRequests = new Map();

const getCurrentUser = (token) => {
  if (!currentUserRequests.has(token)) {
    const request = authApi.getMe().finally(() => currentUserRequests.delete(token));
    currentUserRequests.set(token, request);
  }
  return currentUserRequests.get(token);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('echat_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const currentUser = await getCurrentUser(token);
        setUser(currentUser);
        localStorage.setItem('echat_user', JSON.stringify(currentUser));
      } catch (err) {
        console.error("Auth check failed:", err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (emailOrUsername, password) => {
    const data = await authApi.login({ email_or_username: emailOrUsername, password });
    localStorage.setItem('echat_token', data.access_token);
    localStorage.setItem('echat_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    localStorage.setItem('echat_token', data.access_token);
    localStorage.setItem('echat_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('echat_token');
    localStorage.removeItem('echat_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
    localStorage.setItem('echat_user', JSON.stringify({ ...user, ...updatedUser }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
