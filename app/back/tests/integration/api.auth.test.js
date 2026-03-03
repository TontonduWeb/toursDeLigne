const request = require('supertest');
const { app, db } = require('../../serveur-rest.js');

const authActif = process.env.AUTH_ACTIF !== 'false';
const describeAuth = authActif ? describe : describe.skip;

describeAuth('API - Authentification (AUTH_ACTIF=true)', () => {
  beforeEach(async () => {
    await request(app).post('/api/reinitialiser');
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return new Promise((resolve) => {
      db.close((err) => {
        if (err) console.error('Erreur fermeture DB:', err);
        resolve();
      });
    });
  });

  describe('GET /api/connexion/vendeurs', () => {
    it('devrait retourner la liste des vendeurs actifs (public)', async () => {
      const res = await request(app)
        .get('/api/connexion/vendeurs')
        .expect(200);

      expect(res.body.vendeurs).toBeDefined();
      expect(Array.isArray(res.body.vendeurs)).toBe(true);
      // L'admin Matthieu doit être dans la liste
      expect(res.body.vendeurs).toContain('Matthieu');
    });
  });

  describe('POST /api/connexion', () => {
    it('devrait connecter l\'admin avec le bon PIN', async () => {
      const res = await request(app)
        .post('/api/connexion')
        .send({ nom: 'Matthieu', pin: '0000' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.utilisateur.nom).toBe('Matthieu');
      expect(res.body.utilisateur.role).toBe('admin');
    });

    it('devrait rejeter un PIN incorrect', async () => {
      await request(app)
        .post('/api/connexion')
        .send({ nom: 'Matthieu', pin: '9999' })
        .expect(401);
    });

    it('devrait rejeter un nom inexistant', async () => {
      await request(app)
        .post('/api/connexion')
        .send({ nom: 'Inconnu', pin: '0000' })
        .expect(401);
    });

    it('devrait rejeter sans nom ou PIN', async () => {
      await request(app)
        .post('/api/connexion')
        .send({ nom: 'Matthieu' })
        .expect(400);

      await request(app)
        .post('/api/connexion')
        .send({ pin: '0000' })
        .expect(400);
    });
  });

  describe('Protection des endpoints métier', () => {
    it('devrait rejeter /api/state sans token', async () => {
      await request(app)
        .get('/api/state')
        .expect(401);
    });

    it('devrait accepter /api/state avec un token valide', async () => {
      // Se connecter d'abord
      const loginRes = await request(app)
        .post('/api/connexion')
        .send({ nom: 'Matthieu', pin: '0000' });

      const token = loginRes.body.token;

      const res = await request(app)
        .get('/api/state')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.vendeurs).toBeDefined();
    });

    it('devrait rejeter un token invalide', async () => {
      await request(app)
        .get('/api/state')
        .set('Authorization', 'Bearer token-invalide')
        .expect(401);
    });

    it('/api/health devrait rester accessible sans token', async () => {
      await request(app)
        .get('/api/health')
        .expect(200);
    });
  });
});
