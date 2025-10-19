/**
 * Retourne une date avec 2 heures d'avance par rapport à l'heure locale
 */
function getAdjustedDate() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000);
}

/**
 * Retourne la date formatée avec décalage
 */
function getAdjustedDateString() {
  return getAdjustedDate().toLocaleDateString('fr-FR');
}

/**
 * Retourne l'heure formatée avec décalage
 */
function getAdjustedTimeString() {
  return getAdjustedDate().toLocaleTimeString('fr-FR');
}

module.exports = {
  getAdjustedDate,
  getAdjustedDateString,
  getAdjustedTimeString
};