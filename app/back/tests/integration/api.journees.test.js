const request = require('supertest');
const { app, db } = require('../../serveur-rest.js');

const authActif = process.env.AUTH_ACTIF !== 'false';
const describeAuth = authActif ? describe : describe.skip;

describeAuth('API - Planning Journées (AUTH_ACTIF=true)', () => {
  let adminToken;
  let vendeurToken;
  let vendeurIds = [];
  let templateId;

  beforeEach(async () => {
    await request(app).post('/api/reinitialiser');
    await new Promise(resolve => setTimeout(resolve, 1000));

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

    // Se connecter en tant que vendeur (Alice)
    const vendeurLoginRes = await request(app)
      .post('/api/connexion')
      .send({ nom: 'Alice', pin: '1234' });
    vendeurToken = vendeurLoginRes.body.token;

    // Créer un template de test
    const templateRes = await request(app)
      .post('/api/planning/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nom: 'Template test',
        vendeurs: [
          { utilisateur_id: vendeurIds[0], ordre: 1 },
          { utilisateur_id: vendeurIds[1], ordre: 2 }
        ]
      });
    templateId = templateRes.body.template.id;
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('POST /api/planning/journees', () => {
    it('devrait créer une journée avec des vendeurs directs', async () => {
      const res = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-10',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 },
            { utilisateur_id: vendeurIds[2], ordre: 3 }
          ]
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.journee.date_journee).toBe('2026-03-10');
      expect(res.body.journee.statut).toBe('planifie');
      expect(res.body.journee.vendeurs).toHaveLength(3);
      expect(res.body.journee.vendeurs[0].nom).toBe('Alice');
    });

    it('devrait créer une journée depuis un template', async () => {
      const res = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-11',
          template_id: templateId
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.journee.template_id).toBe(templateId);
      expect(res.body.journee.vendeurs).toHaveLength(2);
      expect(res.body.journee.vendeurs[0].nom).toBe('Alice');
      expect(res.body.journee.vendeurs[1].nom).toBe('Bob');
    });

    it('devrait rejeter une date invalide', async () => {
      await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: 'pas-une-date',
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        })
        .expect(400);
    });

    it('devrait rejeter une date dupliquée (409)', async () => {
      await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-12',
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        })
        .expect(201);

      const res = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-12',
          vendeurs: [{ utilisateur_id: vendeurIds[1], ordre: 1 }]
        })
        .expect(409);

      expect(res.body.error).toContain('existe déjà');
    });

    it('devrait rejeter un vendeur inexistant', async () => {
      await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-13',
          vendeurs: [{ utilisateur_id: 9999, ordre: 1 }]
        })
        .expect(400);
    });

    it('devrait rejeter un template inexistant', async () => {
      await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-14',
          template_id: 9999
        })
        .expect(404);
    });

    it('devrait rejeter sans token (401)', async () => {
      await request(app)
        .post('/api/planning/journees')
        .send({
          date_journee: '2026-03-15',
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        })
        .expect(401);
    });
  });

  describe('GET /api/planning/journees', () => {
    it('devrait retourner une liste vide', async () => {
      const res = await request(app)
        .get('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.journees).toHaveLength(0);
    });

    it('devrait lister les journées avec vendeurs', async () => {
      await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-10',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 }
          ]
        });

      await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-11',
          vendeurs: [{ utilisateur_id: vendeurIds[2], ordre: 1 }]
        });

      const res = await request(app)
        .get('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.journees).toHaveLength(2);
      expect(res.body.journees[0].date_journee).toBe('2026-03-10');
      expect(res.body.journees[0].vendeurs).toHaveLength(2);
      expect(res.body.journees[1].date_journee).toBe('2026-03-11');
    });

    it('devrait filtrer par plage de dates', async () => {
      await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-10',
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        });

      await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-20',
          vendeurs: [{ utilisateur_id: vendeurIds[1], ordre: 1 }]
        });

      const res = await request(app)
        .get('/api/planning/journees')
        .query({ du: '2026-03-15', au: '2026-03-25' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.journees).toHaveLength(1);
      expect(res.body.journees[0].date_journee).toBe('2026-03-20');
    });
  });

  describe('GET /api/planning/journees/:id', () => {
    it('devrait retourner le détail d\'une journée', async () => {
      const createRes = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-10',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 }
          ]
        });

      const journeeId = createRes.body.journee.id;

      const res = await request(app)
        .get(`/api/planning/journees/${journeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.journee.date_journee).toBe('2026-03-10');
      expect(res.body.journee.vendeurs).toHaveLength(2);
    });

    it('devrait retourner 404 pour une journée inexistante', async () => {
      await request(app)
        .get('/api/planning/journees/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/planning/journees/:id', () => {
    let journeeId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-10',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 }
          ]
        });
      journeeId = res.body.journee.id;
    });

    it('devrait modifier les vendeurs d\'une journée planifiée', async () => {
      const res = await request(app)
        .put(`/api/planning/journees/${journeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vendeurs: [
            { utilisateur_id: vendeurIds[2], ordre: 1 }
          ]
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.journee.vendeurs).toHaveLength(1);
      expect(res.body.journee.vendeurs[0].nom).toBe('Charlie');
    });

    it('devrait rejeter la modification si statut != planifie', async () => {
      // Changer le statut en en_cours directement en DB
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE planning_journees SET statut = ? WHERE id = ?',
          ['en_cours', journeeId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await request(app)
        .put(`/api/planning/journees/${journeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        })
        .expect(400);
    });

    it('devrait retourner 404 pour une journée inexistante', async () => {
      await request(app)
        .put('/api/planning/journees/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        })
        .expect(404);
    });
  });

  describe('DELETE /api/planning/journees/:id', () => {
    it('devrait supprimer une journée planifiée', async () => {
      const createRes = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-10',
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        });

      const journeeId = createRes.body.journee.id;

      await request(app)
        .delete(`/api/planning/journees/${journeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Vérifier que la journée n'existe plus
      await request(app)
        .get(`/api/planning/journees/${journeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('devrait supprimer en cascade les vendeurs associés', async () => {
      const createRes = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-10',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 }
          ]
        });

      const journeeId = createRes.body.journee.id;

      await request(app)
        .delete(`/api/planning/journees/${journeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const count = await new Promise((resolve, reject) => {
        db.get(
          'SELECT COUNT(*) as count FROM planning_journee_vendeurs WHERE journee_id = ?',
          [journeeId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          }
        );
      });
      expect(count).toBe(0);
    });

    it('devrait rejeter la suppression si statut != planifie', async () => {
      const createRes = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-10',
          vendeurs: [{ utilisateur_id: vendeurIds[0], ordre: 1 }]
        });

      const journeeId = createRes.body.journee.id;

      // Changer le statut
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE planning_journees SET statut = ? WHERE id = ?',
          ['en_cours', journeeId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await request(app)
        .delete(`/api/planning/journees/${journeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PUT /api/planning/journees/:id/presence', () => {
    let journeeId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-10',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 }
          ]
        });
      journeeId = res.body.journee.id;
    });

    it('devrait basculer la présence d\'un vendeur', async () => {
      const res = await request(app)
        .put(`/api/planning/journees/${journeeId}/presence`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ utilisateur_id: vendeurIds[0], present: false })
        .expect(200);

      expect(res.body.success).toBe(true);
      const alice = res.body.journee.vendeurs.find(v => v.utilisateur_id === vendeurIds[0]);
      expect(alice.present).toBe(0);
    });

    it('devrait retourner 404 pour un vendeur absent de la journée', async () => {
      await request(app)
        .put(`/api/planning/journees/${journeeId}/presence`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ utilisateur_id: vendeurIds[2], present: false })
        .expect(404);
    });
  });

  describe('PUT /api/planning/journees/:id/presence-masse', () => {
    let journeeId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: '2026-03-10',
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 }
          ]
        });
      journeeId = res.body.journee.id;
    });

    it('devrait mettre tous les vendeurs absents', async () => {
      const res = await request(app)
        .put(`/api/planning/journees/${journeeId}/presence-masse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ present: false })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.journee.vendeurs).toHaveLength(2);
      expect(res.body.journee.vendeurs.every(v => v.present === 0)).toBe(true);
    });

    it('devrait mettre tous les vendeurs présents', async () => {
      // D'abord les mettre absents
      await request(app)
        .put(`/api/planning/journees/${journeeId}/presence-masse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ present: false });

      // Puis les remettre présents
      const res = await request(app)
        .put(`/api/planning/journees/${journeeId}/presence-masse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ present: true })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.journee.vendeurs.every(v => v.present === 1)).toBe(true);
    });

    it('devrait rejeter si statut !== planifie', async () => {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE planning_journees SET statut = ? WHERE id = ?',
          ['en_cours', journeeId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await request(app)
        .put(`/api/planning/journees/${journeeId}/presence-masse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ present: false })
        .expect(400);
    });
  });

  describe('Transition automatique des statuts', () => {
    it('devrait passer le statut à en_cours quand la journée démarre', async () => {
      const aujourdhui = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Créer une journée planifiée pour aujourd'hui
      const createRes = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: aujourdhui,
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 }
          ]
        });
      const journeeId = createRes.body.journee.id;

      // Démarrer la journée avec les noms des vendeurs
      await request(app)
        .post('/api/demarrer-journee')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendeurs: ['Alice', 'Bob'] })
        .expect(200);

      // Laisser le temps à l'UPDATE fire-and-forget
      await new Promise(resolve => setTimeout(resolve, 300));

      // Vérifier que le statut est passé à en_cours
      const res = await request(app)
        .get(`/api/planning/journees/${journeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.journee.statut).toBe('en_cours');
    });

    it('devrait passer le statut à termine quand la journée se termine', async () => {
      const aujourdhui = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Créer une journée planifiée pour aujourd'hui
      const createRes = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: aujourdhui,
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 }
          ]
        });
      const journeeId = createRes.body.journee.id;

      // Démarrer la journée
      await request(app)
        .post('/api/demarrer-journee')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendeurs: ['Alice', 'Bob'] })
        .expect(200);

      // Terminer la journée
      await request(app)
        .post('/api/terminer-journee')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Laisser le temps à l'UPDATE fire-and-forget
      await new Promise(resolve => setTimeout(resolve, 300));

      // Vérifier que le statut est passé à termine
      const res = await request(app)
        .get(`/api/planning/journees/${journeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.journee.statut).toBe('termine');
    });

    it('ne devrait pas affecter les journées d\'autres dates', async () => {
      const demain = new Date(Date.now() + 2 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Créer une journée planifiée pour demain
      const createRes = await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: demain,
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 }
          ]
        });
      const journeeId = createRes.body.journee.id;

      // Démarrer une journée aujourd'hui (sans planning)
      await request(app)
        .post('/api/demarrer-journee')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendeurs: ['Alice'] })
        .expect(200);

      // Laisser le temps à l'UPDATE fire-and-forget
      await new Promise(resolve => setTimeout(resolve, 300));

      // Vérifier que la journée de demain reste planifiée
      const res = await request(app)
        .get(`/api/planning/journees/${journeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.journee.statut).toBe('planifie');
    });
  });

  describe('GET /api/planning-du-jour', () => {
    it('devrait retourner null si aucune journée aujourd\'hui', async () => {
      const res = await request(app)
        .get('/api/planning-du-jour')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.journee).toBeNull();
    });

    it('devrait retourner la journée du jour', async () => {
      // Récupérer la date du jour (avec le même décalage que le serveur)
      const aujourdhui = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split('T')[0];

      await request(app)
        .post('/api/planning/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date_journee: aujourdhui,
          vendeurs: [
            { utilisateur_id: vendeurIds[0], ordre: 1 },
            { utilisateur_id: vendeurIds[1], ordre: 2 }
          ]
        });

      const res = await request(app)
        .get('/api/planning-du-jour')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.journee).not.toBeNull();
      expect(res.body.journee.date_journee).toBe(aujourdhui);
      expect(res.body.journee.vendeurs).toHaveLength(2);
    });

    it('devrait être accessible par un vendeur (non admin)', async () => {
      const res = await request(app)
        .get('/api/planning-du-jour')
        .set('Authorization', `Bearer ${vendeurToken}`)
        .expect(200);

      expect(res.body.journee).toBeNull();
    });
  });
});
