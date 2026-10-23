interface BrandProps {
  /** 'mark' renders the monogram only, 'full' adds the wordmark. */
  variant?: 'full' | 'mark';
  className?: string;
}

/**
 * Text-based wordmark. Café Foundou has no supplied logo, so the identity is
 * built from typography and a monogram only — nothing is invented.
 */
export function Brand({ variant = 'full', className = '' }: BrandProps) {
  return (
    <span className={`brand brand--${variant} ${className}`.trim()}>
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 44 44" focusable="false" role="presentation">
          <circle
            cx="22"
            cy="22"
            r="20.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            opacity="0.8"
          />
          <text
            x="22"
            y="30.8"
            textAnchor="middle"
            fill="currentColor"
            style={{ font: "600 26px 'Fraunces Variable', Georgia, serif" }}
          >
            F
          </text>
        </svg>
      </span>
      {variant === 'full' ? <span className="brand__name">Café Foundou</span> : null}
    </span>
  );
}
