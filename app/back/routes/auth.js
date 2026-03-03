const express = require('express');
const bcrypt = require('bcryptjs');
const { genererToken } = require('../middleware/auth');

function creerRoutesAuth(db) {
  const router = express.Router();

  // GET /api/connexion/vendeurs — public — liste des noms pour la page de login
  router.get('/api/connexion/vendeurs', (req, res) => {
    db.all(
      'SELECT nom FROM utilisateurs WHERE actif = 1 ORDER BY nom',
      [],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ vendeurs: rows.map(r => r.nom) });
      }
    );
  });

  // POST /api/connexion — public — login { nom, pin }
  router.post('/api/connexion', (req, res) => {
    const { nom, pin } = req.body;

    if (!nom || !pin) {
      return res.status(400).json({ error: 'Nom et PIN requis' });
    }

    db.get(
      'SELECT * FROM utilisateurs WHERE nom = ? AND actif = 1',
      [nom],
      async (err, utilisateur) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!utilisateur) {
          return res.status(401).json({ error: 'Nom ou code PIN incorrect' });
        }

        try {
          const pinValide = await bcrypt.compare(pin, utilisateur.pin_hash);
          if (!pinValide) {
            return res.status(401).json({ error: 'Nom ou code PIN incorrect' });
          }

          const token = genererToken(utilisateur);
          res.json({
            success: true,
            token,
            utilisateur: {
              id: utilisateur.id,
              nom: utilisateur.nom,
              role: utilisateur.role
            }
          });
        } catch (err) {
          return res.status(500).json({ error: err.message });
        }
      }
    );
  });

  return router;
}

module.exports = creerRoutesAuth;
