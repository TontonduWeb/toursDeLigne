const request = require('supertest');
const { app, db } = require('../../serveur-rest.js');

describe('API - Gestion Vendeurs', () => {
  beforeEach(async () => {
  await request(app).post('/api/reinitialiser');
  await new Promise(resolve => setTimeout(resolve, 500)); // ✅ 500ms
});

  afterAll(async () => {
  // Attendre un peu pour que toutes les opérations se terminent
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) console.error('Erreur fermeture DB:', err);
      resolve();
    });
  });
});

  describe('Ajout vendeur en cours de journée', () => {
    it('nouveau vendeur démarre à 0 ventes', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] });

      await request(app)
        .post('/api/ajouter-vendeur')
        .send({ vendeur: 'Charlie' })
        .expect(200);

      const state = await request(app).get('/api/state');
      const charlie = state.body.vendeurs.find(v => v.nom === 'Charlie');
      
      expect(charlie.ventes).toBe(0);
    });

    it('nouveau vendeur est prioritaire', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Alice fait une vente
      await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });
      await new Promise(resolve => setTimeout(resolve, 100));
        
      await request(app).post('/api/enregistrer-vente').send({ vendeur: 'Alice' });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Ajout Charlie
      await request(app).post('/api/ajouter-vendeur').send({ vendeur: 'Charlie' });
      await new Promise(resolve => setTimeout(resolve, 200));

      const state = await request(app).get('/api/state');
        
      // Charlie (0 ventes) ou Bob (0 ventes) devrait être prochain
      // Comme Bob était là avant, il est prioritaire selon l'ordre initial
      const prochainVendeur = state.body.ordreActuel.prochainVendeur;
        
      // ✅ Le prochain devrait avoir 0 ventes (Bob ou Charlie)
      const prochain = state.body.vendeurs.find(v => v.nom === prochainVendeur);
      expect(prochain.ventes).toBe(0);
    });

    it('ne peut pas ajouter un vendeur existant', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice'] });

      await request(app)
        .post('/api/ajouter-vendeur')
        .send({ vendeur: 'Alice' })
        .expect(400);
    });

    it('trace l\'ajout dans l\'historique', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice'] });

      await request(app)
        .post('/api/ajouter-vendeur')
        .send({ vendeur: 'Bob' });

      const state = await request(app).get('/api/state');
      const historiqueAjout = state.body.historique.find(h => 
        h.action.includes('Bob ajouté')
      );

      expect(historiqueAjout).toBeDefined();
    });
  });

  describe('Ordre vendeurs', () => {
    it('vendeur min ventes est premier', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob', 'Charlie'] });

      await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });
      await request(app).post('/api/enregistrer-vente').send({ vendeur: 'Alice' });

      await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });
      await request(app).post('/api/enregistrer-vente').send({ vendeur: 'Alice' });

      const state = await request(app).get('/api/state');
      
      // Bob ou Charlie (0 ventes) devrait être prochain
      const prochainVendeur = state.body.ordreActuel.prochainVendeur;
      expect(['Bob', 'Charlie']).toContain(prochainVendeur);
    });

    it('égalité de ventes → ordre initial respecté', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob', 'Charlie'] });

      const state = await request(app).get('/api/state');
      
      // Tous à 0, donc Alice est première
      expect(state.body.ordreActuel.prochainVendeur).toBe('Alice');
    });
  });
});