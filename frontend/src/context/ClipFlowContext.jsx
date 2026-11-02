import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from 'react';

/**
 * ClipFlowContext
 *
 * Manages the ClipFlow feature: per-conversation toggle state, saved clip scroll
 * position, and coordination signals between ClipsPage and ChatWindow.
 *
 * Design decisions:
 *  - clipFlowEnabled  : Map<conversationId, boolean> — independent per chat.
 *  - savedScrollTop   : number | null — pixel offset saved before navigation.
 *  - clipFlowReturn   : boolean — flag telling ClipsPage to restore position.
 *  - triggeringConvId : string | null — which conversation triggered the jump.
 *  - isClipFlowActive : boolean — true only when we are currently in a
 *                        ClipFlow-initiated navigation (Clips → Chat).
 */

const ClipFlowContext = createContext(null);

export const ClipFlowProvider = ({ children }) => {
  // { [conversationId]: boolean }
  const [clipFlowEnabled, setClipFlowEnabled] = useState({});

  // Pixel scroll position of the clips container before we navigated away
  const savedScrollTopRef = useRef(null);

  // Whether we should restore position when the user returns to /clips
  const [shouldRestoreClips, setShouldRestoreClips] = useState(false);

  // The conversation that triggered the ClipFlow navigation
  const [triggeringConvId, setTriggeringConvId] = useState(null);

  // Flag: we navigated to /messages via ClipFlow (prevents double-trigger)
  const isClipFlowNavigatingRef = useRef(false);

  /** Toggle ClipFlow on/off for one conversation. */
  const toggleClipFlow = useCallback((conversationId) => {
    setClipFlowEnabled((prev) => ({
      ...prev,
      [conversationId]: !prev[conversationId],
    }));
  }, []);

  /** Check if ClipFlow is enabled for a specific conversation. */
  const isClipFlowEnabledFor = useCallback(
    (conversationId) => Boolean(clipFlowEnabled[conversationId]),
    [clipFlowEnabled]
  );

  /**
   * Called by the socket/ChatContext layer when a new message arrives and
   * the user is currently on the Clips page.
   *
   * @param {string} conversationId   - The conversation that received a message.
   * @param {number} scrollTop        - Current scroll position of the clips container.
   * @param {Function} navigate       - react-router navigate function.
   * @param {Function} setActiveConversation - ChatContext setter.
   * @param {Object}  conversation    - Conversation object to set as active.
   */
  const triggerClipFlowNavigation = useCallback(
    (conversationId, scrollTop, navigate, setActiveConversation, conversation) => {
      if (isClipFlowNavigatingRef.current) return; // already navigating
      isClipFlowNavigatingRef.current = true;

      savedScrollTopRef.current = scrollTop;
      setShouldRestoreClips(true);
      setTriggeringConvId(conversationId);

      setActiveConversation(conversation);
      navigate('/messages');

      // Reset the guard after a short delay to allow future triggers
      setTimeout(() => {
        isClipFlowNavigatingRef.current = false;
      }, 1000);
    },
    []
  );

  /**
   * Called by ClipsPage when it mounts/re-focuses and shouldRestoreClips is true.
   * Returns the saved scroll position and resets the restore flag.
   */
  const consumeRestoredScrollTop = useCallback(() => {
    const top = savedScrollTopRef.current;
    savedScrollTopRef.current = null;
    setShouldRestoreClips(false);
    setTriggeringConvId(null);
    return top;
  }, []);

  return (
    <ClipFlowContext.Provider
      value={{
        clipFlowEnabled,
        toggleClipFlow,
        isClipFlowEnabledFor,
        shouldRestoreClips,
        triggeringConvId,
        triggerClipFlowNavigation,
        consumeRestoredScrollTop,
        savedScrollTopRef,
      }}
    >
      {children}
    </ClipFlowContext.Provider>
  );
};

export const useClipFlow = () => {
  const ctx = useContext(ClipFlowContext);
  if (!ctx) throw new Error('useClipFlow must be used within a ClipFlowProvider');
  return ctx;
};
