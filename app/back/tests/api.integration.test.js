const request = require('supertest');
const { app, db } = require('../serveur-rest.js');

describe('API Integration Tests', () => {
  beforeEach(async () => {
    // Réinitialiser la DB avant chaque test
    await request(app).post('/api/reinitialiser');
  });

  afterAll((done) => {
    // Fermer la DB après tous les tests
    db.close(done);
  });

  describe('POST /api/demarrer-journee', () => {
    it('devrait démarrer une journée avec succès', async () => {
      const res = await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('devrait rejeter une liste vide', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: [] })
        .expect(400);
    });
  });

  describe('Scénario complet', () => {
    it('devrait gérer un cycle client complet', async () => {
      // 1. Démarrer journée
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] })
        .expect(200);

      // 2. Prendre client
      await request(app)
        .post('/api/prendre-client')
        .send({ vendeur: 'Alice' })
        .expect(200);

      // 3. Vérifier état
      let state = await request(app).get('/api/state').expect(200);
      expect(state.body.vendeurs[0].clientEnCours).toBeDefined();

      // 4. Abandonner client
      await request(app)
        .post('/api/abandonner-client')
        .send({ vendeur: 'Alice' })
        .expect(200);

      // 5. Vérifier que le client est bien abandonné
      state = await request(app).get('/api/state').expect(200);
      const alice = state.body.vendeurs.find(v => v.nom === 'Alice');
      expect(alice.clientEnCours).toBeNull();
    });

    it('devrait empêcher double abandon', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice'] })
        .expect(200);

      await request(app)
        .post('/api/prendre-client')
        .send({ vendeur: 'Alice' })
        .expect(200);

      await request(app)
        .post('/api/abandonner-client')
        .send({ vendeur: 'Alice' })
        .expect(200);

      // Second abandon devrait échouer
      await request(app)
        .post('/api/abandonner-client')
        .send({ vendeur: 'Alice' })
        .expect(400);
    });

    it('devrait enregistrer une vente correctement', async () => {
      // Setup
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice'] })
        .expect(200);

      await request(app)
        .post('/api/prendre-client')
        .send({ vendeur: 'Alice' })
        .expect(200);

      // Enregistrer vente
      await request(app)
        .post('/api/enregistrer-vente')
        .send({ vendeur: 'Alice' })
        .expect(200);

      // Vérifier
      const state = await request(app).get('/api/state').expect(200);
      const alice = state.body.vendeurs.find(v => v.nom === 'Alice');
      expect(alice.ventes).toBe(1);
      expect(alice.clientEnCours).toBeNull();
    });
  });

  describe('GET /api/health', () => {
    it('devrait retourner le statut OK', async () => {
      const res = await request(app).get('/api/health').expect(200);
      expect(res.body.status).toBe('OK');
    });
  });
});