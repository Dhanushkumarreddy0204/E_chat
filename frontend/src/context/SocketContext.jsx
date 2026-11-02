import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({}); // { [conversationId]: [userIds] }
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const [latestMessage, setLatestMessage] = useState(null);
  const [latestReaction, setLatestReaction] = useState(null);
  
  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    if (!token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const wsOrigin = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    let stopped = false;
    let ws;
    let reconnectDelay = 500;

    const clearHeartbeat = () => {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    };

    const connect = () => {
      if (stopped) return;

      ws = new WebSocket(`${wsOrigin}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectDelay = 500;
        console.log('WebSocket connected successfully');
        clearHeartbeat();
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { type, data } = payload;

          switch (type) {
            case 'presence_update':
              setOnlineUsers((prev) => {
                const updated = new Set(prev);
                if (data.is_online) {
                  updated.add(data.user_id);
                } else {
                  updated.delete(data.user_id);
                }
                return updated;
              });
              break;

            case 'user_typing':
              setTypingUsers((prev) => {
                const convId = data.conversation_id;
                const currentList = prev[convId] || [];
                let updatedList;
                if (data.is_typing) {
                  updatedList = currentList.includes(data.user_id) ? currentList : [...currentList, data.user_id];
                } else {
                  updatedList = currentList.filter(id => id !== data.user_id);
                }
                return { ...prev, [convId]: updatedList };
              });
              break;

            case 'new_message':
              setLatestMessage(data);
              break;

            case 'message_reaction':
              setLatestReaction(data);
              break;

            case 'new_notification':
              setLatestNotification(data);
              setUnreadNotifications(prev => prev + 1);
              break;

            case 'pong':
              break;

            default:
              break;
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection failed; retrying.', err);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed.');
        clearHeartbeat();
        if (wsRef.current === ws) wsRef.current = null;
        if (!stopped) {
          reconnectTimerRef.current = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        }
      };
    };

    const connectionTimeout = setTimeout(connect, 0);

    return () => {
      stopped = true;
      clearTimeout(connectionTimeout);
      clearHeartbeat();
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      const activeSocket = wsRef.current;
      if (activeSocket && (activeSocket.readyState === WebSocket.OPEN || activeSocket.readyState === WebSocket.CONNECTING)) {
        activeSocket.close();
      }
      if (wsRef.current === activeSocket) wsRef.current = null;
    };
  }, [token]);

  const sendTyping = useCallback((conversationId, recipientIds, isTyping) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: isTyping ? 'typing_start' : 'typing_stop',
        data: {
          conversation_id: conversationId,
          recipient_ids: recipientIds,
        }
      }));
    }
  }, []);

  const isUserOnline = useCallback((userId) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  return (
    <SocketContext.Provider value={{
      onlineUsers,
      isUserOnline,
      typingUsers,
      sendTyping,
      latestMessage,
      latestReaction,
      latestNotification,
      unreadNotifications,
      setUnreadNotifications
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
