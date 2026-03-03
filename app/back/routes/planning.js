const express = require('express');
const { verifierToken, verifierAdmin } = require('../middleware/auth');

function creerRoutesPlanning(db) {
  const router = express.Router();

  // Tous les endpoints planning requièrent admin
  router.use('/api/planning', verifierToken, verifierAdmin);

  // Helper : validation commune des vendeurs
  async function validerVendeurs(vendeurs) {
    if (!Array.isArray(vendeurs) || vendeurs.length === 0) {
      return 'Au moins un vendeur requis';
    }
    if (vendeurs.length > 20) {
      return 'Maximum 20 vendeurs autorisés';
    }
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
        return `Utilisateur ${v.utilisateur_id} non trouvé`;
      }
      if (!utilisateur.actif) {
        return `Utilisateur ${v.utilisateur_id} inactif`;
      }
    }
    return null; // pas d'erreur
  }

  // Helper : valider le format date YYYY-MM-DD
  function isDateValide(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const d = new Date(dateStr + 'T00:00:00');
    return !isNaN(d.getTime());
  }

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

  // Helper : charger les vendeurs d'une journée
  function chargerVendeursJournee(journeeId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT pjv.utilisateur_id, pjv.ordre, pjv.present, u.nom
         FROM planning_journee_vendeurs pjv
         JOIN utilisateurs u ON u.id = pjv.utilisateur_id
         WHERE pjv.journee_id = ?
         ORDER BY pjv.ordre`,
        [journeeId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Helper : charger une journée par ID
  function chargerJournee(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM planning_journees WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
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

  // ==================== JOURNÉES ====================

  // POST /api/planning/journees — créer une journée planifiée
  router.post('/api/planning/journees', async (req, res) => {
    const { date_journee, template_id, vendeurs } = req.body;

    // Validation date
    if (!date_journee || !isDateValide(date_journee)) {
      return res.status(400).json({ error: 'Date invalide (format attendu: YYYY-MM-DD)' });
    }

    try {
      let vendeursToInsert = [];

      if (template_id) {
        // Création depuis un template
        const template = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM planning_templates WHERE id = ?', [template_id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        if (!template) {
          return res.status(404).json({ error: 'Template non trouvé' });
        }
        const templateVendeurs = await chargerVendeursTemplate(template_id);
        vendeursToInsert = templateVendeurs.map(v => ({
          utilisateur_id: v.utilisateur_id,
          ordre: v.ordre
        }));
      } else if (vendeurs) {
        vendeursToInsert = vendeurs;
      }

      // Validation vendeurs
      const erreurVendeurs = await validerVendeurs(vendeursToInsert);
      if (erreurVendeurs) {
        return res.status(400).json({ error: erreurVendeurs });
      }

      // INSERT journée
      const journeeId = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO planning_journees (date_journee, template_id) VALUES (?, ?)',
          [date_journee, template_id || null],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // INSERT vendeurs
      for (const v of vendeursToInsert) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO planning_journee_vendeurs (journee_id, utilisateur_id, ordre) VALUES (?, ?, ?)',
            [journeeId, v.utilisateur_id, v.ordre],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      const vendeursResult = await chargerVendeursJournee(journeeId);
      const journee = await chargerJournee(journeeId);

      res.status(201).json({
        success: true,
        journee: { ...journee, vendeurs: vendeursResult }
      });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed: planning_journees.date_journee')) {
        return res.status(409).json({ error: 'Une journée existe déjà pour cette date' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/planning/journees — lister les journées avec vendeurs
  router.get('/api/planning/journees', async (req, res) => {
    try {
      const { du, au } = req.query;
      let sql = 'SELECT * FROM planning_journees';
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

      sql += ' ORDER BY date_journee ASC';

      const journees = await new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      const result = [];
      for (const j of journees) {
        const vendeurs = await chargerVendeursJournee(j.id);
        result.push({ ...j, vendeurs });
      }

      res.json({ journees: result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/planning/journees/:id — détail d'une journée
  router.get('/api/planning/journees/:id', async (req, res) => {
    try {
      const journee = await chargerJournee(req.params.id);
      if (!journee) {
        return res.status(404).json({ error: 'Journée non trouvée' });
      }
      const vendeurs = await chargerVendeursJournee(journee.id);
      res.json({ journee: { ...journee, vendeurs } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/planning/journees/:id — modifier les vendeurs d'une journée
  router.put('/api/planning/journees/:id', async (req, res) => {
    const { vendeurs } = req.body;

    try {
      const journee = await chargerJournee(req.params.id);
      if (!journee) {
        return res.status(404).json({ error: 'Journée non trouvée' });
      }
      if (journee.statut !== 'planifie') {
        return res.status(400).json({ error: 'Seules les journées planifiées peuvent être modifiées' });
      }

      // Validation vendeurs
      const erreurVendeurs = await validerVendeurs(vendeurs);
      if (erreurVendeurs) {
        return res.status(400).json({ error: erreurVendeurs });
      }

      // Supprimer les anciens vendeurs
      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM planning_journee_vendeurs WHERE journee_id = ?',
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
            'INSERT INTO planning_journee_vendeurs (journee_id, utilisateur_id, ordre) VALUES (?, ?, ?)',
            [req.params.id, v.utilisateur_id, v.ordre],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      const vendeursResult = await chargerVendeursJournee(req.params.id);
      res.json({
        success: true,
        journee: { ...journee, vendeurs: vendeursResult }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/planning/journees/:id — supprimer une journée
  router.delete('/api/planning/journees/:id', async (req, res) => {
    try {
      const journee = await chargerJournee(req.params.id);
      if (!journee) {
        return res.status(404).json({ error: 'Journée non trouvée' });
      }
      if (journee.statut !== 'planifie') {
        return res.status(400).json({ error: 'Seules les journées planifiées peuvent être supprimées' });
      }

      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM planning_journees WHERE id = ?',
          [req.params.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      res.json({ success: true, message: 'Journée supprimée' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/planning/journees/:id/presence — basculer la présence d'un vendeur
  router.put('/api/planning/journees/:id/presence', async (req, res) => {
    const { utilisateur_id, present } = req.body;

    try {
      const journee = await chargerJournee(req.params.id);
      if (!journee) {
        return res.status(404).json({ error: 'Journée non trouvée' });
      }
      if (journee.statut !== 'planifie') {
        return res.status(400).json({ error: 'Seules les journées planifiées peuvent être modifiées' });
      }

      // Vérifier que le vendeur est dans cette journée
      const vendeurJournee = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM planning_journee_vendeurs WHERE journee_id = ? AND utilisateur_id = ?',
          [req.params.id, utilisateur_id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!vendeurJournee) {
        return res.status(404).json({ error: 'Vendeur non trouvé dans cette journée' });
      }

      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE planning_journee_vendeurs SET present = ? WHERE journee_id = ? AND utilisateur_id = ?',
          [present ? 1 : 0, req.params.id, utilisateur_id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      const vendeursResult = await chargerVendeursJournee(req.params.id);
      res.json({
        success: true,
        journee: { ...journee, vendeurs: vendeursResult }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = creerRoutesPlanning;
