import type { MenuItem } from '../data/menu';
import { formatPrice } from '../lib/price';

interface MenuRowProps {
  item: MenuItem;
}

/**
 * A single menu line: name — dotted leader — price.
 *
 * The row is static content, so it carries no hover or press affordance.
 */
export function MenuRow({ item }: MenuRowProps) {
  return (
    <li className="row">
      <span className="row__name">
        {item.name}
        {item.note ? <span className="row__note"> {item.note}</span> : null}
      </span>
      <span className="row__leader" aria-hidden="true" />
      <span className="row__price tnum">
        {item.price === null ? (
          <span className="row__pending">À confirmer</span>
        ) : (
          <>
            {formatPrice(item.price)}
            <span className="row__unit"> DT</span>
          </>
        )}
      </span>
    </li>
  );
}
