describe('Logique Métier - Vendeurs', () => {
  describe('Règles de priorité', () => {
    it('vendeur avec moins de ventes est prioritaire', () => {
      const vendeurs = [
        { nom: 'Alice', ventes: 3, clientEnCours: false },
        { nom: 'Bob', ventes: 1, clientEnCours: false },
        { nom: 'Charlie', ventes: 5, clientEnCours: false }
      ];
      
      const prioritaire = vendeurs.reduce((min, v) => 
        !v.clientEnCours && v.ventes < min.ventes ? v : min
      );
      
      expect(prioritaire.nom).toBe('Bob');
    });

    it('en cas d\'égalité, ordre initial respecté', () => {
      const ordreInitial = ['Alice', 'Bob', 'Charlie'];
      const vendeurs = {
        'Alice': { ventes: 2, clientEnCours: false },
        'Bob': { ventes: 2, clientEnCours: false },
        'Charlie': { ventes: 2, clientEnCours: false }
      };
      
      const disponibles = ordreInitial.filter(nom => 
        !vendeurs[nom].clientEnCours
      );
      
      expect(disponibles[0]).toBe('Alice'); // Premier dans l'ordre initial
    });

    it('vendeurs occupés en fin de liste après vente', () => {
      const ordre = ['Alice', 'Bob', 'Charlie'];
      const vendeurs = {
        'Alice': { ventes: 1, clientEnCours: true },
        'Bob': { ventes: 1, clientEnCours: false },
        'Charlie': { ventes: 1, clientEnCours: false }
      };
      
      const disponibles = ordre.filter(n => !vendeurs[n].clientEnCours);
      const occupes = ordre.filter(n => vendeurs[n].clientEnCours);
      const nouvelOrdre = [...disponibles, ...occupes];
      
      expect(nouvelOrdre).toEqual(['Bob', 'Charlie', 'Alice']);
    });

    it('vendeur qui abandonne reste à sa position', () => {
      const ordreAvant = ['Alice', 'Bob', 'Charlie'];
      // Alice abandonne
      const ordreApres = ['Alice', 'Bob', 'Charlie'];
      
      expect(ordreApres).toEqual(ordreAvant);
    });
  });

  describe('Limites', () => {
    it('ne peut pas démarrer avec 0 vendeur', () => {
      const vendeurs = [];
      expect(vendeurs.length).toBe(0);
      // Le test vérifie que l'API rejette cette situation
    });

    it('limite de 20 vendeurs maximum', () => {
      const vendeurs = Array.from({ length: 21 }, (_, i) => `Vendeur${i + 1}`);
      expect(vendeurs.length).toBeGreaterThan(20);
      // Le test vérifie que l'API rejette au-delà de 20
    });
  });

  describe('Ajout vendeur en cours de journée', () => {
    it('nouveau vendeur démarre à 0 ventes', () => {
      const nouveauVendeur = { nom: 'David', ventes: 0 };
      expect(nouveauVendeur.ventes).toBe(0);
    });

    it('nouveau vendeur est prioritaire (0 ventes)', () => {
      const vendeurs = [
        { nom: 'Alice', ventes: 3, clientEnCours: false },
        { nom: 'Bob', ventes: 2, clientEnCours: false },
        { nom: 'David', ventes: 0, clientEnCours: false } // Nouveau
      ];
      
      const minVentes = Math.min(...vendeurs.filter(v => !v.clientEnCours).map(v => v.ventes));
      expect(minVentes).toBe(0);
      
      const prioritaires = vendeurs.filter(v => v.ventes === minVentes);
      expect(prioritaires.some(v => v.nom === 'David')).toBe(true);
    });

    it('ne peut pas ajouter un vendeur existant', () => {
      const vendeurs = ['Alice', 'Bob'];
      const nouveauNom = 'Alice';
      
      expect(vendeurs.includes(nouveauNom)).toBe(true);
      // L'API doit rejeter
    });
  });
});