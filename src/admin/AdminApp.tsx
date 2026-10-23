import { useCallback, useReducer, useRef, useState } from 'react';
import { ADMIN_DASHBOARD_ROUTE, ADMIN_LOGIN_ROUTE, navigate } from '../lib/router';
import { draftReducer, initialDraft } from './draftStore';
import { AdminDashboard } from './AdminDashboard';
import { AdminLogin } from './AdminLogin';
import { Toasts, type Toast, type ToastTone } from './Toasts';

interface AdminAppProps {
  view: 'login' | 'dashboard';
}

/**
 * Shell for the admin PROTOTYPE.
 *
 * The draft lives in this component's reducer: no storage, no network, no
 * session. Reloading the page throws every change away, which is exactly what
 * the prototype promises and what the banner says on screen.
 */
export function AdminApp({ view }: AdminAppProps) {
  const [state, dispatch] = useReducer(draftReducer, initialDraft);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sequence = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    sequence.current += 1;
    const id = sequence.current;
    setToasts((previous) => [...previous, { id, message, tone }].slice(-3));
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, 4600);
  }, []);

  return (
    <>
      {view === 'dashboard' ? (
        <AdminDashboard
          state={state}
          dispatch={dispatch}
          notify={notify}
          onLogout={() => navigate(ADMIN_LOGIN_ROUTE)}
        />
      ) : (
        <AdminLogin onEnter={() => navigate(ADMIN_DASHBOARD_ROUTE)} />
      )}
      <Toasts toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
