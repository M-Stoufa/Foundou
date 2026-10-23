import { describe, expect, it } from 'vitest';
import { ADMIN_DASHBOARD_ROUTE, ADMIN_LOGIN_ROUTE, MENU_ROUTE, categoryRoute, parseHash } from './router';

describe('parseHash', () => {
  it('treats the root as the menu', () => {
    expect(parseHash('')).toEqual({ name: 'menu' });
    expect(parseHash('#')).toEqual({ name: 'menu' });
    expect(parseHash('#/')).toEqual({ name: 'menu' });
  });

  it('reads a category deep link', () => {
    expect(parseHash('#/c/cafes')).toEqual({ name: 'menu', anchor: 'cafes' });
    expect(parseHash('#/c/smoothies')).toEqual({ name: 'menu', anchor: 'smoothies' });
  });

  it('reads the admin routes', () => {
    expect(parseHash('#/admin')).toEqual({ name: 'admin-login' });
    expect(parseHash('#/admin/dashboard')).toEqual({ name: 'admin-dashboard' });
  });

  it('falls back to the menu for anything unknown', () => {
    expect(parseHash('#/nope')).toEqual({ name: 'menu' });
    expect(parseHash('#/c')).toEqual({ name: 'menu' });
    expect(parseHash('#/c/')).toEqual({ name: 'menu' });
  });

  it('tolerates extra slashes', () => {
    expect(parseHash('#//admin//dashboard')).toEqual({ name: 'admin-dashboard' });
  });
});

describe('routes', () => {
  it('exposes stable route constants', () => {
    expect(MENU_ROUTE).toBe('#/');
    expect(ADMIN_LOGIN_ROUTE).toBe('#/admin');
    expect(ADMIN_DASHBOARD_ROUTE).toBe('#/admin/dashboard');
  });

  it('builds category routes that the parser understands', () => {
    for (const id of ['cafes', 'chocolats', 'eaux']) {
      expect(parseHash(categoryRoute(id))).toEqual({ name: 'menu', anchor: id });
    }
  });
});
