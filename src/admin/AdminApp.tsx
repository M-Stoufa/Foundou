import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ADMIN_DASHBOARD_ROUTE, ADMIN_LOGIN_ROUTE, navigate } from '../lib/router';
import { currentMenu, saveStoredMenu } from '../data/menuStorage';
import { draftReducer } from './draftStore';
import { AdminDashboard } from './AdminDashboard';
import { AdminLogin } from './AdminLogin';
import { Toasts, type Toast, type ToastTone } from './Toasts';

interface AdminAppProps {
  view: 'login' | 'dashboard';
}

/**
 * Shell for the admin PROTOTYPE.
 *
 * The draft is initialised from the browser-local snapshot and written back
 * after every change, so it survives a reload on this device. It is still not
 * shared: no server, no account, no session. See ADMIN-PROTOTYPE.md.
 */
export function AdminApp({ view }: AdminAppProps) {
  const [state, dispatch] = useReducer(draftReducer, undefined, () => ({
    categories: currentMenu(),
  }));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sequence = useRef(0);

  // Browser-local only. Failures (private mode, quota) leave the session
  // usable in memory; nothing here is ever sent over the network.
  useEffect(() => {
    saveStoredMenu(state.categories);
  }, [state.categories]);

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
