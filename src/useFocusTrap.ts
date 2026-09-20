import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

type TrapEntry = {
  id: symbol;
  container: HTMLElement;
  onEscapeRef: { current?: () => void };
};

/** Innermost / most recently activated trap wins Escape and Tab cycling. */
const trapStack: TrapEntry[] = [];

function listFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
    if (el.tabIndex < 0) return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    return el.getClientRects().length > 0;
  });
}

/**
 * Keep keyboard focus inside a dialog while it is active, restore focus on close,
 * and optionally handle Escape. Nested dialogs should activate only the innermost trap;
 * independently stacked modals use a LIFO stack so the topmost layer receives Escape.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  {
    active = true,
    onEscape,
    initialFocusRef,
  }: {
    active?: boolean;
    onEscape?: () => void;
    initialFocusRef?: RefObject<HTMLElement | null>;
  } = {},
): void {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;
  const initialFocusRefStable = useRef(initialFocusRef);
  initialFocusRefStable.current = initialFocusRef;

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '-1');
    }

    const preferred = initialFocusRefStable.current?.current;
    if (preferred && container.contains(preferred)) {
      preferred.focus();
    } else {
      const first = listFocusable(container)[0];
      (first ?? container).focus();
    }

    const id = Symbol('focus-trap');
    const entry: TrapEntry = { id, container, onEscapeRef };
    trapStack.push(entry);

    const isTop = () => trapStack[trapStack.length - 1]?.id === id;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTop()) return;

      if (event.key === 'Escape') {
        const handler = onEscapeRef.current;
        if (!handler) return;
        event.preventDefault();
        event.stopPropagation();
        handler();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = listFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (event.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (activeEl === last || !container.contains(activeEl)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const idx = trapStack.findIndex((trap) => trap.id === id);
      if (idx >= 0) trapStack.splice(idx, 1);
      const remaining = trapStack[trapStack.length - 1];
      if (remaining) {
        const focusable = listFocusable(remaining.container);
        (focusable[0] ?? remaining.container).focus();
      } else {
        previouslyFocused?.focus?.();
      }
    };
  }, [active, containerRef]);
}
