import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/** Scroll distance after which the return-to-top control fades in. */
const REVEAL_AT = 600;

/**
 * A quiet floating control that appears once the visitor has moved past the
 * masthead. Kept out of the tab order while hidden so it cannot be focused
 * invisibly.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    const compute = () => {
      frame = 0;
      setVisible(window.scrollY > REVEAL_AT);
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const toTop = () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      className={`to-top${visible ? ' is-visible' : ''}`}
      onClick={toTop}
      aria-label="Revenir en haut de la page"
      tabIndex={visible ? undefined : -1}
    >
      <ArrowUp size={18} aria-hidden="true" />
    </button>
  );
}
