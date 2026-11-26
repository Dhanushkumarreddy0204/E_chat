import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function ModalFrame({ label, onClose, children, immersive = false }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  return createPortal(
    <dialog ref={ref} className={`modal-frame ${immersive ? 'modal-visual' : ''}`} aria-label={label}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget && !immersive) onClose(); }}>
      {children}
    </dialog>,
    document.body
  );
}
