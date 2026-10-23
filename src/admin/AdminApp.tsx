import { useCallback, useEffect, useRef, useState } from 'react';
import { ADMIN_DASHBOARD_ROUTE, ADMIN_LOGIN_ROUTE, navigate } from '../lib/router';
import { currentMenu, saveStoredMenu } from '../data/menuStorage';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { loadDraftFromSupabase, saveDraftToSupabase } from '../lib/supabaseMenu';
import { draftReducer, type DraftAction } from './draftStore';
import { AdminDashboard } from './AdminDashboard';
import { AdminLogin } from './AdminLogin';
import { Toasts, type Toast, type ToastTone } from './Toasts';

interface AdminAppProps {
  view: 'login' | 'dashboard';
}

/**
 * Shell for the admin PROTOTYPE.
 *
 * The draft is initialised from the browser-local snapshot and written back on
 * every change. The write is synchronous, so the dashboard can tell the truth
 * immediately when the browser refuses to store it (private mode, quota,
 * disabled storage): the edit stays in memory for this tab and a persistent
 * warning is shown. Nothing here is ever sent over the network.
 */
export function AdminApp({ view }: AdminAppProps) {
  const [state, setState] = useState(() => ({ categories: currentMenu() }));
  const stateRef = useRef(state);
  const [storageFailed, setStorageFailed] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sequence = useRef(0);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (view !== 'dashboard') return;
    if (!supabaseConfigured) {
      navigate(ADMIN_LOGIN_ROUTE);
      return;
    }

    let cancelled = false;

    const check = async () => {
      const client = supabase;
      if (!client) {
        navigate(ADMIN_LOGIN_ROUTE);
        return;
      }

      const { data, error } = await client.auth.getSession();

      if (cancelled) return;

      if (error || !data.session?.user) {
        setAuthorized(false);
        navigate(ADMIN_LOGIN_ROUTE);
        return;
      }

      const { data: ownerRow, error: ownerError } = await client
        .from('owners')
        .select('user_id')
        .eq('user_id', data.session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (ownerError || !ownerRow) {
        await client.auth.signOut();
        setAuthorized(false);
        navigate(ADMIN_LOGIN_ROUTE);
        return;
      }

      setAuthorized(true);

      const draft = await loadDraftFromSupabase();
      if (!cancelled && draft && draft.length > 0) {
        const nextState = { categories: draft };
        stateRef.current = nextState;
        setState(nextState);
        setStorageFailed(false);
        try {
          window.localStorage.setItem(
            'cafe-foundou.menu.v2',
            JSON.stringify({ version: 2, savedAt: new Date().toISOString(), categories: draft }),
          );
        } catch {
          // ignore
        }
      }
    };

    void check();

    const client = supabase;
    if (!client) {
      return () => {
        cancelled = true;
      };
    }

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session?.user) {
        setAuthorized(false);
        navigate(ADMIN_LOGIN_ROUTE);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [view]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, []);

  const dispatch = useCallback((action: DraftAction) => {
    const next = draftReducer(stateRef.current, action);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setState(next);
    setStorageFailed(!saveStoredMenu(next.categories));

    if (authorized && supabase) {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
      saveTimer.current = window.setTimeout(() => {
        void saveDraftToSupabase(next.categories);
      }, 800);
    }
  }, [authorized]);

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

  const checking = view === 'dashboard' && !authorized;

  if (view === 'dashboard' && checking) {
    return <Toasts toasts={toasts} onDismiss={dismiss} />;
  }

  return (
    <>
      {view === 'dashboard' ? (
        <AdminDashboard
          state={state}
          dispatch={dispatch}
          notify={notify}
          storageFailed={storageFailed}
          onLogout={async () => {
            setAuthorized(false);
            await supabase?.auth.signOut();
            navigate(ADMIN_LOGIN_ROUTE);
          }}
        />
      ) : (
        <AdminLogin onEnter={() => navigate(ADMIN_DASHBOARD_ROUTE)} />
      )}
      <Toasts toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
