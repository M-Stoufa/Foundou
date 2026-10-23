import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { publishedCategories, type MenuCategory } from '../data/menu';
import { currentMenu } from '../data/menuStorage';
import { useActiveSection, useNavOffset, useReveal, useScrollToSection } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { Brand } from './Brand';
import { BackToTop } from './BackToTop';
import { CategoryNav } from './CategoryNav';
import { MenuSection } from './MenuSection';
import { ScrollProgress } from './ScrollProgress';

interface MenuPageProps {
  /** Optional category id coming from the URL (#/c/<id>). */
  anchor?: string;
}

export function MenuPage({ anchor }: MenuPageProps) {
  const [categories, setCategories] = useState<MenuCategory[]>(() =>
    publishedCategories(currentMenu()),
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!supabase) {
        setCategories(publishedCategories(currentMenu()));
        return;
      }

      const { data, error } = await supabase.rpc('get_published_menu');

      if (cancelled) return;

      if (error || !Array.isArray(data)) {
        setCategories(publishedCategories(currentMenu()));
        return;
      }

      setCategories(publishedCategories(data as MenuCategory[]));
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const ids = useMemo(() => categories.map((category) => category.id), [categories]);
  const totalItems = useMemo(
    () => categories.reduce((total, category) => total + category.items.length, 0),
    [categories],
  );

  const navOffset = useNavOffset();
  const scrollToSection = useScrollToSection();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const activeId = useActiveSection(normalizedQuery ? [] : ids, navOffset + 40);

  useReveal(rootRef);

  // `/` or Ctrl/Cmd+K focuses the search field, unless the visitor is already
  // typing somewhere else (then the key belongs to that field). This mirrors
  // the shortcut hinted by the small key cap inside the search control.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      const commandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const slash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;

      if (!commandK && !slash) return;
      if (typing && !commandK) return;

      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
  const resultCount = displayCategories.reduce(
    (total, category) => total + category.items.length,
    0,
  );

  return (
    <>
      <ScrollProgress />
      <BackToTop />
      <div className="page" ref={rootRef}>
        <a className="skip-link" href="#menu">
          Aller directement au menu
        </a>

        <header className="masthead">
          <div className="masthead__inner">
            <Brand variant="mark" className="masthead__mark" />
            <div className="masthead__content">
              <p className="eyebrow">La carte</p>
              <h1 className="masthead__name">Café Foundou</h1>
              <p className="masthead__note">Prix indiqués en dinars tunisiens (DT)</p>
            </div>
          </div>

          <div className="menu-tools">
            <div className="menu-search">
              <div className="menu-search__inner">
                <label className="menu-search__label" htmlFor="menu-search">
                  <Search size={16} aria-hidden="true" />
                  <span className="visually-hidden">Rechercher dans le menu</span>
                </label>
                <input
                  id="menu-search"
                  ref={searchRef}
                  className="menu-search__input"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher un article…"
                  autoComplete="off"
                  spellCheck={false}
                  aria-keyshortcuts="/ Control+K Meta+K"
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
                ) : (
                  <kbd className="menu-search__kbd" aria-hidden="true">
                    /
                  </kbd>
                )}
              </div>
              {normalizedQuery ? (
                <p className="menu-search__count">
                  {resultCount} résultat{resultCount > 1 ? 's' : ''}
                  {displayCategories.length !== categories.length
                    ? ` dans ${displayCategories.length} catégorie${
                        displayCategories.length > 1 ? 's' : ''
                      }`
                    : ''}
                </p>
              ) : null}
            </div>

            <p className="menu-tools__meta">
              {categories.length} catégories <span aria-hidden="true">·</span> {totalItems} articles
            </p>
          </div>
        </header>

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
                <MenuSection
                  key={`${category.id}-${normalizedQuery}`}
                  category={category}
                  index={index}
                />
              ))
            )}
          </main>
        </div>

        <footer className="footer" data-reveal>
          <div className="footer__inner">
            <Brand variant="mark" className="footer__mark" />
            <div className="footer__text">
              <p className="footer__brand">Café Foundou</p>
              <p className="footer__note">Les prix sont indiqués en DT.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
