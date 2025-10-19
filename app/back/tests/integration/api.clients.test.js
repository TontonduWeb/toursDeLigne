const request = require('supertest');
const { app, db } = require('../../serveur-rest.js');

describe('API - Gestion Clients', () => {
  beforeEach(async () => {
  await request(app).post('/api/reinitialiser');
  await new Promise(resolve => setTimeout(resolve, 500)); // ✅ 500ms
  
  await request(app)
    .post('/api/demarrer-journee')
    .send({ vendeurs: ['Alice', 'Bob', 'Charlie'] });
  
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

  describe('Prise en charge client', () => {
    it('vendeur disponible peut prendre un client', async () => {
      const res = await request(app)
        .post('/api/prendre-client')
        .send({ vendeur: 'Alice' })
        .expect(200);

      expect(res.body.clientId).toBeDefined();

      const state = await request(app).get('/api/state').expect(200);
      const alice = state.body.vendeurs.find(v => v.nom === 'Alice');
      expect(alice.clientEnCours).toBeDefined();
    });

    it('vendeur occupé ne peut pas prendre un 2e client', async () => {
      await request(app)
        .post('/api/prendre-client')
        .send({ vendeur: 'Alice' })
        .expect(200);

      await request(app)
        .post('/api/prendre-client')
        .send({ vendeur: 'Alice' })
        .expect(400);
    });

    it('tous vendeurs occupés → message approprié', async () => {
      await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });
      await request(app).post('/api/prendre-client').send({ vendeur: 'Bob' });
      await request(app).post('/api/prendre-client').send({ vendeur: 'Charlie' });

      const state = await request(app).get('/api/state').expect(200);
      const tousOccupes = state.body.vendeurs.every(v => v.clientEnCours);
      
      expect(tousOccupes).toBe(true);
      expect(state.body.ordreActuel.prochainVendeur).toBeNull();
    });
  });

  describe('Abandon client', () => {
    it('peut abandonner un client en cours', async () => {
      await request(app)
        .post('/api/prendre-client')
        .send({ vendeur: 'Alice' })
        .expect(200);

      await request(app)
        .post('/api/abandonner-client')
        .send({ vendeur: 'Alice' })
        .expect(200);

      const state = await request(app).get('/api/state').expect(200);
      const alice = state.body.vendeurs.find(v => v.nom === 'Alice');
      expect(alice.clientEnCours).toBeNull();
    });

    it('ne peut pas abandonner plusieurs fois', async () => {
      await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });
      await request(app).post('/api/abandonner-client').send({ vendeur: 'Alice' });

      await request(app)
        .post('/api/abandonner-client')
        .send({ vendeur: 'Alice' })
        .expect(400);
    });

    it('vendeur qui abandonne reste à sa position', async () => {
      const stateBefore = await request(app).get('/api/state');
      const ordreBefore = stateBefore.body.vendeurs.map(v => v.nom);

      await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });
      await new Promise(resolve => setTimeout(resolve, 100));
        
      await request(app).post('/api/abandonner-client').send({ vendeur: 'Alice' });
      await new Promise(resolve => setTimeout(resolve, 100));

      const stateAfter = await request(app).get('/api/state');
      const ordreAfter = stateAfter.body.vendeurs.map(v => v.nom);

      // ✅ L'ordre devrait être identique (Alice reste à sa position)
      expect(ordreAfter).toEqual(ordreBefore);
    });
  });
});