import { LOGO_ALT, LOGO_SRC } from '../../constants/branding';

/**
 * Logo oficial Brassur.
 * @param {'sidebar'|'topbar'|'login'|'pwa'} variant
 */
export default function BrandLogo({ variant = 'sidebar', className = '' }) {
  return (
    <img
      src={LOGO_SRC}
      alt={LOGO_ALT}
      className={`brand-logo brand-logo--${variant} ${className}`.trim()}
      width={variant === 'topbar' ? 36 : undefined}
      height={variant === 'topbar' ? 36 : undefined}
      decoding="async"
    />
  );
}
