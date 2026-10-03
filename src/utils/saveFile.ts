import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Remet un fichier à l'utilisateur : téléchargement sur le web, feuille de partage sur mobile
 * (la WebView Android ignore `<a download>` : l'export échouait sans erreur).
 * Renvoie false si l'utilisateur a fermé la feuille de partage.
 */
export async function saveFile(name: string, content: string, mime: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({ path: name, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: name, url: uri, dialogTitle: 'Enregistrer ou envoyer' });
      return true;
    } catch (err) {
      if (String(err).toLowerCase().includes('cancel')) return false;
      throw err;
    }
  }
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
