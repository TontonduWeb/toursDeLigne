const request = require('supertest');
const { app, db } = require('../../serveur-rest.js');

describe('API - Gestion Journée', () => {
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

  describe('Démarrage journée', () => {
    it('devrait démarrer avec 2+ vendeurs', async () => {
      const res = await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] })
        .expect(200);

      expect(res.body.success).toBe(true);

      const state = await request(app).get('/api/state').expect(200);
      expect(state.body.vendeurs).toHaveLength(2);
    });

    it('devrait rejeter 0 vendeur', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: [] })
        .expect(400);
    });

    it('devrait rejeter plus de 20 vendeurs', async () => {
      const vendeurs = Array.from({ length: 21 }, (_, i) => `Vendeur${i + 1}`);
      
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs })
        .expect(400);
    });

    it('devrait créer une entrée historique au démarrage', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] })
        .expect(200);

      const state = await request(app).get('/api/state').expect(200);
      const historiqueDemar = state.body.historique.find(h => 
        h.action.includes('Démarrage')
      );

      expect(historiqueDemar).toBeDefined();
    });
  });

  describe('Clôture journée', () => {
    it('devrait clôturer et exporter les données', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice', 'Bob'] })
        .expect(200);

      await request(app)
        .post('/api/prendre-client')
        .send({ vendeur: 'Alice' })
        .expect(200);

      await request(app)
        .post('/api/enregistrer-vente')
        .send({ vendeur: 'Alice' })
        .expect(200);

      const res = await request(app)
        .post('/api/terminer-journee')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.exportData).toBeDefined();
      expect(res.body.exportData.statistiques.totalVentes).toBe(1);
    });

    it('devrait réinitialiser après clôture', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice'] })
        .expect(200);

      await request(app).post('/api/terminer-journee').expect(200);

      const state = await request(app).get('/api/state').expect(200);
      expect(state.body.vendeurs).toHaveLength(0);
      expect(state.body.historique).toHaveLength(0);
    });

    it('devrait clôturer même avec clients en cours', async () => {
      await request(app)
        .post('/api/demarrer-journee')
        .send({ vendeurs: ['Alice'] })
        .expect(200);

      await request(app)
        .post('/api/prendre-client')
        .send({ vendeur: 'Alice' })
        .expect(200);

      const res = await request(app)
        .post('/api/terminer-journee')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.exportData.vendeurs[0].clientEnCours).toBeDefined();
    });
  });
});