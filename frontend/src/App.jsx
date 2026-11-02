import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { ClipFlowProvider, useClipFlow } from './context/ClipFlowContext';

import { Sidebar } from './components/common/Sidebar';
import { RightPanel } from './components/common/RightPanel';
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { CreatePostModal } from './components/feed/CreatePostModal';

const HomePage = lazy(() => import('./pages/HomePage').then((page) => ({ default: page.HomePage })));
const ExplorePage = lazy(() => import('./pages/ExplorePage').then((page) => ({ default: page.ExplorePage })));
const ClipsPage = lazy(() => import('./pages/ClipsPage').then((page) => ({ default: page.ClipsPage })));
const ChatPage = lazy(() => import('./pages/ChatPage').then((page) => ({ default: page.ChatPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((page) => ({ default: page.NotificationsPage })));
const SavedPage = lazy(() => import('./pages/SavedPage').then((page) => ({ default: page.SavedPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((page) => ({ default: page.ProfilePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((page) => ({ default: page.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((page) => ({ default: page.RegisterPage })));

/**
 * ClipFlowWatcher
 *
 * A side-effect component that:
 *  1. Watches for incoming real-time messages via SocketContext.
 *  2. If the user is currently on /clips AND ClipFlow is enabled for the
 *     conversation that received the message, it automatically navigates to
 *     /messages and opens that conversation.
 *  3. Before navigating, it saves the current clip scroll position via
 *     window.__clipsScrollRef so ClipsPage can restore it on return.
 */
const ClipFlowWatcher = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { latestMessage } = useSocket();
  const { conversations, setActiveConversation } = useChat();
  const { isClipFlowEnabledFor, triggerClipFlowNavigation } = useClipFlow();

  const lastHandledMessageIdRef = useRef(null);

  useEffect(() => {
    if (!latestMessage) return;
    if (latestMessage.id === lastHandledMessageIdRef.current) return;

    const isOnClips = location.pathname.startsWith('/clips');
    if (!isOnClips) return;

    const convId = latestMessage.conversation_id;
    if (!isClipFlowEnabledFor(convId)) return;

    const conversation = conversations.find((c) => c.id === convId);
    if (!conversation) return;

    lastHandledMessageIdRef.current = latestMessage.id;

    // Read the clips container scroll position exposed by ClipsPage
    const scrollTop = window.__clipsScrollRef?.current?.scrollTop ?? 0;

    triggerClipFlowNavigation(
      convId,
      scrollTop,
      navigate,
      setActiveConversation,
      conversation
    );
  }, [
    latestMessage,
    location.pathname,
    conversations,
    isClipFlowEnabledFor,
    triggerClipFlowNavigation,
    navigate,
    setActiveConversation,
  ]);

  return null;
};

// Protected Route + App Shell
const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const location = useLocation();

  const isFullScreenRoute =
    location.pathname.startsWith('/messages') || location.pathname.startsWith('/clips');

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SocketProvider>
      <ChatProvider>
        <ClipFlowProvider>
          <div className="min-h-[100dvh] md:h-screen bg-background text-text flex flex-col md:flex-row md:overflow-hidden">
            {/* Left Navigation Sidebar */}
            <Sidebar onOpenCreatePost={() => setIsCreatePostOpen(true)} />

            {/* Mobile Top Navbar */}
            <Navbar onOpenCreatePost={() => setIsCreatePostOpen(true)} />

            {/* Center Main Scrollable Content */}
            <main
              className={`flex-1 min-w-0 h-full overflow-y-auto ${
                isFullScreenRoute ? '' : 'pb-20 md:pb-6'
              }`}
            >
              <Suspense fallback={<div className="w-full h-full min-h-[50vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}>
                <Routes>
                  <Route
                    path="/"
                    element={<HomePage onOpenCreatePost={() => setIsCreatePostOpen(true)} />}
                  />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/clips" element={<ClipsPage />} />
                  <Route path="/messages" element={<ChatPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/saved" element={<SavedPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/profile/:username" element={<ProfilePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>

            {/* Right Suggested Panel */}
            <RightPanel />

            {/* Mobile Bottom Navigation */}
            <BottomNav />

            {/* Global Create Post Modal */}
            <CreatePostModal
              isOpen={isCreatePostOpen}
              onClose={() => setIsCreatePostOpen(false)}
              onPostCreated={() => {
                setIsCreatePostOpen(false);
                window.location.reload();
              }}
            />

            {/* ClipFlow: watches incoming messages, auto-navigates from Clips to Chat */}
            <ClipFlowWatcher />
          </div>
        </ClipFlowProvider>
      </ChatProvider>
    </SocketProvider>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center bg-background"><div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
