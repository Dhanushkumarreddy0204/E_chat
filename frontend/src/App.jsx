import { lazy, Suspense, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { ClipFlowProvider, useClipFlow } from './context/ClipFlowContext';

import { Sidebar } from './components/common/Sidebar';
import { RightPanel } from './components/common/RightPanel';
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { PageSkeleton } from './components/common/PageState';
const CreatePostModal = lazy(() => import('./components/feed/CreatePostModal').then(module => ({ default: module.CreatePostModal })));

const PostPage = lazy(() => import('./pages/PostPage').then((page) => ({ default: page.PostPage })));
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
    lastHandledMessageIdRef.current = latestMessage.id;

    const isOnClips = location.pathname.startsWith('/clips');
    if (!isOnClips) return;

    const convId = latestMessage.conversation_id;
    if (!isClipFlowEnabledFor(convId)) return;

    let conversation = conversations.find((c) => c.id === convId);
    if (!conversation) {
      conversation = { id: convId, participants: [] };
    }

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
  const [postRevision, setPostRevision] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const showRail = location.pathname === '/' || location.pathname === '/explore';
  const isFullScreenRoute =
    location.pathname.startsWith('/messages') || location.pathname.startsWith('/clips');

  useLayoutEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  if (loading) return <div className="page-stack mx-auto w-full max-w-xl px-4"><PageSkeleton label="Loading EChat" media /></div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SocketProvider>
      <ChatProvider>
        <ClipFlowProvider>
          <div className="app-shell">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3">Skip to content</a>
            <Sidebar onOpenCreatePost={() => setIsCreatePostOpen(true)} />
            <div className="app-body min-w-0">
              <Navbar onOpenCreatePost={() => setIsCreatePostOpen(true)} />
              <div className="app-content" data-rail={showRail} data-immersive={isFullScreenRoute}>
                <main id="main-content" tabIndex={-1} className="app-main" data-immersive={isFullScreenRoute}>
                  <Suspense fallback={<div className="page-stack"><PageSkeleton label="Loading page" media /></div>}>
                <Routes>
                  <Route
                    path="/"
                    element={<HomePage onOpenCreatePost={() => setIsCreatePostOpen(true)} postRevision={postRevision} />}
                  />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/clips" element={<ClipsPage key={postRevision} />} />
                  <Route path="/post/:id" element={<PostPage />} />
                  <Route path="/messages" element={<ChatPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/saved" element={<SavedPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/profile/:username" element={<ProfilePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                  </Suspense>
                </main>
                {showRail && <RightPanel />}
              </div>
            </div>
            <BottomNav />

            {/* Global Create Post Modal */}
            {isCreatePostOpen && <Suspense fallback={null}><CreatePostModal
              isOpen
              onClose={() => setIsCreatePostOpen(false)}
              onPostCreated={type => {
                setPostRevision(previous => previous + 1);
                navigate(type === 'clip' ? '/clips' : '/');
              }}
            /></Suspense>}

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
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
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
