const { getAdjustedDate, getAdjustedDateString, getAdjustedTimeString } = require('../../utils/dateUtils');

describe('Utilitaires Date', () => {
  describe('getAdjustedDate', () => {
    it('devrait retourner une date avec +2h', () => {
      const maintenant = new Date();
      const ajustee = getAdjustedDate();
      
      const diffMs = ajustee.getTime() - maintenant.getTime();
      const diffHeures = diffMs / (1000 * 60 * 60);
      
      // Tolérance de ±0.01h pour le temps d'exécution
      expect(diffHeures).toBeGreaterThanOrEqual(1.99);
      expect(diffHeures).toBeLessThanOrEqual(2.01);
    });

    it('devrait retourner un objet Date', () => {
      const ajustee = getAdjustedDate();
      expect(ajustee).toBeInstanceOf(Date);
    });

    it('devrait être dans le futur', () => {
      const maintenant = new Date();
      const ajustee = getAdjustedDate();
      
      expect(ajustee.getTime()).toBeGreaterThan(maintenant.getTime());
    });
  });

  describe('getAdjustedDateString', () => {
    it('devrait formater en fr-FR (JJ/MM/AAAA)', () => {
      const formatted = getAdjustedDateString();
      
      // Format français : 20/10/2025
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('devrait retourner une chaîne', () => {
      const formatted = getAdjustedDateString();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('getAdjustedTimeString', () => {
    it('devrait formater en fr-FR (HH:MM:SS)', () => {
      const formatted = getAdjustedTimeString();
      
      // Format français : 14:30:45
      expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('devrait retourner une chaîne', () => {
      const formatted = getAdjustedTimeString();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('Intégration', () => {
    it('date et heure devraient être cohérents', () => {
      const date = getAdjustedDate();
      const dateStr = getAdjustedDateString();
      const timeStr = getAdjustedTimeString();

      // Extraire jour/mois/année
      const [jour, mois, annee] = dateStr.split('/').map(Number);
      const [heures, minutes] = timeStr.split(':').map(Number);

      expect(date.getDate()).toBe(jour);
      expect(date.getMonth() + 1).toBe(mois); // Mois commence à 0
      expect(date.getFullYear()).toBe(annee);
      expect(date.getHours()).toBe(heures);
      expect(date.getMinutes()).toBe(minutes);
    });
  });
});