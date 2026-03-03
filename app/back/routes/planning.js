const express = require('express');
const { verifierToken, verifierAdmin } = require('../middleware/auth');

function creerRoutesPlanning(db) {
  const router = express.Router();

  // Tous les endpoints planning requièrent admin
  router.use('/api/planning', verifierToken, verifierAdmin);

  // Helper : charger les vendeurs d'un template
  function chargerVendeursTemplate(templateId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT ptv.utilisateur_id, ptv.ordre, u.nom
         FROM planning_template_vendeurs ptv
         JOIN utilisateurs u ON u.id = ptv.utilisateur_id
         WHERE ptv.template_id = ?
         ORDER BY ptv.ordre`,
        [templateId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // GET /api/planning/templates — lister tous les templates avec vendeurs
  router.get('/api/planning/templates', async (req, res) => {
    try {
      const templates = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM planning_templates ORDER BY nom',
          [],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      // Charger les vendeurs pour chaque template
      const result = [];
      for (const t of templates) {
        const vendeurs = await chargerVendeursTemplate(t.id);
        result.push({ ...t, vendeurs });
      }

      res.json({ templates: result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/planning/templates/:id — détail d'un template
  router.get('/api/planning/templates/:id', async (req, res) => {
    try {
      const template = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM planning_templates WHERE id = ?',
          [req.params.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!template) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }

      const vendeurs = await chargerVendeursTemplate(template.id);
      res.json({ template: { ...template, vendeurs } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/planning/templates — créer un template
  router.post('/api/planning/templates', async (req, res) => {
    const { nom, vendeurs } = req.body;

    // Validation nom
    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return res.status(400).json({ error: 'Nom requis' });
    }

    // Validation vendeurs
    if (!Array.isArray(vendeurs) || vendeurs.length === 0) {
      return res.status(400).json({ error: 'Au moins un vendeur requis' });
    }
    if (vendeurs.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 vendeurs autorisés' });
    }

    try {
      // Vérifier que chaque utilisateur_id existe et est actif
      for (const v of vendeurs) {
        const utilisateur = await new Promise((resolve, reject) => {
          db.get(
            'SELECT id, actif FROM utilisateurs WHERE id = ?',
            [v.utilisateur_id],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (!utilisateur) {
          return res.status(400).json({ error: `Utilisateur ${v.utilisateur_id} non trouvé` });
        }
        if (!utilisateur.actif) {
          return res.status(400).json({ error: `Utilisateur ${v.utilisateur_id} inactif` });
        }
      }

      // INSERT template
      const templateId = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO planning_templates (nom) VALUES (?)',
          [nom.trim()],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // INSERT vendeurs
      for (const v of vendeurs) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO planning_template_vendeurs (template_id, utilisateur_id, ordre) VALUES (?, ?, ?)',
            [templateId, v.utilisateur_id, v.ordre],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      // Retourner le template créé
      const vendeursResult = await chargerVendeursTemplate(templateId);
      res.status(201).json({
        success: true,
        template: {
          id: templateId,
          nom: nom.trim(),
          vendeurs: vendeursResult
        }
      });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed: planning_templates.nom')) {
        return res.status(409).json({ error: 'Ce nom de template existe déjà' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/planning/templates/:id — modifier un template
  router.put('/api/planning/templates/:id', async (req, res) => {
    const { nom, vendeurs } = req.body;

    try {
      // Vérifier que le template existe
      const template = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM planning_templates WHERE id = ?',
          [req.params.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!template) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }

      // Mettre à jour le nom si fourni
      if (nom !== undefined) {
        if (typeof nom !== 'string' || nom.trim().length === 0) {
          return res.status(400).json({ error: 'Nom requis' });
        }
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE planning_templates SET nom = ? WHERE id = ?',
            [nom.trim(), req.params.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      // Mettre à jour les vendeurs si fournis
      if (vendeurs !== undefined) {
        if (!Array.isArray(vendeurs) || vendeurs.length === 0) {
          return res.status(400).json({ error: 'Au moins un vendeur requis' });
        }
        if (vendeurs.length > 20) {
          return res.status(400).json({ error: 'Maximum 20 vendeurs autorisés' });
        }

        // Vérifier que chaque utilisateur_id existe et est actif
        for (const v of vendeurs) {
          const utilisateur = await new Promise((resolve, reject) => {
            db.get(
              'SELECT id, actif FROM utilisateurs WHERE id = ?',
              [v.utilisateur_id],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          });

          if (!utilisateur) {
            return res.status(400).json({ error: `Utilisateur ${v.utilisateur_id} non trouvé` });
          }
          if (!utilisateur.actif) {
            return res.status(400).json({ error: `Utilisateur ${v.utilisateur_id} inactif` });
          }
        }

        // Supprimer les anciens vendeurs
        await new Promise((resolve, reject) => {
          db.run(
            'DELETE FROM planning_template_vendeurs WHERE template_id = ?',
            [req.params.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Insérer les nouveaux
        for (const v of vendeurs) {
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO planning_template_vendeurs (template_id, utilisateur_id, ordre) VALUES (?, ?, ?)',
              [req.params.id, v.utilisateur_id, v.ordre],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }

      // Retourner le template mis à jour
      const updatedTemplate = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM planning_templates WHERE id = ?',
          [req.params.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      const vendeursResult = await chargerVendeursTemplate(req.params.id);

      res.json({
        success: true,
        template: { ...updatedTemplate, vendeurs: vendeursResult }
      });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed: planning_templates.nom')) {
        return res.status(409).json({ error: 'Ce nom de template existe déjà' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/planning/templates/:id — supprimer un template
  router.delete('/api/planning/templates/:id', async (req, res) => {
    try {
      const template = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM planning_templates WHERE id = ?',
          [req.params.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!template) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }

      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM planning_templates WHERE id = ?',
          [req.params.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      res.json({ success: true, message: 'Template supprimé' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = creerRoutesPlanning;
