import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  /** Label shown while the confirmation is in flight. */
  busyLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Destructive-action confirmation with the same short latency as the editor. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busyLabel = 'Confirmation…',
  danger = true,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onConfirm();
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      dismissible={!busy}
      footer={
        <>
          <button type="button" className="button button--ghost" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button
            type="button"
            className={`button ${danger ? 'button--danger' : ''}`}
            onClick={confirm}
            disabled={busy}
            data-autofocus
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm">
        {danger ? (
          <span className="confirm__icon" aria-hidden="true">
            <TriangleAlert size={20} />
          </span>
        ) : null}
        <p className="confirm__body">{body}</p>
      </div>
    </Modal>
  );
}
