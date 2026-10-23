import type { MenuCategory } from '../data/menu';
import { CakeGallery } from './CakeGallery';
import { hasPhoto } from './cakePhotos';
import { MenuRow } from './MenuRow';

interface MenuSectionProps {
  category: MenuCategory;
  index: number;
}

export function MenuSection({ category, index }: MenuSectionProps) {
  const headingId = `${category.id}-titre`;
  const photoItems = category.id === 'gateaux' ? category.items.filter(hasPhoto) : [];
  const lineItems = category.items.filter((item) => !photoItems.includes(item));
  const count = category.items.length;

  return (
    <section
      className={`section${photoItems.length > 0 ? ' section--vitrine' : ''}`}
      id={category.id}
      aria-labelledby={headingId}
      data-reveal
      data-reveal-index={index % 3}
    >
      <header className="section__head">
        <span className="section__num" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h2 className="section__title" id={headingId}>
          {category.name}
        </h2>
        <span className="section__count">
          {count} article{count > 1 ? 's' : ''}
        </span>
      </header>

      {photoItems.length > 0 ? <CakeGallery items={photoItems} /> : null}

      {lineItems.length > 0 ? (
        <ul className={`items${photoItems.length > 0 ? ' items--after-gallery' : ''}`}>
          {lineItems.map((item) => (
            <MenuRow key={item.id} item={item} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
