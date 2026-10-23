import type { MenuItem } from '../data/menu';

import chocolatJpg from '../assets/menu/gateaux-chocolat.jpg';
import chocolat480 from '../assets/menu/gateaux-chocolat-480.webp';
import chocolat960 from '../assets/menu/gateaux-chocolat-960.webp';
import chocolat1280 from '../assets/menu/gateaux-chocolat-1280.webp';
import noisettesJpg from '../assets/menu/gateaux-noisettes.jpg';
import noisettes480 from '../assets/menu/gateaux-noisettes-480.webp';
import noisettes960 from '../assets/menu/gateaux-noisettes-960.webp';
import cheesecakeJpg from '../assets/menu/cheesecake.jpg';
import cheesecake480 from '../assets/menu/cheesecake-480.webp';
import cheesecake960 from '../assets/menu/cheesecake-960.webp';

interface CakePhoto {
  /** JPEG fallback, shown by browsers without WebP. */
  fallback: string;
  /** Responsive WebP candidates, bundled by Vite for the repo sub-path. */
  srcSet: string;
  width: number;
  height: number;
  /** The one landscape photograph spans the full gallery width. */
  wide?: boolean;
  alt: string;
  sizes: string;
}

/**
 * The three owner-supplied cake photographs, matched by stable item id — never
 * by display name, which the owner can rename in the admin.
 *
 * No photograph is attached to a product it does not depict, and no product
 * without a matching photograph is given stock imagery.
 */
export const PHOTOS: Record<string, CakePhoto> = {
  'gateaux-chocolat': {
    fallback: chocolatJpg,
    srcSet: `${chocolat480} 480w, ${chocolat960} 960w, ${chocolat1280} 1280w`,
    width: 1280,
    height: 849,
    wide: true,
    alt: 'Gâteau au chocolat — Café Foundou',
    sizes: '(min-width: 60em) 54rem, (min-width: 40em) 88vw, 92vw',
  },
  'gateaux-noisettes': {
    fallback: noisettesJpg,
    srcSet: `${noisettes480} 480w, ${noisettes960} 960w`,
    width: 960,
    height: 1280,
    alt: 'Gâteau aux noisettes — Café Foundou',
    sizes: '(min-width: 60em) 26rem, (min-width: 40em) 44vw, 45vw',
  },
  cheesecake: {
    fallback: cheesecakeJpg,
    srcSet: `${cheesecake480} 480w, ${cheesecake960} 960w`,
    width: 960,
    height: 1280,
    alt: 'Cheese Cake — Café Foundou',
    sizes: '(min-width: 60em) 26rem, (min-width: 40em) 44vw, 45vw',
  },
};

export function hasPhoto(item: MenuItem): boolean {
  return item.id in PHOTOS;
}
