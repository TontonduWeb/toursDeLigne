/**
 * Retourne une date avec 2 heures d'avance par rapport à l'heure locale
 */
export const getAdjustedDate = (): Date => {
  return new Date(Date.now() + 2 * 60 * 60 * 1000);
};

/**
 * Retourne la date formatée avec décalage
 */
export const getAdjustedDateString = (): string => {
  return getAdjustedDate().toLocaleDateString('fr-FR');
};

/**
 * Retourne l'heure formatée avec décalage
 */
export const getAdjustedTimeString = (): string => {
  return getAdjustedDate().toLocaleTimeString('fr-FR');
};