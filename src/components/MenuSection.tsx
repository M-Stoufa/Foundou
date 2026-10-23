import type { MenuCategory } from '../data/menu';
import { MenuRow } from './MenuRow';

interface MenuSectionProps {
  category: MenuCategory;
  index: number;
}

export function MenuSection({ category, index }: MenuSectionProps) {
  const headingId = `${category.id}-titre`;

  return (
    <section
      className="section"
      id={category.id}
      aria-labelledby={headingId}
      data-reveal
      data-reveal-index={index % 3}
    >
      <header className="section__head">
        <h2 className="section__title" id={headingId}>
          {category.name}
        </h2>
      </header>
      <ul className="items">
        {category.items.map((item) => (
          <MenuRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
