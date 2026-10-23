import { useCallback, useEffect, useState, type RefObject } from 'react';

/** True when the visitor asked for reduced motion. Re-evaluated live. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * Reveals `[data-reveal]` descendants as they enter the viewport.
 *
 * The hidden state only exists while JavaScript is running, so a failed
 * script leaves the menu fully readable instead of blank.
 */
export function useReveal<T extends HTMLElement>(root: RefObject<T | null>): void {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const container = root.current;
    if (!container) return;

    const targets: HTMLElement[] = [];

    if (reduced || typeof IntersectionObserver === 'undefined') {
      container
        .querySelectorAll<HTMLElement>('[data-reveal]')
        .forEach((el) => el.classList.add('is-in'));
      return;
    }

    const reveal = (el: HTMLElement) => {
      if (el.classList.contains('is-in')) return;
      const index = Number(el.dataset.revealIndex ?? 0);
      el.style.setProperty('--reveal-delay', `${Math.min(index, 4) * 55}ms`);
      el.classList.add('is-in');
      observer.unobserve(el);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target as HTMLElement);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    const register = (el: HTMLElement) => {
      if (el.classList.contains('is-in') || targets.includes(el)) return;
      targets.push(el);
      observer.observe(el);
    };

    const scan = () => {
      container.querySelectorAll<HTMLElement>('[data-reveal]').forEach(register);
    };

    scan();

    // A very fast flick (or the End key, or a deep link) can jump an element
    // from "below the fold" to "above the fold" between two observer samples,
    // so it never counts as intersecting and stays invisible forever. This
    // catch-up reveals anything that has already reached the viewport — and
    // never anything still below it, so the animation is not defeated.
    let frame = 0;
    const catchUp = () => {
      frame = 0;
      const limit = window.innerHeight;
      for (const el of targets) {
        if (!el.isConnected) continue;
        if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < limit) {
          reveal(el);
        }
      }
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(catchUp);
    };

    // Search results and any future async content mount new sections. Without
    // this, those nodes would keep the hidden pre-reveal state forever
    // because the initial query ran before they existed.
    const mutations = new MutationObserver(() => {
      scan();
      schedule();
    });
    mutations.observe(container, { childList: true, subtree: true });

    catchUp();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      mutations.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [root, reduced]);
}

/**
 * Tracks which section is currently in view.
 *
 * A plain scroll handler is used on purpose: an IntersectionObserver with
 * several thresholds is easy to make jittery, and the nav must never flicker
 * between two categories while the visitor is reading.
 */
export function useActiveSection(ids: string[], offset: number): string {
  const [active, setActive] = useState<string>(ids[0] ?? '');

  useEffect(() => {
    let frame = 0;

    const compute = () => {
      frame = 0;
      const scrollY = window.scrollY;
      const viewport = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      let current = ids[0] ?? '';

      if (scrollY + viewport >= docHeight - 2) {
        current = ids[ids.length - 1] ?? current;
      } else {
        for (const id of ids) {
          const el = document.getElementById(id);
          if (!el) continue;
          const top = el.getBoundingClientRect().top;
          if (top - offset <= 1) {
            current = id;
          } else {
            break;
          }
        }
      }

      setActive((previous) => (previous === current ? previous : current));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('hashchange', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('hashchange', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ids, offset]);

  return active;
}

/** Height of the sticky category bar, used as a scroll offset. */
export function useNavOffset(): number {
  const [offset, setOffset] = useState(56);

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('[data-nav-offset]');
    if (!nav) return;
    const measure = () => setOffset(Math.round(nav.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  return offset;
}

/** Smoothly scrolls to a section, honouring reduced-motion preferences. */
export function useScrollToSection(): (id: string) => void {
  return useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const nav = document.querySelector<HTMLElement>('[data-nav-offset]');
    const offset = nav ? nav.getBoundingClientRect().height + 8 : 16;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(top, 0), behavior: reduced ? 'auto' : 'smooth' });
  }, []);
}
