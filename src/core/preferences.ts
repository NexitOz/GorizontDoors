import { useEffect, useState } from 'react';
export function useMedia(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const media = matchMedia(query), changed = () => setMatches(media.matches);
    changed(); media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, [query]);
  return matches;
}
