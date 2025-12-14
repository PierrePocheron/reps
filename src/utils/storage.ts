/**
 * Utilitaires pour la gestion du stockage local
 */

/**
 * Sauvegarde une valeur dans localStorage avec gestion d'erreurs
 */
export function setLocalStorage(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Erreur lors de la sauvegarde dans localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Récupère une valeur depuis localStorage avec gestion d'erreurs
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Erreur lors de la récupération depuis localStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Supprime une clé de localStorage
 */
export function removeLocalStorage(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Erreur lors de la suppression de localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Vide tout le localStorage
 */
export function clearLocalStorage(): boolean {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Erreur lors du vidage de localStorage:', error);
    return false;
  }
}

/**
 * Vérifie si localStorage est disponible
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

