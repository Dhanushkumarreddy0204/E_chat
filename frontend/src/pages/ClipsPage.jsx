import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { postsApi } from '../api/posts';
import { Heart, MessageCircle, Share2, Music, User } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { CommentsModal } from '../components/feed/CommentsModal';
import { useNavigate } from 'react-router-dom';
import { useClipFlow } from '../context/ClipFlowContext';

export const ClipsPage = () => {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingScrollTop, setPendingScrollTop] = useState(null);
  const [activeClipId, setActiveClipId] = useState(null);
  const [activeCommentsClip, setActiveCommentsClip] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const containerRef = useRef(null);
  const restoreRequestedRef = useRef(false);

  const { shouldRestoreClips, consumeRestoredScrollTop } = useClipFlow();

  // Expose the scroll container ref globally so ClipFlowWatcher can read scrollTop
  useEffect(() => {
    window.__clipsScrollRef = containerRef;
    return () => {
      window.__clipsScrollRef = null;
    };
  }, []);

  // Restore scroll position when returning from a ClipFlow-triggered navigation
  useEffect(() => {
    if (!shouldRestoreClips || restoreRequestedRef.current) return;
    restoreRequestedRef.current = true;
    setPendingScrollTop(consumeRestoredScrollTop());
  }, [shouldRestoreClips, consumeRestoredScrollTop]);

  useLayoutEffect(() => {
    if (pendingScrollTop === null || loading || clips.length === 0 || !containerRef.current) return;

    const container = containerRef.current;
    const previousScrollBehavior = container.style.scrollBehavior;
    container.style.scrollBehavior = 'auto';
    container.scrollTop = pendingScrollTop;
    container.style.scrollBehavior = previousScrollBehavior;
    setPendingScrollTop(null);
  }, [pendingScrollTop, loading, clips.length]);

  const fetchClips = async (pageNum = 1) => {
    try {
      const res = await postsApi.getClips(pageNum, 10);
      if (pageNum === 1) {
        setClips(res.items);
      } else {
        setClips((prev) => [...prev, ...res.items]);
      }
      setHasMore(res.has_more);
      if (res.items.length > 0 && pageNum === 1) {
        setActiveClipId(res.items[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load clips. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClips();
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !loading) {
      setPage((p) => p + 1);
      fetchClips(page + 1);
    }
  };

  if (loading && clips.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center pt-20">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
        <p className="text-brand-600 mt-4 text-sm">Loading clips...</p>
      </div>
    );
  }

  if (error && clips.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center pt-20">
        <p className="text-brand-700 font-medium">{error}</p>
        <button
          onClick={() => fetchClips(1)}
          className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-semibold hover:bg-brand-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center pt-20">
        <div className="p-4 bg-brand-50 rounded-full mb-4">
          <Music className="w-8 h-8 text-brand-400" />
        </div>
        <h2 className="text-lg font-bold text-brand-800">No Clips Yet</h2>
        <p className="text-brand-600 text-sm">Create the first clip!</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="h-[calc(100dvh-112px)] md:h-screen w-full bg-black overflow-y-scroll snap-y snap-mandatory flex flex-col scroll-smooth no-scrollbar"
        onScroll={handleScroll}
        ref={containerRef}
        style={{ scrollBehavior: 'smooth' }}
      >
        {clips.map((clip) => (
          <ClipItem
            key={clip.id}
            clip={clip}
            isActive={activeClipId === clip.id}
            onSetActive={() => setActiveClipId(clip.id)}
            onOpenComments={() => setActiveCommentsClip(clip)}
          />
        ))}
      </div>

      <CommentsModal
        isOpen={Boolean(activeCommentsClip)}
        post={activeCommentsClip}
        onClose={() => setActiveCommentsClip(null)}
        onCommentAdded={() => {
          if (!activeCommentsClip) return;
          setClips((prev) =>
            prev.map((c) =>
              c.id === activeCommentsClip.id
                ? { ...c, comments_count: (c.comments_count || 0) + 1 }
                : c
            )
          );
          setActiveCommentsClip((prev) =>
            prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev
          );
        }}
      />
    </>
  );
};

const ClipItem = ({ clip, isActive, onSetActive, onOpenComments }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(clip.is_liked);
  const [likesCount, setLikesCount] = useState(clip.likes_count);
  const [commentsCount, setCommentsCount] = useState(clip.comments_count);

  useEffect(() => {
    setCommentsCount(clip.comments_count);
  }, [clip.comments_count]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onSetActive();
        }
      },
      { threshold: 0.6 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [onSetActive]);

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch((e) => console.log('Autoplay prevented', e));
      postsApi.viewPost(clip.id).catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [isActive, clip.id]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const res = await postsApi.toggleLike(clip.id);
      setIsLiked(res.is_liked);
      setLikesCount(res.likes_count);
    } catch (err) {
      console.error(err);
    }
  };

  const mediaUrl = clip.media && clip.media.length > 0 ? clip.media[0].url : '';

  return (
    <div
      ref={containerRef}
      className="w-full h-full shrink-0 snap-start snap-always relative flex items-center justify-center bg-black"
      onClick={togglePlay}
    >
      {/* Video Player */}
      <video
        ref={videoRef}
        src={mediaUrl}
        className="w-full h-full object-cover md:max-w-[450px]"
        loop
        playsInline
        muted={false}
      />

      {/* Overlay Information */}
      <div className="absolute inset-0 md:max-w-[450px] mx-auto pointer-events-none">
        {/* Right Side Actions */}
        <div className="absolute right-3 sm:right-4 bottom-16 sm:bottom-24 flex flex-col items-center gap-3.5 sm:gap-5 pointer-events-auto">
          <div
            className="flex flex-col items-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${clip.user.username}`);
            }}
          >
            <Avatar
              src={clip.user.avatar_url}
              alt={clip.user.full_name}
              size="md"
              className="border-2 border-white shadow-md"
            />
          </div>

          <div className="flex flex-col items-center group" onClick={handleLike}>
            <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center transition-transform hover:scale-110">
              <Heart
                className={`w-5 h-5 ${isLiked ? 'fill-brand-500 text-brand-500' : 'text-white'}`}
              />
            </button>
            <span className="text-white text-xs font-semibold mt-1 drop-shadow-md">
              {likesCount}
            </span>
          </div>

          <div
            className="flex flex-col items-center group"
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments();
            }}
          >
            <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center transition-transform hover:scale-110">
              <MessageCircle className="w-5 h-5 text-white" />
            </button>
            <span className="text-white text-xs font-semibold mt-1 drop-shadow-md">
              {commentsCount}
            </span>
          </div>

          <div
            className="flex flex-col items-center group"
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.share) {
                navigator.share({ title: 'EChat Clip', url: window.location.href });
              }
            }}
          >
            <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center transition-transform hover:scale-110">
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <span className="text-white text-xs font-semibold mt-1 drop-shadow-md">Share</span>
          </div>
        </div>

        {/* Bottom Information */}
        <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-16 sm:right-20 pointer-events-auto">
          <h3
            className="text-white font-bold text-sm cursor-pointer hover:underline drop-shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${clip.user.username}`);
            }}
          >
            @{clip.user.username}
          </h3>
          <p className="text-white text-xs sm:text-sm mt-1 line-clamp-2 drop-shadow-md">
            {clip.caption}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Music className="w-3 h-3 text-white animate-spin-slow" />
            <span className="text-white text-[11px] sm:text-xs drop-shadow-md">Original Audio</span>
          </div>
        </div>
      </div>
    </div>
  );
};
