import { useState } from 'react';

/** The exercise library's pictures (src/utils/exerciseLibrary.ts): the only remote origin an exercise image may use */
export const EXERCISE_CDN = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@';

/**
 * A friend's template or session can carry any URL: loading it told them our IP and training hours (no CSP in the
 * Android WebView). Resolved first, so « //host » or a « .. » out of the dataset do not pass.
 */
const knownSource = (src: string) => {
  try {
    const url = new URL(src, window.location.href);
    return url.origin === window.location.origin || url.href.startsWith(EXERCISE_CDN);
  } catch {
    return false;
  }
};

/**
 * Photo d'un exercice, ou son emoji quand il n'y en a pas, qu'elle ne se charge pas (hors ligne : image cassée et
 * texte alternatif tronqué) ou qu'elle vient d'ailleurs. À placer dans le cadre de l'appelant (taille, coins, fond).
 */
export function ExerciseImage({ src, alt, emoji, emojiClassName = 'text-2xl' }: {
  src: string | null | undefined;
  alt: string;
  emoji: string;
  emojiClassName?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src || !knownSource(src)) return <span className={emojiClassName}>{emoji}</span>;
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} className="h-full w-full object-cover" />;
}
