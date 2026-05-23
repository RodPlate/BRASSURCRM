import { useEffect, useState } from 'react';

/** Vista móvil: barra inferior visible (alineado con @media max-width: 767px) */
export const MOBILE_LAYOUT_QUERY = '(max-width: 767px)';

/** @deprecated usar MOBILE_LAYOUT_QUERY */
export const MOBILE_MEDIA_QUERY = MOBILE_LAYOUT_QUERY;

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
