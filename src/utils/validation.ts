/**
 * Validation password centralised
 * Règle actuelle : Minimum 6 caractères
 * (C'est la règle par défaut de Firebase)
 */
export const PASSWORD_MIN_LENGTH = 6;

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, message: 'Le mot de passe est requis.' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      isValid: false,
      message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`
    };
  }

  // Vérifier qu'il y a au moins une lettre
  if (!/[a-zA-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Le mot de passe doit contenir au moins une lettre.'
    };
  }

  // Vérifier qu'il y a au moins un chiffre
  if (!/[0-9]/.test(password)) {
     return {
       isValid: false,
       message: 'Le mot de passe doit contenir au moins un chiffre.'
     };
  }

  return { isValid: true };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
