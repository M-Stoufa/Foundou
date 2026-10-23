import type { MenuItem } from '../data/menu';
import { formatPrice } from '../lib/price';
import { PHOTOS } from './cakePhotos';

interface CakeGalleryProps {
  items: MenuItem[];
}

/**
 * The patisserie showcase: one wide photograph followed by two portrait
 * photographs, each cropped to its native ratio (3:2 / 3:4) so the cakes are
 * never distorted or awkwardly truncated. Names and prices stay real DOM text,
 * not part of the image, so they remain selectable, searchable and accessible.
 */
export function CakeGallery({ items }: CakeGalleryProps) {
  return (
    <ul className="cakes">
      {items.map((item) => {
        const photo = PHOTOS[item.id];
        if (!photo) return null;

        return (
          <li className={`cake${photo.wide ? ' cake--wide' : ''}`} key={item.id}>
            <figure className="cake__figure">
              <div className="cake__frame">
                <picture>
                  <source type="image/webp" srcSet={photo.srcSet} sizes={photo.sizes} />
                  <img
                    src={photo.fallback}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              </div>
              <figcaption className="cake__caption">
                <span className="cake__name">{item.name}</span>
                <span className="cake__price tnum">
                  {item.price === null ? (
                    <span className="cake__pending">À confirmer</span>
                  ) : (
                    <>
                      {formatPrice(item.price)}
                      <span className="cake__unit"> DT</span>
                    </>
                  )}
                </span>
              </figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}
