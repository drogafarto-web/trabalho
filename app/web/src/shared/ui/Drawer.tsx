import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number;
  children: ReactNode;
}

/**
 * Drawer lateral direito — padrão do projeto para criação/edição
 * (ver docs/design-prototype). ESC fecha, clique no overlay fecha,
 * foco é devolvido ao elemento que abriu.
 */
export function Drawer({ open, onClose, title, width = 560, children }: DrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-bg/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        style={{ width }}
        className={cn(
          'relative h-full overflow-y-auto bg-bg-surface border-l border-border shadow-elevated',
          'focus:outline-none',
        )}
      >
        {title && (
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg-surface px-6 py-4">
            <h2 className="font-display text-md font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="text-text-muted transition-colors hover:text-text"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6l-12 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>
        )}
        {children}
      </aside>
    </div>
  );
}
