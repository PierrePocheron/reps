import { useState } from 'react';

/**
 * Photo d'un exercice, ou son emoji quand il n'y en a pas ou qu'elle ne se charge pas (hors ligne : image cassée et
 * texte alternatif tronqué). À placer dans le cadre de l'appelant (taille, coins, fond).
 */
export function ExerciseImage({ src, alt, emoji, emojiClassName = 'text-2xl' }: {
  src: string | null | undefined;
  alt: string;
  emoji: string;
  emojiClassName?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <span className={emojiClassName}>{emoji}</span>;
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} className="h-full w-full object-cover" />;
}
