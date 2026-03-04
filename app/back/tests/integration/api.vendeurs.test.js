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

  describe('Gestion des pauses', () => {
    it('devrait mettre un vendeur en pause', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] });

      const res = await request(app)
        .post('/api/pauser-vendeur')
        .send({ vendeur: 'Alice' })
        .expect(200);

      expect(res.body.success).toBe(true);

      const state = await request(app).get('/api/state');
      const alice = state.body.vendeurs.find(v => v.nom === 'Alice');
      expect(alice.en_pause).toBe(true);
      expect(alice.heure_pause).toBeTruthy();
    });

    it('devrait reprendre un vendeur en pause', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] });

      await request(app)
        .post('/api/pauser-vendeur')
        .send({ vendeur: 'Alice' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const res = await request(app)
        .post('/api/reprendre-vendeur')
        .send({ vendeur: 'Alice' })
        .expect(200);

      expect(res.body.success).toBe(true);

      const state = await request(app).get('/api/state');
      const alice = state.body.vendeurs.find(v => v.nom === 'Alice');
      expect(alice.en_pause).toBe(false);
      expect(alice.heure_pause).toBeNull();
    });

    it('devrait exclure le vendeur en pause du prochain vendeur', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob', 'Charlie'] });

      await request(app)
        .post('/api/pauser-vendeur')
        .send({ vendeur: 'Alice' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const state = await request(app).get('/api/state');
      expect(state.body.ordreActuel.prochainVendeur).toBe('Bob');
    });

    it('devrait rejeter la pause si le vendeur a un client en cours', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] });

      await request(app)
        .post('/api/prendre-client')
        .send({ vendeur: 'Alice' });

      const res = await request(app)
        .post('/api/pauser-vendeur')
        .send({ vendeur: 'Alice' })
        .expect(400);

      expect(res.body.error).toContain('client en cours');
    });

    it('devrait rejeter la pause si le vendeur est déjà en pause', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] });

      await request(app)
        .post('/api/pauser-vendeur')
        .send({ vendeur: 'Alice' });

      const res = await request(app)
        .post('/api/pauser-vendeur')
        .send({ vendeur: 'Alice' })
        .expect(400);

      expect(res.body.error).toContain('déjà en pause');
    });

    it('devrait rejeter la reprise si le vendeur n\'est pas en pause', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] });

      const res = await request(app)
        .post('/api/reprendre-vendeur')
        .send({ vendeur: 'Alice' })
        .expect(400);

      expect(res.body.error).toContain("pas en pause");
    });

    it('POST /api/prendre-client devrait rejeter si le vendeur est en pause', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] });

      await request(app)
        .post('/api/pauser-vendeur')
        .send({ vendeur: 'Alice' });

      const res = await request(app)
        .post('/api/prendre-client')
        .send({ vendeur: 'Alice' })
        .expect(400);

      expect(res.body.error).toContain('en pause');
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