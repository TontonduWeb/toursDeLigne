const express = require('express');
const { verifierToken, verifierAdmin } = require('../middleware/auth');

function creerRoutesArchives(db) {
  const router = express.Router();

  // Tous les endpoints archives requièrent admin
  router.use('/api/archives', verifierToken, verifierAdmin);

  // GET /api/archives/journees — lister les archives (sans blob donnees)
  router.get('/api/archives/journees', (req, res) => {
    const { du, au } = req.query;
    let sql = 'SELECT id, date_journee, total_vendeurs, total_ventes, moyenne_ventes, cree_le FROM journee_archives';
    const params = [];

    if (du && au) {
      sql += ' WHERE date_journee >= ? AND date_journee <= ?';
      params.push(du, au);
    } else if (du) {
      sql += ' WHERE date_journee >= ?';
      params.push(du);
    } else if (au) {
      sql += ' WHERE date_journee <= ?';
      params.push(au);
    }

    sql += ' ORDER BY date_journee DESC';

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ archives: rows || [] });
    });
  });

  // GET /api/archives/journees/:id — détail complet avec donnees parsé
  router.get('/api/archives/journees/:id', (req, res) => {
    db.get(
      'SELECT * FROM journee_archives WHERE id = ?',
      [req.params.id],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Archive non trouvée' });

        try {
          row.donnees = JSON.parse(row.donnees);
        } catch {
          // Garder la chaîne brute si le parse échoue
        }

        res.json({ archive: row });
      }
    );
  });

  // GET /api/archives/journees/:id/csv — export CSV
  router.get('/api/archives/journees/:id/csv', (req, res) => {
    db.get(
      'SELECT * FROM journee_archives WHERE id = ?',
      [req.params.id],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Archive non trouvée' });

        let donnees;
        try {
          donnees = JSON.parse(row.donnees);
        } catch {
          return res.status(500).json({ error: 'Données corrompues' });
        }

        const lignes = ['Vendeur;Ventes;Abandons'];
        if (donnees.vendeurs) {
          donnees.vendeurs.forEach(v => {
            lignes.push(`${v.nom};${v.ventes};${v.abandons || 0}`);
          });
        }

        const csv = lignes.join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="journee-${row.date_journee}.csv"`);
        res.send(csv);
      }
    );
  });

  // GET /api/archives/stats — stats agrégées sur période
  router.get('/api/archives/stats', (req, res) => {
    const { du, au } = req.query;

    if (!du || !au) {
      return res.status(400).json({ error: 'Paramètres du et au requis' });
    }

    // Stats globales
    db.get(
      `SELECT COUNT(*) as nbJournees, COALESCE(SUM(total_ventes), 0) as totalVentes, COALESCE(AVG(moyenne_ventes), 0) as moyenneParJour
       FROM journee_archives WHERE date_journee >= ? AND date_journee <= ?`,
      [du, au],
      (err, stats) => {
        if (err) return res.status(500).json({ error: err.message });

        // Charger les blobs pour le classement vendeurs
        db.all(
          'SELECT donnees FROM journee_archives WHERE date_journee >= ? AND date_journee <= ?',
          [du, au],
          (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            const vendeursMap = {};
            (rows || []).forEach(row => {
              try {
                const donnees = JSON.parse(row.donnees);
                if (donnees.vendeurs) {
                  donnees.vendeurs.forEach(v => {
                    if (!vendeursMap[v.nom]) {
                      vendeursMap[v.nom] = { nom: v.nom, totalVentes: 0, nbJournees: 0 };
                    }
                    vendeursMap[v.nom].totalVentes += v.ventes || 0;
                    vendeursMap[v.nom].nbJournees += 1;
                  });
                }
              } catch {
                // Ignorer les données corrompues
              }
            });

            const classementVendeurs = Object.values(vendeursMap)
              .sort((a, b) => b.totalVentes - a.totalVentes);

            res.json({
              nbJournees: stats.nbJournees,
              totalVentes: stats.totalVentes,
              moyenneParJour: Math.round(stats.moyenneParJour * 100) / 100,
              classementVendeurs
            });
          }
        );
      }
    );
  });

  return router;
}

module.exports = creerRoutesArchives;
