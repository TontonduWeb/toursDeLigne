const express = require('express');
const bcrypt = require('bcryptjs');
const { verifierToken, verifierAdmin } = require('../middleware/auth');

function creerRoutesUtilisateurs(db) {
  const router = express.Router();

  // Tous les endpoints utilisateurs requièrent admin
  router.use('/api/utilisateurs', verifierToken, verifierAdmin);

  // GET /api/utilisateurs — liste tous les utilisateurs
  router.get('/api/utilisateurs', (req, res) => {
    db.all(
      'SELECT id, nom, role, actif, cree_le FROM utilisateurs ORDER BY id',
      [],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ utilisateurs: rows });
      }
    );
  });

  // GET /api/utilisateurs/vendeurs-actifs — vendeurs actifs pour le planning
  router.get('/api/utilisateurs/vendeurs-actifs', (req, res) => {
    db.all(
      "SELECT id, nom FROM utilisateurs WHERE actif = 1 AND role = 'vendeur' ORDER BY nom",
      [],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ vendeurs: rows });
      }
    );
  });

  // POST /api/utilisateurs — créer un utilisateur
  router.post('/api/utilisateurs', async (req, res) => {
    const { nom, pin, role } = req.body;

    // Validation nom
    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return res.status(400).json({ error: 'Nom requis' });
    }
    if (nom.trim().length > 50) {
      return res.status(400).json({ error: 'Nom trop long (max 50 caractères)' });
    }

    // Validation PIN : exactement 4 chiffres
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN invalide (4 chiffres requis)' });
    }

    // Validation rôle
    const roleEffectif = role || 'vendeur';
    if (!['admin', 'vendeur'].includes(roleEffectif)) {
      return res.status(400).json({ error: 'Rôle invalide (admin ou vendeur)' });
    }

    try {
      const pinHash = await bcrypt.hash(pin, 10);
      db.run(
        'INSERT INTO utilisateurs (nom, pin_hash, role) VALUES (?, ?, ?)',
        [nom.trim(), pinHash, roleEffectif],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Ce nom existe déjà' });
            }
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json({
            success: true,
            utilisateur: { id: this.lastID, nom: nom.trim(), role: roleEffectif, actif: 1 }
          });
        }
      );
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/utilisateurs/:id — modifier un utilisateur
  router.put('/api/utilisateurs/:id', async (req, res) => {
    const { id } = req.params;
    const { nom, pin, actif } = req.body;

    // Vérifier que l'utilisateur existe
    db.get('SELECT * FROM utilisateurs WHERE id = ?', [id], async (err, utilisateur) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!utilisateur) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Interdire de désactiver le dernier admin
      if (actif === 0 && utilisateur.role === 'admin') {
        const countResult = await new Promise((resolve, reject) => {
          db.get(
            "SELECT COUNT(*) as count FROM utilisateurs WHERE role = 'admin' AND actif = 1",
            [],
            (err, row) => err ? reject(err) : resolve(row)
          );
        });
        if (countResult.count <= 1) {
          return res.status(400).json({ error: 'Impossible de désactiver le dernier administrateur' });
        }
      }

      // Construire la requête de mise à jour dynamiquement
      const updates = [];
      const params = [];

      if (nom !== undefined) {
        if (typeof nom !== 'string' || nom.trim().length === 0) {
          return res.status(400).json({ error: 'Nom requis' });
        }
        if (nom.trim().length > 50) {
          return res.status(400).json({ error: 'Nom trop long (max 50 caractères)' });
        }
        updates.push('nom = ?');
        params.push(nom.trim());
      }

      if (pin !== undefined) {
        if (!/^\d{4}$/.test(pin)) {
          return res.status(400).json({ error: 'PIN invalide (4 chiffres requis)' });
        }
        try {
          const pinHash = await bcrypt.hash(pin, 10);
          updates.push('pin_hash = ?');
          params.push(pinHash);
        } catch (err) {
          return res.status(500).json({ error: err.message });
        }
      }

      if (actif !== undefined) {
        updates.push('actif = ?');
        params.push(actif ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune modification fournie' });
      }

      params.push(id);
      db.run(
        `UPDATE utilisateurs SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Ce nom existe déjà' });
            }
            return res.status(500).json({ error: err.message });
          }
          res.json({ success: true, message: 'Utilisateur mis à jour' });
        }
      );
    });
  });

  // DELETE /api/utilisateurs/:id — supprimer un utilisateur
  router.delete('/api/utilisateurs/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM utilisateurs WHERE id = ?', [id], (err, utilisateur) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!utilisateur) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Interdire de se supprimer soi-même
      if (parseInt(id) === req.utilisateur.id) {
        return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
      }

      // Interdire de supprimer le dernier admin
      if (utilisateur.role === 'admin') {
        db.get(
          "SELECT COUNT(*) as count FROM utilisateurs WHERE role = 'admin'",
          [],
          (err, row) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            if (row.count <= 1) {
              return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur' });
            }

            db.run('DELETE FROM utilisateurs WHERE id = ?', [id], function (err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              res.json({ success: true, message: 'Utilisateur supprimé' });
            });
          }
        );
      } else {
        db.run('DELETE FROM utilisateurs WHERE id = ?', [id], function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ success: true, message: 'Utilisateur supprimé' });
        });
      }
    });
  });

  return router;
}

module.exports = creerRoutesUtilisateurs;
