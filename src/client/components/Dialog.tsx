import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface DialogProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  className?: string;
  headerClassName?: string;
  overlayClassName?: string;
}

export default function Dialog({
  title,
  children,
  onClose,
  closeDisabled = false,
  className = 'modal',
  headerClassName = 'modal-header',
  overlayClassName = 'modal-overlay',
}: DialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousActiveElement = document.activeElement;
    const dialog = dialogRef.current;
    const firstFocusable =
      dialog?.querySelector<HTMLElement>(focusableSelector);
    (firstFocusable ?? dialog)?.focus();

    return () => {
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !closeDisabled) {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(focusableSelector)
    ).filter((element) => element.offsetWidth > 0 || element.offsetHeight > 0);

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleOverlayClick = () => {
    if (!closeDisabled) onClose();
  };

  return (
    <div className={overlayClassName} onClick={handleOverlayClick}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={className}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className={headerClassName}>
          <h2 id={titleId}>{title}</h2>
          <button
            aria-label="Zamknij okno"
            className="modal-close"
            disabled={closeDisabled}
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
