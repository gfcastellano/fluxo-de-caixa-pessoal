import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
}

/**
 * Portal Component
 *
 * Renders children into a portal at the document.body level.
 * This escapes any parent stacking contexts, ensuring proper z-index behavior
 * for modals, dropdowns, and other overlay components.
 *
 * Usage:
 * ```tsx
 * <Portal>
 *   <ModalContent />
 * </Portal>
 * ```
 */
export function Portal({ children }: PortalProps) {
  const portalContainerRef = useRef<HTMLDivElement | null>(null);

  // Create portal container on mount
  if (!portalContainerRef.current) {
    portalContainerRef.current = document.createElement('div');
    portalContainerRef.current.setAttribute('data-portal', 'true');
  }

  useEffect(() => {
    const portalContainer = portalContainerRef.current;
    if (!portalContainer) return;

    // Append to document.body
    document.body.appendChild(portalContainer);

    // Cleanup on unmount
    return () => {
      if (portalContainer.parentNode) {
        portalContainer.parentNode.removeChild(portalContainer);
      }
    };
  }, []);

  // Only render portal if container exists
  if (!portalContainerRef.current) {
    return null;
  }

  return createPortal(children, portalContainerRef.current);
}
