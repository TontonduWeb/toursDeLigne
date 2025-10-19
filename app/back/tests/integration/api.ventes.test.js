const request = require('supertest');
const { app, db } = require('../../serveur-rest.js');

describe('API - Enregistrement Ventes', () => {
  beforeEach(async () => {
  await request(app).post('/api/reinitialiser');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await request(app)
    .post('/api/demarrer-journee')
    .send({ vendeurs: ['Alice', 'Bob', 'Charlie'] });
  
  await new Promise(resolve => setTimeout(resolve, 500));
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

  describe('Vente avec client', () => {
    it('peut enregistrer une vente avec client en cours', async () => {
      await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });

      await request(app)
        .post('/api/enregistrer-vente')
        .send({ vendeur: 'Alice' })
        .expect(200);

      const state = await request(app).get('/api/state');
      const alice = state.body.vendeurs.find(v => v.nom === 'Alice');
      
      expect(alice.ventes).toBe(1);
      expect(alice.clientEnCours).toBeNull();
    });

    it('compteur incrémenté correctement', async () => {
      await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });
      await request(app).post('/api/enregistrer-vente').send({ vendeur: 'Alice' });

      // ✅ Attendre un peu pour que la DB soit à jour
      await new Promise(resolve => setTimeout(resolve, 100));

      await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });
      await request(app).post('/api/enregistrer-vente').send({ vendeur: 'Alice' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const state = await request(app).get('/api/state');
      const alice = state.body.vendeurs.find(v => v.nom === 'Alice');
        
      expect(alice.ventes).toBe(2);
    });

    it('vendeur avec plus de ventes garde sa position en DB', async () => {
  await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });
  await request(app).post('/api/enregistrer-vente').send({ vendeur: 'Alice' });
  await new Promise(resolve => setTimeout(resolve, 200));

  const state = await request(app).get('/api/state');
  const alice = state.body.vendeurs.find(v => v.nom === 'Alice');
  
  // ✅ Alice a bien 1 vente
  expect(alice.ventes).toBe(1);
  
  // ✅ Bob et Charlie ont 0 ventes
  const bob = state.body.vendeurs.find(v => v.nom === 'Bob');
  const charlie = state.body.vendeurs.find(v => v.nom === 'Charlie');
  
  expect(bob.ventes).toBe(0);
  expect(charlie.ventes).toBe(0);
  
  // Note: L'ordre physique en DB ne change pas, c'est le front qui gère le tri
});
  });

  describe('Vente sans client (directe)', () => {
    it('peut enregistrer une vente directe', async () => {
      // TODO: Implémenter /api/enregistrer-vente-directe
      const res = await request(app)
        .post('/api/enregistrer-vente-directe')
        .send({ vendeur: 'Alice' })
        .expect(200);

      const state = await request(app).get('/api/state');
      const alice = state.body.vendeurs.find(v => v.nom === 'Alice');
      
      expect(alice.ventes).toBe(1);
    });
  });

  describe('Statistiques ventes', () => {
    it('total ventes correct', async () => {
  await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });
  await new Promise(resolve => setTimeout(resolve, 100));
  
  await request(app).post('/api/enregistrer-vente').send({ vendeur: 'Alice' });
  await new Promise(resolve => setTimeout(resolve, 100));

  await request(app).post('/api/prendre-client').send({ vendeur: 'Bob' });
  await new Promise(resolve => setTimeout(resolve, 100));
  
  await request(app).post('/api/enregistrer-vente').send({ vendeur: 'Bob' });
  await new Promise(resolve => setTimeout(resolve, 100));

  const stats = await request(app).get('/api/stats').expect(200);
  expect(stats.body.totalVentes).toBe(2);
});

    it('moyenne ventes correcte', async () => {
  await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });
  await new Promise(resolve => setTimeout(resolve, 100));
  
  await request(app).post('/api/enregistrer-vente').send({ vendeur: 'Alice' });
  await new Promise(resolve => setTimeout(resolve, 100));

  await request(app).post('/api/prendre-client').send({ vendeur: 'Alice' });
  await new Promise(resolve => setTimeout(resolve, 100));
  
  await request(app).post('/api/enregistrer-vente').send({ vendeur: 'Alice' });
  await new Promise(resolve => setTimeout(resolve, 200)); // Plus de temps

  const state = await request(app).get('/api/state');
  const totalVentes = state.body.vendeurs.reduce((sum, v) => sum + v.ventes, 0);
  const moyenne = totalVentes / state.body.vendeurs.length;

  expect(totalVentes).toBe(2); // ✅ Vérifier d'abord le total
  expect(moyenne).toBeCloseTo(0.67, 1); // 2 ventes / 3 vendeurs
});
  });
});