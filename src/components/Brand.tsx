import logoUrl from '../assets/brand/foundou-logo.png';

interface BrandProps {
  /** 'mark' renders the logo only, 'full' adds the wordmark. */
  variant?: 'full' | 'mark';
  className?: string;
  /** True on the espresso admin chrome: the logo gets a paper disc. */
  onDark?: boolean;
}

/**
 * Café Foundou identity.
 *
 * The mark is the owner-supplied logo crop, displayed without alteration.
 * It is 220 × 225 px, so it is kept at a modest size to stay sharp: 62–76 px on
 * the public menu, 40–42 px in the admin bar and 50–66 px on the sign-in screen.
 *
 * When the wordmark is shown the image is decorative; when only the mark is
 * shown it carries the accessible name.
 */
export function Brand({ variant = 'full', className = '', onDark = false }: BrandProps) {
  const decorative = variant === 'full';

  return (
    <span
      className={`brand brand--${variant}${onDark ? ' brand--on-dark' : ''} ${className}`.trim()}
    >
      <span className="brand__mark" aria-hidden={decorative ? 'true' : undefined}>
        <img
          src={logoUrl}
          alt={decorative ? '' : 'Café Foundou'}
          width={220}
          height={225}
          decoding="async"
        />
      </span>
      {variant === 'full' ? <span className="brand__name">Café Foundou</span> : null}
    </span>
  );
}
