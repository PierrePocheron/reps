import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Remet un fichier à l'utilisateur : feuille de partage sur mobile (la WebView Android ignore
 * `<a download>` : l'export échouait sans erreur), sinon téléchargement (ou partage du navigateur pour une image).
 * `base64` : `content` est déjà encodé (images). Renvoie false si l'utilisateur a fermé la feuille de partage.
 */
export async function saveFile(name: string, content: string, mime: string, { base64 = false } = {}): Promise<boolean> {
  const cancelled = (err: unknown) => /cancel|abort/i.test(String((err as Error)?.name ?? '') + String(err));
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: name, data: content, directory: Directory.Cache, ...(base64 ? {} : { encoding: Encoding.UTF8 }),
    });
    try {
      await Share.share({ title: name, url: uri, dialogTitle: 'Enregistrer ou envoyer' });
      return true;
    } catch (err) {
      if (cancelled(err)) return false;
      throw err;
    }
  }
  const blob = base64
    ? new Blob([Uint8Array.from(atob(content), (ch) => ch.charCodeAt(0))], { type: mime })
    : new Blob([content], { type: mime });
  const file = new File([blob], name, { type: mime });
  // Images : partage direct (stories…) si le navigateur sait ; les exports de données restent des téléchargements
  if (mime.startsWith('image/') && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (err) {
      if (cancelled(err)) return false;
      throw err;
    }
  }
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
  return true;
}
