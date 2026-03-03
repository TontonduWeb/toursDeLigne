const request = require('supertest');
const { app, db } = require('../../serveur-rest.js');

const authActif = process.env.AUTH_ACTIF !== 'false';
const describeAuth = authActif ? describe : describe.skip;

describeAuth('API - Planning Templates (AUTH_ACTIF=true)', () => {
  let adminToken;
  let vendeurIds = [];

  beforeEach(async () => {
    await request(app).post('/api/reinitialiser');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Se connecter en tant qu'admin
    const loginRes = await request(app)
      .post('/api/connexion')
      .send({ nom: 'Matthieu', pin: '0000' });

    adminToken = loginRes.body.token;

    // Créer des vendeurs de test
    vendeurIds = [];
    for (const nom of ['Alice', 'Bob', 'Charlie']) {
      const res = await request(app)
        .post('/api/utilisateurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom, pin: '1234' });
      vendeurIds.push(res.body.utilisateur.id);
    }
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

  describe('GET /api/planning/templates', () => {
    it('devrait retourner une liste vide au départ', async () => {
      const res = await request(app)
        .get('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.templates).toBeDefined();
      expect(res.body.templates).toHaveLength(0);
    });

    it('devrait lister les templates avec vendeurs', async () => {
      // Créer un template
      await request(app)
        .post('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Lundi matin',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 }
          ]
        });

      const res = await request(app)
        .get('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.templates).toHaveLength(1);
      expect(res.body.templates[0].nom).toBe('Lundi matin');
      expect(res.body.templates[0].vendeurs).toHaveLength(2);
      expect(res.body.templates[0].vendeurs[0].nom).toBe('Alice');
    });

    it('devrait rejeter sans token', async () => {
      await request(app)
        .get('/api/planning/templates')
        .expect(401);
    });
  });

  describe('GET /api/planning/templates/:id', () => {
    it('devrait retourner le détail d\'un template', async () => {
      const createRes = await request(app)
        .post('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Weekend',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[2], ordre: 2 }
          ]
        });

      const templateId = createRes.body.template.id;

      const res = await request(app)
        .get(`/api/planning/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.template.nom).toBe('Weekend');
      expect(res.body.template.vendeurs).toHaveLength(2);
      expect(res.body.template.vendeurs[0].nom).toBe('Alice');
      expect(res.body.template.vendeurs[1].nom).toBe('Charlie');
    });

    it('devrait retourner 404 pour un template inexistant', async () => {
      await request(app)
        .get('/api/planning/templates/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/planning/templates', () => {
    it('devrait créer un template avec vendeurs', async () => {
      const res = await request(app)
        .post('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Lundi matin',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 },
            { utilisateur_id: vendeurIds[2], ordre: 3 }
          ]
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.template.nom).toBe('Lundi matin');
      expect(res.body.template.vendeurs).toHaveLength(3);
      expect(res.body.template.vendeurs[0].ordre).toBe(1);
    });

    it('devrait rejeter un nom vide', async () => {
      await request(app)
        .post('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: '',
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        })
        .expect(400);
    });

    it('devrait rejeter sans vendeurs', async () => {
      await request(app)
        .post('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Test', vendeurs: [] })
        .expect(400);
    });

    it('devrait rejeter un vendeur inexistant', async () => {
      await request(app)
        .post('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Test',
          vendeurs: [{ utilisateur_id: 9999, ordre: 1 }]
        })
        .expect(400);
    });

    it('devrait rejeter un nom dupliqué', async () => {
      await request(app)
        .post('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Lundi matin',
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        })
        .expect(201);

      await request(app)
        .post('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Lundi matin',
          vendeurs: [{ utilisateur_id: vendeurIds[1], ordre: 1 }]
        })
        .expect(409);
    });

    it('devrait rejeter sans token', async () => {
      await request(app)
        .post('/api/planning/templates')
        .send({
          nom: 'Test',
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        })
        .expect(401);
    });
  });

  describe('PUT /api/planning/templates/:id', () => {
    let templateId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Original',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 }
          ]
        });
      templateId = res.body.template.id;
    });

    it('devrait modifier le nom', async () => {
      const res = await request(app)
        .put(`/api/planning/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Modifié' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.template.nom).toBe('Modifié');
      // Les vendeurs ne changent pas
      expect(res.body.template.vendeurs).toHaveLength(2);
    });

    it('devrait modifier les vendeurs', async () => {
      const res = await request(app)
        .put(`/api/planning/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vendeurs: [
            { utilisateur_id: vendeurIds[2], ordre: 1 }
          ]
        })
        .expect(200);

      expect(res.body.template.vendeurs).toHaveLength(1);
      expect(res.body.template.vendeurs[0].nom).toBe('Charlie');
    });

    it('devrait modifier nom et vendeurs ensemble', async () => {
      const res = await request(app)
        .put(`/api/planning/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Nouveau nom',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 },
            { utilisateur_id: vendeurIds[2], ordre: 3 }
          ]
        })
        .expect(200);

      expect(res.body.template.nom).toBe('Nouveau nom');
      expect(res.body.template.vendeurs).toHaveLength(3);
    });

    it('devrait retourner 404 pour un template inexistant', async () => {
      await request(app)
        .put('/api/planning/templates/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Test' })
        .expect(404);
    });

    it('devrait rejeter un nom dupliqué', async () => {
      // Créer un 2e template
      await request(app)
        .post('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Autre',
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        });

      await request(app)
        .put(`/api/planning/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Autre' })
        .expect(409);
    });
  });

  describe('DELETE /api/planning/templates/:id', () => {
    it('devrait supprimer un template', async () => {
      const createRes = await request(app)
        .post('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'A supprimer',
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        });

      const templateId = createRes.body.template.id;

      await request(app)
        .delete(`/api/planning/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Vérifier que le template n'existe plus
      await request(app)
        .get(`/api/planning/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('devrait supprimer en cascade les vendeurs associés', async () => {
      const createRes = await request(app)
        .post('/api/planning/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Cascade test',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 }
          ]
        });

      const templateId = createRes.body.template.id;

      await request(app)
        .delete(`/api/planning/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Vérifier que les vendeurs du template sont supprimés
      const count = await new Promise((resolve, reject) => {
        db.get(
          'SELECT COUNT(*) as count FROM planning_template_vendeurs WHERE template_id = ?',
          [templateId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          }
        );
      });
      expect(count).toBe(0);
    });

    it('devrait retourner 404 pour un template inexistant', async () => {
      await request(app)
        .delete('/api/planning/templates/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
