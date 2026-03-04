const request = require('supertest');
const { app, db } = require('../../serveur-rest.js');

const authActif = process.env.AUTH_ACTIF !== 'false';
const describeAuth = authActif ? describe : describe.skip;

describeAuth('API - Archives journées (AUTH_ACTIF=true)', () => {
  let adminToken;
  let vendeurIds = [];

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
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  // Helper : démarrer et terminer une journée pour créer une archive
  async function creerArchive(vendeurs, ventes = {}) {
    // Démarrer la journée
    await request(app)
      .post('/api/demarrer-journee')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ vendeurs });

    // Faire des ventes si demandé
    for (const [vendeur, nbVentes] of Object.entries(ventes)) {
      for (let i = 0; i < nbVentes; i++) {
        await request(app)
          .post('/api/enregistrer-vente-directe')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ vendeur });
      }
    }

    // Terminer la journée
    const res = await request(app)
      .post('/api/terminer-journee')
      .set('Authorization', `Bearer ${adminToken}`);

    // Laisser le temps à l'INSERT archive
    await new Promise(resolve => setTimeout(resolve, 300));

    return res;
  }

  describe('Archivage automatique à la clôture', () => {
    it('devrait créer une archive en base quand la journée est terminée', async () => {
      await creerArchive(['Alice', 'Bob'], { Alice: 3, Bob: 2 });

      const res = await request(app)
        .get('/api/archives/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.archives).toHaveLength(1);
      expect(res.body.archives[0].total_vendeurs).toBe(2);
      expect(res.body.archives[0].total_ventes).toBe(5);
    });

    it('devrait contenir les bonnes statistiques dans l\'archive', async () => {
      await creerArchive(['Alice', 'Bob', 'Charlie'], { Alice: 4, Bob: 2, Charlie: 0 });

      const res = await request(app)
        .get('/api/archives/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const archive = res.body.archives[0];
      expect(archive.total_vendeurs).toBe(3);
      expect(archive.total_ventes).toBe(6);
      expect(archive.moyenne_ventes).toBe(2);
    });
  });

  describe('GET /api/archives/journees', () => {
    it('devrait lister les archives sans le blob donnees', async () => {
      await creerArchive(['Alice'], { Alice: 1 });

      const res = await request(app)
        .get('/api/archives/journees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.archives).toHaveLength(1);
      expect(res.body.archives[0]).not.toHaveProperty('donnees');
      expect(res.body.archives[0]).toHaveProperty('id');
      expect(res.body.archives[0]).toHaveProperty('date_journee');
      expect(res.body.archives[0]).toHaveProperty('total_ventes');
    });

    it('devrait filtrer par plage de dates', async () => {
      // Créer une archive pour aujourd'hui
      await creerArchive(['Alice'], { Alice: 1 });

      // Chercher dans une plage qui ne contient pas aujourd'hui
      const res = await request(app)
        .get('/api/archives/journees')
        .query({ du: '2020-01-01', au: '2020-12-31' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.archives).toHaveLength(0);
    });
  });

  describe('GET /api/archives/journees/:id', () => {
    it('devrait retourner le détail avec donnees parsé', async () => {
      await creerArchive(['Alice', 'Bob'], { Alice: 2, Bob: 1 });

      // Récupérer l'ID de l'archive
      const listRes = await request(app)
        .get('/api/archives/journees')
        .set('Authorization', `Bearer ${adminToken}`);
      const archiveId = listRes.body.archives[0].id;

      const res = await request(app)
        .get(`/api/archives/journees/${archiveId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.archive).toHaveProperty('donnees');
      expect(typeof res.body.archive.donnees).toBe('object');
      expect(res.body.archive.donnees.vendeurs).toHaveLength(2);
      expect(res.body.archive.donnees.statistiques.totalVentes).toBe(3);
    });

    it('devrait retourner 404 si inexistant', async () => {
      await request(app)
        .get('/api/archives/journees/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /api/archives/journees/:id/csv', () => {
    it('devrait retourner un CSV avec le bon Content-Type', async () => {
      await creerArchive(['Alice', 'Bob'], { Alice: 3, Bob: 1 });

      const listRes = await request(app)
        .get('/api/archives/journees')
        .set('Authorization', `Bearer ${adminToken}`);
      const archiveId = listRes.body.archives[0].id;

      const res = await request(app)
        .get(`/api/archives/journees/${archiveId}/csv`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      const lines = res.text.split('\n');
      expect(lines[0]).toBe('Vendeur;Ventes;Abandons');
      expect(lines.length).toBe(3); // header + 2 vendeurs
    });
  });

  describe('GET /api/archives/stats', () => {
    it('devrait retourner les stats agrégées', async () => {
      await creerArchive(['Alice', 'Bob'], { Alice: 3, Bob: 2 });

      const aujourdhui = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await request(app)
        .get('/api/archives/stats')
        .query({ du: aujourdhui, au: aujourdhui })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.nbJournees).toBe(1);
      expect(res.body.totalVentes).toBe(5);
      expect(res.body.classementVendeurs).toHaveLength(2);
    });

    it('devrait calculer le classement vendeurs cross-journées', async () => {
      // 1ère journée
      await creerArchive(['Alice', 'Bob'], { Alice: 3, Bob: 1 });

      // Insérer directement une 2e archive pour une autre date (on ne peut clôturer 2x le même jour)
      const exportData2 = {
        statistiques: { totalVendeurs: 2, totalVentes: 4, moyenneVentes: '2.00' },
        vendeurs: [
          { nom: 'Alice', ventes: 1, abandons: 0 },
          { nom: 'Bob', ventes: 3, abandons: 0 }
        ],
        historique: []
      };
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO journee_archives (date_journee, total_vendeurs, total_ventes, moyenne_ventes, donnees) VALUES (?, ?, ?, ?, ?)`,
          ['2026-03-01', 2, 4, 2.0, JSON.stringify(exportData2)],
          (err) => { if (err) reject(err); else resolve(); }
        );
      });

      const res = await request(app)
        .get('/api/archives/stats')
        .query({ du: '2026-03-01', au: '2026-12-31' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.nbJournees).toBe(2);
      expect(res.body.classementVendeurs).toHaveLength(2);

      // Alice: 3+1=4, Bob: 1+3=4 — les deux ont le même total
      const alice = res.body.classementVendeurs.find(v => v.nom === 'Alice');
      const bob = res.body.classementVendeurs.find(v => v.nom === 'Bob');
      expect(alice.totalVentes).toBe(4);
      expect(alice.nbJournees).toBe(2);
      expect(bob.totalVentes).toBe(4);
      expect(bob.nbJournees).toBe(2);
    });

    it('devrait exiger les paramètres du et au', async () => {
      await request(app)
        .get('/api/archives/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
