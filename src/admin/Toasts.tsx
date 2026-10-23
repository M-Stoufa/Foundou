import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

export type ToastTone = 'success' | 'info' | 'warn';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

export type NotifyFn = (message: string, tone?: ToastTone) => void;

const ICONS = {
  success: CircleCheck,
  info: Info,
  warn: TriangleAlert,
} as const;

interface ToastsProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

/**
 * Bottom-anchored confirmation messages. Deliberately worded "… · non
 * persisté": nothing here is saved anywhere, and the UI must not imply it is.
 */
export function Toasts({ toasts, onDismiss }: ToastsProps) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone];
        return (
          <div className={`toast toast--${toast.tone}`} key={toast.id}>
            <Icon size={16} aria-hidden="true" className="toast__icon" />
            <p className="toast__text">{toast.message}</p>
            <button
              type="button"
              className="toast__close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Fermer la notification"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
