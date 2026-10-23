import '@testing-library/jest-dom/vitest';

/**
 * jsdom does not implement the browser APIs the menu relies on for layout.
 * These stubs are deliberately minimal: they only need to be good enough for
 * the components to mount and to assert on rendered output.
 */

class ResizeObserverStub {
  private readonly callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
  }

  observe(): void {
    this.callback();
  }

  unobserve(): void {}

  disconnect(): void {}
}

class IntersectionObserverStub {
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    // Everything is "in view" straight away, which is what a real browser
    // reports for the first painted screen.
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }

  unobserve(): void {}

  disconnect(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??=
  IntersectionObserverStub as unknown as typeof IntersectionObserver;

// jsdom logs "Not implemented" errors for scrolling; the menu scrolls on click.
window.scrollTo = (() => undefined) as typeof window.scrollTo;
Element.prototype.scrollTo = (() => undefined) as typeof Element.prototype.scrollTo;
