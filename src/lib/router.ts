import { useSyncExternalStore } from 'react';

/**
 * A deliberately tiny hash router.
 *
 * GitHub Pages serves static files and cannot rewrite unknown paths, so a
 * hash router is the most reliable way to expose more than one view without
 * any server configuration. It also keeps the build base-agnostic: the same
 * `dist/` works at the repository root, under a project page, or on a domain.
 *
 * IMPORTANT (security): a route is not a security boundary. The admin route
 * is an unprotected visual prototype — see ADMIN-PROTOTYPE.md.
 */

export type Route =
  | { name: 'menu'; anchor?: string }
  | { name: 'admin-login' }
  | { name: 'admin-dashboard' };

export const MENU_ROUTE = '#/';
export const ADMIN_LOGIN_ROUTE = '#/admin';
export const ADMIN_DASHBOARD_ROUTE = '#/admin/dashboard';

export function categoryRoute(categoryId: string): string {
  return `#/c/${categoryId}`;
}

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#/, '').replace(/^\/+/, '');
  const segments = clean.split('/').filter(Boolean);

  if (segments[0] === 'admin') {
    return segments[1] === 'dashboard'
      ? { name: 'admin-dashboard' }
      : { name: 'admin-login' };
  }

  if (segments[0] === 'c' && segments[1]) {
    return { name: 'menu', anchor: segments[1] };
  }

  return { name: 'menu' };
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

function getSnapshot(): string {
  return window.location.hash;
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => '');
  return parseHash(hash);
}

export function navigate(hash: string): void {
  if (window.location.hash === hash) {
    // Re-trigger the hashchange listener so the view can react to a repeat click.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = hash;
}
