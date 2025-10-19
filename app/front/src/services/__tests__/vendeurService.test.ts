import {
  getNombreMinimumVentes,
  getNombreMinimumVentesDisponibles,
  estVendeurDisponible,
  getVendeursDisponibles,
  getVendeursOccupes,
  trierOrdreVendeurs,
  getProchainVendeurDisponible,
  calculerStatistiquesVendeurs,
  doitRecalculerOrdre
} from '../vendeurService';
import { VendeurData } from '../../types';

describe('vendeurService', () => {
  describe('getNombreMinimumVentes', () => {
    it('retourne 0 si aucun vendeur', () => {
      expect(getNombreMinimumVentes({})).toBe(0);
    });

    it('retourne le minimum parmi tous', () => {
      const data: Record<string, VendeurData> = {
        Alice: { nom: 'Alice', compteurVentes: 3 },
        Bob: { nom: 'Bob', compteurVentes: 1 },
        Charlie: { nom: 'Charlie', compteurVentes: 5 }
      };
      expect(getNombreMinimumVentes(data)).toBe(1);
    });
  });

  describe('getNombreMinimumVentesDisponibles', () => {
    it('ignore les vendeurs occupés', () => {
      const data: Record<string, VendeurData> = {
        Alice: { 
          nom: 'Alice', 
          compteurVentes: 1,
          clientEnCours: { id: 'c1', heureDebut: '10:00', dateDebut: '01/01/2025' }
        },
        Bob: { nom: 'Bob', compteurVentes: 3 },
        Charlie: { nom: 'Charlie', compteurVentes: 5 }
      };
      expect(getNombreMinimumVentesDisponibles(data)).toBe(3); // Bob
    });
  });

  describe('estVendeurDisponible', () => {
    it('true si pas de client', () => {
      const data: Record<string, VendeurData> = {
        Alice: { nom: 'Alice', compteurVentes: 0 }
      };
      expect(estVendeurDisponible('Alice', data)).toBe(true);
    });

    it('false si client en cours', () => {
      const data: Record<string, VendeurData> = {
        Alice: {
          nom: 'Alice',
          compteurVentes: 0,
          clientEnCours: { id: 'c1', heureDebut: '10:00', dateDebut: '01/01/2025' }
        }
      };
      expect(estVendeurDisponible('Alice', data)).toBe(false);
    });

    it('false si vendeur inexistant', () => {
      expect(estVendeurDisponible('Ghost', {})).toBe(false);
    });
  });

  describe('getVendeursDisponibles', () => {
    it('retourne uniquement les disponibles', () => {
      const ordre = ['Alice', 'Bob', 'Charlie'];
      const data: Record<string, VendeurData> = {
        Alice: { nom: 'Alice', compteurVentes: 0 },
        Bob: {
          nom: 'Bob',
          compteurVentes: 0,
          clientEnCours: { id: 'c1', heureDebut: '10:00', dateDebut: '01/01/2025' }
        },
        Charlie: { nom: 'Charlie', compteurVentes: 0 }
      };
      
      const disponibles = getVendeursDisponibles(ordre, data);
      expect(disponibles).toEqual(['Alice', 'Charlie']);
    });
  });

  describe('getVendeursOccupes', () => {
    it('retourne uniquement les occupés', () => {
      const ordre = ['Alice', 'Bob', 'Charlie'];
      const data: Record<string, VendeurData> = {
        Alice: { nom: 'Alice', compteurVentes: 0 },
        Bob: {
          nom: 'Bob',
          compteurVentes: 0,
          clientEnCours: { id: 'c1', heureDebut: '10:00', dateDebut: '01/01/2025' }
        },
        Charlie: { nom: 'Charlie', compteurVentes: 0 }
      };
      
      const occupes = getVendeursOccupes(ordre, data);
      expect(occupes).toEqual(['Bob']);
    });
  });

  describe('trierOrdreVendeurs', () => {
    it('place vendeur min ventes en premier', () => {
      const ordreInitial = ['Alice', 'Bob', 'Charlie'];
      const ordreActuel = ['Alice', 'Bob', 'Charlie'];
      const data: Record<string, VendeurData> = {
        Alice: { nom: 'Alice', compteurVentes: 3 },
        Bob: { nom: 'Bob', compteurVentes: 1 },
        Charlie: { nom: 'Charlie', compteurVentes: 2 }
      };
      
      const resultat = trierOrdreVendeurs(ordreInitial, ordreActuel, data);
      expect(resultat[0]).toBe('Bob');
    });

    it('égalité → ordre initial respecté', () => {
      const ordreInitial = ['Alice', 'Bob', 'Charlie'];
      const ordreActuel = ['Alice', 'Bob', 'Charlie'];
      const data: Record<string, VendeurData> = {
        Alice: { nom: 'Alice', compteurVentes: 2 },
        Bob: { nom: 'Bob', compteurVentes: 2 },
        Charlie: { nom: 'Charlie', compteurVentes: 2 }
      };
      
      const resultat = trierOrdreVendeurs(ordreInitial, ordreActuel, data);
      expect(resultat).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('occupés en dernier', () => {
      const ordreInitial = ['Alice', 'Bob', 'Charlie'];
      const ordreActuel = ['Alice', 'Bob', 'Charlie'];
      const data: Record<string, VendeurData> = {
        Alice: {
          nom: 'Alice',
          compteurVentes: 0,
          clientEnCours: { id: 'c1', heureDebut: '10:00', dateDebut: '01/01/2025' }
        },
        Bob: { nom: 'Bob', compteurVentes: 0 },
        Charlie: { nom: 'Charlie', compteurVentes: 0 }
      };
      
      const resultat = trierOrdreVendeurs(ordreInitial, ordreActuel, data);
      expect(resultat[resultat.length - 1]).toBe('Alice');
    });

    it('nouveau vendeur (0 ventes) prioritaire', () => {
      const ordreInitial = ['Alice', 'Bob', 'Charlie'];
      const ordreActuel = ['Alice', 'Bob', 'Charlie'];
      const data: Record<string, VendeurData> = {
        Alice: { nom: 'Alice', compteurVentes: 2 },
        Bob: { nom: 'Bob', compteurVentes: 1 },
        Charlie: { nom: 'Charlie', compteurVentes: 0 } // Nouveau
      };
      
      const resultat = trierOrdreVendeurs(ordreInitial, ordreActuel, data);
      expect(resultat[0]).toBe('Charlie');
    });
  });

  describe('getProchainVendeurDisponible', () => {
    it('retourne le premier disponible', () => {
      const ordre = ['Alice', 'Bob', 'Charlie'];
      const data: Record<string, VendeurData> = {
        Alice: { nom: 'Alice', compteurVentes: 0 },
        Bob: { nom: 'Bob', compteurVentes: 0 },
        Charlie: { nom: 'Charlie', compteurVentes: 0 }
      };
      
      expect(getProchainVendeurDisponible(ordre, data)).toBe('Alice');
    });

    it('retourne null si tous occupés', () => {
      const ordre = ['Alice', 'Bob'];
      const data: Record<string, VendeurData> = {
        Alice: {
          nom: 'Alice',
          compteurVentes: 0,
          clientEnCours: { id: 'c1', heureDebut: '10:00', dateDebut: '01/01/2025' }
        },
        Bob: {
          nom: 'Bob',
          compteurVentes: 0,
          clientEnCours: { id: 'c2', heureDebut: '10:05', dateDebut: '01/01/2025' }
        }
      };
      
      expect(getProchainVendeurDisponible(ordre, data)).toBeNull();
    });
  });

  describe('calculerStatistiquesVendeurs', () => {
    it('calcule correctement les stats', () => {
      const data: Record<string, VendeurData> = {
        Alice: { nom: 'Alice', compteurVentes: 3 },
        Bob: {
          nom: 'Bob',
          compteurVentes: 1,
          clientEnCours: { id: 'c1', heureDebut: '10:00', dateDebut: '01/01/2025' }
        },
        Charlie: { nom: 'Charlie', compteurVentes: 2 }
      };
      
      const stats = calculerStatistiquesVendeurs(data);
      
      expect(stats.totalVendeurs).toBe(3);
      expect(stats.vendeursOccupes).toBe(1);
      expect(stats.vendeursDisponibles).toBe(2);
      expect(stats.totalVentes).toBe(6);
      expect(stats.moyenneVentes).toBe(2);
    });
  });

  describe('doitRecalculerOrdre', () => {
    it('true si premier vendeur occupé', () => {
      const ordre = ['Alice', 'Bob'];
      const data: Record<string, VendeurData> = {
        Alice: {
          nom: 'Alice',
          compteurVentes: 0,
          clientEnCours: { id: 'c1', heureDebut: '10:00', dateDebut: '01/01/2025' }
        },
        Bob: { nom: 'Bob', compteurVentes: 0 }
      };
      
      expect(doitRecalculerOrdre(ordre, data)).toBe(true);
    });

    it('true si premier vendeur n\'a pas le min', () => {
      const ordre = ['Alice', 'Bob'];
      const data: Record<string, VendeurData> = {
        Alice: { nom: 'Alice', compteurVentes: 2 },
        Bob: { nom: 'Bob', compteurVentes: 0 }
      };
      
      expect(doitRecalculerOrdre(ordre, data)).toBe(true);
    });

    it('false si premier vendeur OK', () => {
      const ordre = ['Alice', 'Bob'];
      const data: Record<string, VendeurData> = {
        Alice: { nom: 'Alice', compteurVentes: 0 },
        Bob: { nom: 'Bob', compteurVentes: 1 }
      };
      
      expect(doitRecalculerOrdre(ordre, data)).toBe(false);
    });
  });
});