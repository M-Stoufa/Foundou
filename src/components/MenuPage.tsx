import { useEffect, useMemo, useRef } from 'react';
import { publishedCategories } from '../data/menu';
import { useActiveSection, useNavOffset, useReveal, useScrollToSection } from '../lib/hooks';
import { Brand } from './Brand';
import { CategoryNav } from './CategoryNav';
import { MenuSection } from './MenuSection';

interface MenuPageProps {
  /** Optional category id coming from the URL (#/c/<id>). */
  anchor?: string;
}

export function MenuPage({ anchor }: MenuPageProps) {
  const categories = useMemo(() => publishedCategories(), []);
  const ids = useMemo(() => categories.map((category) => category.id), [categories]);

  const navOffset = useNavOffset();
  const activeId = useActiveSection(ids, navOffset + 40);
  const scrollToSection = useScrollToSection();
  const rootRef = useRef<HTMLDivElement>(null);

  useReveal(rootRef);

  // Scroll to a deep-linked category once the layout has settled.
  useEffect(() => {
    if (!anchor) return;
    const timer = window.setTimeout(() => scrollToSection(anchor), 80);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    void fonts?.ready.then(() => scrollToSection(anchor)).catch(() => undefined);
    return () => window.clearTimeout(timer);
  }, [anchor, scrollToSection]);

  const handleSelect = (id: string) => {
    scrollToSection(id);
    // Keep the URL shareable without adding a history entry per scroll.
    window.history.replaceState(null, '', `#/c/${id}`);
  };

  return (
    <div className="page" ref={rootRef}>
      <a className="skip-link" href="#menu">
        Aller directement au menu
      </a>

      <header className="masthead">
        <div className="masthead__inner">
          <Brand variant="mark" className="masthead__mark" />
          <div className="masthead__content">
            <p className="eyebrow">Menu</p>
            <h1 className="masthead__name">Café Foundou</h1>
            <p className="masthead__note">Prix indiqués en dinars tunisiens (DT)</p>
          </div>
        </div>
      </header>

      <div className="layout">
        <CategoryNav categories={categories} activeId={activeId} onSelect={handleSelect} />

        <main className="menu" id="menu" tabIndex={-1}>
          {categories.map((category, index) => (
            <MenuSection key={category.id} category={category} index={index} />
          ))}
        </main>
      </div>

      <footer className="footer">
        <div className="footer__inner">
          <p className="footer__brand">Café Foundou</p>
          <p className="footer__note">Les prix sont indiqués en DT.</p>
        </div>
      </footer>
    </div>
  );
}
