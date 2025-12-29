import type { User, Exercise } from '@/firebase/types';

/**
 * Calcule les calories dépensées pour un exercice spécifique
 * en fonction du profil de l'utilisateur.
 *
 * Formule : Kcal = ((MET * 3.5 * Poids) / 200) * (TempsParRep / 60) * (Taille / 175) * Reps
 */
export const calculateDynamicCalories = (
  user: User | null,
  exercise: Exercise,
  reps: number
): number => {
  if (!user) return 0;

  // 1. Définition des constantes physiologiques et defaults
  const gender = user.gender || 'male'; // Fallback standard

  // Valeurs par défaut selon le sexe (Moyennes standards)
  let defaultWeight = 75;
  let defaultHeight = 175;
  let genderFactor = 1.0;

  if (gender === 'female') {
    defaultWeight = 60;
    defaultHeight = 165;
    genderFactor = 0.9; // Ajustement ≈10% pour différence de composition corporelle
  }

  const weight = user.weight || defaultWeight;
  const height = user.height || defaultHeight;

  // Récupérer MET et TimePerRep de l'exercice (ou par défaut pour exos custom)
  // Valeurs par défaut conservatrices pour custom : MET=4.0 (modéré), Temps=2.0s
  const met = exercise.met || 4.0;
  const timePerRep = exercise.timePerRep || 2.0;

  // 2. Calcul du coût métabolique par minute (Formule ACSM)
  // (MET * 3.5 * poids) / 200
  const kcalPerMinute = (met * 3.5 * weight) / 200;

  // 3. Conversion du coût par répétition (basé sur le temps sous tension moyen)
  const baseCostPerRep = kcalPerMinute * (timePerRep / 60);

  // 4. Ajustement selon l'amplitude (Facteur Taille)
  // Un levier plus long (personne grande) augmente le travail mécanique (W = F * d)
  const heightFactor = height / 175;

  // 5. Calcul final arrondi à 2 décimales avec facteur de genre
  const totalCalories = baseCostPerRep * heightFactor * genderFactor * reps;

  return parseFloat(totalCalories.toFixed(2));
};
