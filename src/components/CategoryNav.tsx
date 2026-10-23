import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MenuCategory } from '../data/menu';
import { categoryRoute } from '../lib/router';

interface CategoryNavProps {
  categories: MenuCategory[];
  activeId: string;
  onSelect: (id: string) => void;
}

/**
 * Category navigation.
 *
 * - Phone: a horizontally scrollable strip with a caramel indicator that
 *   slides under the active category. The strip is full-bleed so the clip
 *   happens at the screen edge, which reads as "more to the right".
 * - Desktop: the same list becomes a quiet editorial rail with a 2px accent
 *   marker, deliberately less loud than the menu itself.
 *
 * The strip scrolls inside its own container only, so the page itself never
 * gains a horizontal scrollbar.
 */
export function CategoryNav({ categories, activeId, onSelect }: CategoryNavProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const labelRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const measure = useCallback(() => {
    const inner = innerRef.current;
    // The indicator is measured on the label, not the link: the link carries
    // horizontal padding, and a rule that starts before the first letter
    // reads as a mis-alignment.
    const label = labelRefs.current[activeId];
    if (!inner || !label) return;
    const innerRect = inner.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const left = labelRect.left - innerRect.left;
    const width = labelRect.width;
    setIndicator((previous) =>
      previous.ready &&
      Math.abs(previous.left - left) < 0.5 &&
      Math.abs(previous.width - width) < 0.5
        ? previous
        : { left, width, ready: true },
    );
  }, [activeId]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(inner);

    // Web fonts can change the width of a label after the first paint.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    void fonts?.ready.then(measure).catch(() => undefined);

    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // Keep the active category visible inside the scrolling strip.
  useEffect(() => {
    const scroller = scrollRef.current;
    const link = linkRefs.current[activeId];
    if (!scroller || !link) return;
    if (scroller.scrollWidth <= scroller.clientWidth + 2) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const margin = 16;
    if (linkRect.left >= scrollerRect.left + margin && linkRect.right <= scrollerRect.right - margin) {
      return;
    }

    const target =
      scroller.scrollLeft + (linkRect.left - scrollerRect.left) - (scrollerRect.width - linkRect.width) / 2;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollTo({ left: Math.max(0, target), behavior: reduced ? 'auto' : 'smooth' });
  }, [activeId, categories.length]);

  return (
    <nav className="catnav" aria-label="Catégories du menu" data-nav-offset>
      <div className="catnav__scroll" ref={scrollRef}>
        <div className="catnav__inner" ref={innerRef}>
          <span
            className="catnav__indicator"
            aria-hidden="true"
            style={{
              transform: `translateX(${indicator.left}px)`,
              width: indicator.width ? `${indicator.width}px` : '0px',
              opacity: indicator.ready ? 1 : 0,
            }}
          />
          <ul className="catnav__list">
            {categories.map((category, index) => {
              const isActive = category.id === activeId;
              return (
                <li className="catnav__item" key={category.id}>
                  <a
                    href={categoryRoute(category.id)}
                    className={`catnav__link${isActive ? ' is-active' : ''}`}
                    aria-current={isActive ? 'true' : undefined}
                    ref={(node) => {
                      linkRefs.current[category.id] = node;
                    }}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                      event.preventDefault();
                      onSelect(category.id);
                    }}
                  >
                    <span className="catnav__num" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span
                      className="catnav__label"
                      ref={(node) => {
                        labelRefs.current[category.id] = node;
                      }}
                    >
                      {category.name}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
