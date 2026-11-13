import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDialogStore } from '@/stores/dialogStore';

/**
 * Global keyboard shortcuts handler:
 * - Cmd/Ctrl + K: toggle command palette
 * - ?: open shortcuts modal
 * - Sequence 'N' then 'C': open New Contact sheet / modal
 * - Sequence 'N' then 'L': open New Lead modal
 */
export function useGlobalShortcuts({ onOpenShortcuts }) {
  const navigate = useNavigate();
  const { openCreateLead, toggleCommandPalette } = useDialogStore();
  const pendingPrefix = useRef(null);
  const prefixTimer = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore if user is currently inside an input, textarea, or contentEditable element
      const target = e.target;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[role="combobox"]');

      if (isInput) return;

      // Cmd+K or Ctrl+K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette?.();
        return;
      }

      // '?' -> Shortcuts Modal
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onOpenShortcuts?.();
        return;
      }

      // Two-key chord sequences (e.g. N then C, N then L)
      const key = e.key.toLowerCase();
      if (pendingPrefix.current === 'n') {
        clearTimeout(prefixTimer.current);
        pendingPrefix.current = null;

        if (key === 'c') {
          e.preventDefault();
          navigate('/customers?new=contact');
        } else if (key === 'l') {
          e.preventDefault();
          openCreateLead?.();
        }
        return;
      }

      if (key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        pendingPrefix.current = 'n';
        prefixTimer.current = setTimeout(() => {
          pendingPrefix.current = null;
        }, 1000);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(prefixTimer.current);
    };
  }, [navigate, openCreateLead, toggleCommandPalette, onOpenShortcuts]);
}

export default useGlobalShortcuts;

