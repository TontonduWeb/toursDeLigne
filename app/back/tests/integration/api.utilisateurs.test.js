const request = require('supertest');
const { app, db } = require('../../serveur-rest.js');

const authActif = process.env.AUTH_ACTIF !== 'false';
const describeAuth = authActif ? describe : describe.skip;

describeAuth('API - Gestion Utilisateurs (AUTH_ACTIF=true)', () => {
  let adminToken;

  beforeEach(async () => {
    await request(app).post('/api/reinitialiser');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Se connecter en tant qu'admin
    const loginRes = await request(app)
      .post('/api/connexion')
      .send({ nom: 'Matthieu', pin: '0000' });

    adminToken = loginRes.body.token;
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

  describe('GET /api/utilisateurs', () => {
    it('devrait lister les utilisateurs pour un admin', async () => {
      const res = await request(app)
        .get('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.utilisateurs).toBeDefined();
      expect(res.body.utilisateurs.length).toBeGreaterThanOrEqual(1);
      expect(res.body.utilisateurs[0].nom).toBe('Matthieu');
      // pin_hash ne doit pas être exposé
      expect(res.body.utilisateurs[0].pin_hash).toBeUndefined();
    });

    it('devrait rejeter sans token', async () => {
      await request(app)
        .get('/api/utilisateurs')
        .expect(401);
    });
  });

  describe('POST /api/utilisateurs', () => {
    it('devrait créer un vendeur', async () => {
      const res = await request(app)
        .post('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Alice', pin: '1234' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.utilisateur.nom).toBe('Alice');
      expect(res.body.utilisateur.role).toBe('vendeur');
    });

    it('devrait créer un admin', async () => {
      const res = await request(app)
        .post('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Bob', pin: '5678', role: 'admin' })
        .expect(201);

      expect(res.body.utilisateur.role).toBe('admin');
    });

    it('devrait rejeter un PIN non-4 chiffres', async () => {
      await request(app)
        .post('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Alice', pin: '12' })
        .expect(400);

      await request(app)
        .post('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Alice', pin: 'abcd' })
        .expect(400);
    });

    it('devrait rejeter un nom en double', async () => {
      await request(app)
        .post('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Alice', pin: '1234' })
        .expect(201);

      await request(app)
        .post('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Alice', pin: '5678' })
        .expect(409);
    });

    it('devrait rejeter un nom vide', async () => {
      await request(app)
        .post('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: '', pin: '1234' })
        .expect(400);
    });
  });

  describe('PUT /api/utilisateurs/:id', () => {
    it('devrait modifier le nom d\'un utilisateur', async () => {
      // Créer un vendeur
      const createRes = await request(app)
        .post('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Alice', pin: '1234' });

      const id = createRes.body.utilisateur.id;

      await request(app)
        .put(`/api/utilisateurs/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'AliceModifie' })
        .expect(200);
    });

    it('devrait modifier le PIN d\'un utilisateur', async () => {
      const createRes = await request(app)
        .post('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Alice', pin: '1234' });

      const id = createRes.body.utilisateur.id;

      await request(app)
        .put(`/api/utilisateurs/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ pin: '9999' })
        .expect(200);

      // Vérifier que le nouveau PIN fonctionne
      await request(app)
        .post('/api/connexion')
        .send({ nom: 'Alice', pin: '9999' })
        .expect(200);
    });

    it('devrait interdire de désactiver le dernier admin', async () => {
      // Matthieu est le seul admin (id=1 après seed)
      const listRes = await request(app)
        .get('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`);

      const matthieuId = listRes.body.utilisateurs.find(u => u.nom === 'Matthieu').id;

      await request(app)
        .put(`/api/utilisateurs/${matthieuId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ actif: 0 })
        .expect(400);
    });
  });

  describe('DELETE /api/utilisateurs/:id', () => {
    it('devrait supprimer un vendeur', async () => {
      const createRes = await request(app)
        .post('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Alice', pin: '1234' });

      const id = createRes.body.utilisateur.id;

      await request(app)
        .delete(`/api/utilisateurs/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('devrait interdire de supprimer le dernier admin', async () => {
      const listRes = await request(app)
        .get('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`);

      const matthieuId = listRes.body.utilisateurs.find(u => u.nom === 'Matthieu').id;

      await request(app)
        .delete(`/api/utilisateurs/${matthieuId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /api/utilisateurs/vendeurs-actifs', () => {
    it('devrait retourner uniquement les vendeurs actifs', async () => {
      // Créer un vendeur
      await request(app)
        .post('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Alice', pin: '1234' });

      const res = await request(app)
        .get('/api/utilisateurs/vendeurs-actifs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.vendeurs).toBeDefined();
      // Alice est vendeur, Matthieu est admin
      const noms = res.body.vendeurs.map(v => v.nom);
      expect(noms).toContain('Alice');
      expect(noms).not.toContain('Matthieu');
    });
  });
});
