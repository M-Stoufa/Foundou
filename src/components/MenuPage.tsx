import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { publishedCategories } from '../data/menu';
import { currentMenu } from '../data/menuStorage';
import { useActiveSection, useNavOffset, useReveal, useScrollToSection } from '../lib/hooks';
import { Brand } from './Brand';
import { CategoryNav } from './CategoryNav';
import { MenuSection } from './MenuSection';

interface MenuPageProps {
  /** Optional category id coming from the URL (#/c/<id>). */
  anchor?: string;
}

export function MenuPage({ anchor }: MenuPageProps) {
  const categories = useMemo(() => publishedCategories(currentMenu()), []);
  const ids = useMemo(() => categories.map((category) => category.id), [categories]);

  const navOffset = useNavOffset();
  const scrollToSection = useScrollToSection();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const activeId = useActiveSection(normalizedQuery ? [] : ids, navOffset + 40);

  useReveal(rootRef);

  // Scroll to a deep-linked category once the layout has settled.
  useEffect(() => {
    if (normalizedQuery) return;
    if (!anchor) return;
    const timer = window.setTimeout(() => scrollToSection(anchor), 80);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    void fonts?.ready.then(() => scrollToSection(anchor)).catch(() => undefined);
    return () => window.clearTimeout(timer);
  }, [anchor, scrollToSection, normalizedQuery]);

  const handleSelect = (id: string) => {
    if (normalizedQuery) return;
    scrollToSection(id);
    // Keep the URL shareable without adding a history entry per scroll.
    window.history.replaceState(null, '', `#/c/${id}`);
  };

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const haystack = `${item.name} ${item.note ?? ''}`.toLocaleLowerCase('fr');
          return haystack.includes(normalizedQuery);
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, normalizedQuery]);

  const displayCategories = normalizedQuery ? filteredCategories : categories;

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

      <div className="menu-search">
        <div className="menu-search__inner">
          <label className="menu-search__label" htmlFor="menu-search">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">Rechercher dans le menu</span>
          </label>
          <input
            id="menu-search"
            className="menu-search__input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un article..."
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button
              type="button"
              className="menu-search__clear"
              onClick={() => setQuery('')}
              aria-label="Effacer la recherche"
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {normalizedQuery ? (
          <p className="menu-search__count">
            {displayCategories.reduce((total, category) => total + category.items.length, 0)}{' '}
            résultat
            {displayCategories.reduce((total, category) => total + category.items.length, 0) > 1
              ? 's'
              : ''}
            {displayCategories.length !== categories.length
              ? ` dans ${displayCategories.length} catégorie${
                  displayCategories.length > 1 ? 's' : ''
                }`
              : ''}
          </p>
        ) : null}
      </div>

      <div className="layout">
        {normalizedQuery ? null : (
          <CategoryNav categories={categories} activeId={activeId} onSelect={handleSelect} />
        )}

        <main className="menu" id="menu" tabIndex={-1}>
          {displayCategories.length === 0 ? (
            <p className="menu__empty">
              Aucun article ne correspond à « {query.trim()} ».{' '}
              <button type="button" className="menu__empty-reset" onClick={() => setQuery('')}>
                Effacer la recherche
              </button>
            </p>
          ) : (
            displayCategories.map((category, index) => (
              <MenuSection key={`${category.id}-${normalizedQuery}`} category={category} index={index} />
            ))
          )}
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
