const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { getAdjustedDate } = require('./utils/dateUtils');
const { verifierToken } = require('./middleware/auth');
const creerRoutesAuth = require('./routes/auth');
const creerRoutesUtilisateurs = require('./routes/utilisateurs');
const creerRoutesPlanning = require('./routes/planning');

const app = express();
app.use(cors());
app.use(express.json());

// Initialiser la base de données SQLite
const dbPath = path.join(__dirname,'data', 'tour-de-ligne.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur ouverture DB:', err);
  } else {
    db.run('PRAGMA journal_mode=WAL');
    db.run('PRAGMA foreign_keys = ON');
    initDatabase();
    seedAdmin();
  }
});

// Créer les tables si elles n'existent pas
function initDatabase() {
  db.serialize(() => {
    // Table des vendeurs
    db.run(`
      CREATE TABLE IF NOT EXISTS vendeurs (
        nom TEXT PRIMARY KEY,
        ventes INTEGER DEFAULT 0,
        abandons INTEGER DEFAULT 0,
        client_id TEXT,
        client_heure_debut TEXT,
        client_date_debut TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Table de l'historique
    db.run(`
      CREATE TABLE IF NOT EXISTS historique (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        heure TEXT NOT NULL,
        action TEXT NOT NULL,
        vendeur TEXT,
        client_id TEXT,
        timestamp INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Table de configuration
    db.run(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Table des utilisateurs (vendeurs + admin)
    db.run(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL UNIQUE,
        pin_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'vendeur' CHECK(role IN ('admin', 'vendeur')),
        actif INTEGER NOT NULL DEFAULT 1,
        cree_le TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Templates réutilisables (Phase 2)
    db.run(`
      CREATE TABLE IF NOT EXISTS planning_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL UNIQUE,
        cree_le TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS planning_template_vendeurs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        utilisateur_id INTEGER NOT NULL,
        ordre INTEGER NOT NULL,
        FOREIGN KEY (template_id) REFERENCES planning_templates(id) ON DELETE CASCADE,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
        UNIQUE(template_id, utilisateur_id)
      )
    `);

    // Planning effectif par journée (Phase 2)
    db.run(`
      CREATE TABLE IF NOT EXISTS planning_journees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date_journee TEXT NOT NULL UNIQUE,
        template_id INTEGER,
        statut TEXT NOT NULL DEFAULT 'planifie' CHECK(statut IN ('planifie', 'en_cours', 'termine')),
        cree_le TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (template_id) REFERENCES planning_templates(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS planning_journee_vendeurs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        journee_id INTEGER NOT NULL,
        utilisateur_id INTEGER NOT NULL,
        ordre INTEGER NOT NULL,
        present INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (journee_id) REFERENCES planning_journees(id) ON DELETE CASCADE,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
        UNIQUE(journee_id, utilisateur_id)
      )
    `);
  });
}

// Seed admin au démarrage si la table utilisateurs est vide
function seedAdmin() {
  seedAdminAsync().catch(err => console.error('Erreur seed admin:', err));
}

function seedAdminAsync() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM utilisateurs', [], async (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      if (row.count === 0) {
        try {
          const pinHash = await bcrypt.hash('0000', 10);
          db.run(
            "INSERT INTO utilisateurs (nom, pin_hash, role) VALUES (?, ?, 'admin')",
            ['Matthieu', pinHash],
            (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('Admin "Matthieu" créé avec PIN par défaut: 0000');
                resolve();
              }
            }
          );
        } catch (err) {
          reject(err);
        }
      } else {
        resolve();
      }
    });
  });
}

// Fonction pour générer un ID client
function genererIdClient() {
  return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Fonction pour calculer le prochain vendeur disponible
function calculerProchainVendeur(vendeurs) {
  const disponibles = vendeurs.filter(v => !v.clientEnCours);
  if (disponibles.length === 0) return null;
  
  // Tri par : 1) ventes croissantes, 2) abandons croissants, 3) ordre initial (index)
  disponibles.sort((a, b) => {
    // 1. Priorité aux moins de ventes
    if (a.ventes !== b.ventes) {
      return a.ventes - b.ventes;
    }
    // 2. À égalité de ventes, priorité aux moins d'abandons
    if (a.abandons !== b.abandons) {
      return a.abandons - b.abandons;
    }
    // 3. À égalité totale, on garde l'ordre initial (déjà respecté par le tableau)
    return 0;
  });
  
  return disponibles[0]?.nom || null;
}

// ==================== AUTH & ROUTES ====================

// Routes publiques (auth)
app.use(creerRoutesAuth(db));

// Routes admin (utilisateurs)
app.use(creerRoutesUtilisateurs(db));

// Routes admin (planning)
app.use(creerRoutesPlanning(db));

// Middleware auth conditionnel sur les routes métier existantes
const authActif = process.env.AUTH_ACTIF !== 'false';
if (authActif) {
  app.use('/api/state', verifierToken);
  app.use('/api/stats', verifierToken);
  app.use('/api/demarrer-journee', verifierToken);
  app.use('/api/prendre-client', verifierToken);
  app.use('/api/abandonner-client', verifierToken);
  app.use('/api/enregistrer-vente', verifierToken);
  app.use('/api/enregistrer-vente-directe', verifierToken);
  app.use('/api/terminer-journee', verifierToken);
  app.use('/api/ajouter-vendeur', verifierToken);
  app.use('/api/planning-du-jour', verifierToken);
}

// ==================== ENDPOINTS API ====================

// GET /api/state - Obtenir l'état complet
app.get('/api/state', (req, res) => {
  db.all('SELECT * FROM vendeurs ORDER BY rowid', [], (err, vendeurs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.all(
      'SELECT * FROM historique ORDER BY timestamp DESC LIMIT 50',
      [],
      (err, historique) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const vendeursData = vendeurs.map(v => ({
          nom: v.nom,
          ventes: v.ventes,
          abandons: v.abandons || 0,
          clientEnCours: v.client_id ? {
            id: v.client_id,
            heureDebut: v.client_heure_debut,
            dateDebut: v.client_date_debut
          } : null
        }));

        const prochainVendeur = calculerProchainVendeur(vendeursData);

        res.json({
          ordreActuel: {
            prochainVendeur
          },
          vendeurs: vendeursData,
          historique: historique.map(h => ({
            date: h.date,
            heure: h.heure,
            action: h.action,
            vendeur: h.vendeur,
            clientId: h.client_id
          }))
        });
      }
    );
  });
});

// POST /api/demarrer-journee - Démarrer une nouvelle journée
app.post('/api/demarrer-journee', (req, res) => {
  const { vendeurs } = req.body; // ✅ Déclarer AVANT d'utiliser

  if (!Array.isArray(vendeurs) || vendeurs.length === 0) {
    return res.status(400).json({ error: 'Liste de vendeurs invalide' });
  }

  if (vendeurs.length > 20) {
    return res.status(400).json({ error: 'Maximum 20 vendeurs autorisés' });
  }

  db.serialize(() => {
    // 1. Supprimer tous les vendeurs existants
    db.run('DELETE FROM vendeurs', (err) => {
      if (err) {
        console.error('Erreur suppression vendeurs:', err);
        return res.status(500).json({ error: err.message });
      }

      // 2. Insérer les nouveaux vendeurs UN PAR UN
      let inserted = 0;
      const errors = [];

      vendeurs.forEach((nom, index) => {
        db.run('INSERT INTO vendeurs (nom, ventes) VALUES (?, 0)', [nom], (err) => {
          if (err) {
            errors.push(err.message);
          }

          inserted++;
          console.log(`✅ Vendeur ${nom} inséré (${inserted}/${vendeurs.length})`);

          // 3. Une fois tous insérés, ajouter à l'historique et répondre
          if (inserted === vendeurs.length) {
            if (errors.length > 0) {
              return res.status(500).json({ error: errors.join(', ') });
            }

            const maintenant = getAdjustedDate();
            db.run(
              'INSERT INTO historique (date, heure, action, vendeur) VALUES (?, ?, ?, ?)',
              [
                maintenant.toLocaleDateString('fr-FR'),
                maintenant.toLocaleTimeString('fr-FR'),
                `Démarrage de la journée avec: ${vendeurs.join(', ')}`,
                'Système'
              ],
              (err) => {
                if (err) {
                  console.error('Erreur historique:', err);
                  // Pas critique, on répond quand même
                }
                
                console.log(`✅ Journée démarrée avec ${vendeurs.length} vendeurs`);
                res.json({ success: true, message: 'Journée démarrée' });
              }
            );
          }
        });
      });
    });
  });
});

// POST /api/prendre-client - Un vendeur prend un client
app.post('/api/prendre-client', (req, res) => {
  const { vendeur } = req.body;

  if (!vendeur) {
    return res.status(400).json({ error: 'Vendeur non spécifié' });
  }

  // Vérifier que le vendeur existe et n'a pas de client
  db.get(
    'SELECT * FROM vendeurs WHERE nom = ?',
    [vendeur],
    (err, vendeurData) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!vendeurData) {
        return res.status(404).json({ error: 'Vendeur non trouvé' });
      }

      if (vendeurData.client_id) {
        return res.status(400).json({ error: 'Le vendeur a déjà un client' });
      }

      const clientId = genererIdClient();
      const maintenant = getAdjustedDate();

      db.serialize(() => {
        // Assigner le client au vendeur
        db.run(
          `UPDATE vendeurs 
           SET client_id = ?, client_heure_debut = ?, client_date_debut = ?
           WHERE nom = ?`,
          [
            clientId,
            maintenant.toLocaleTimeString('fr-FR'),
            maintenant.toLocaleDateString('fr-FR'),
            vendeur
          ]
        );

        // Ajouter à l'historique
        db.run(
          'INSERT INTO historique (date, heure, action, vendeur, client_id) VALUES (?, ?, ?, ?, ?)',
          [
            maintenant.toLocaleDateString('fr-FR'),
            maintenant.toLocaleTimeString('fr-FR'),
            `Client pris en charge par ${vendeur}`,
            vendeur,
            clientId
          ]
        );

        res.json({ success: true, clientId });
      });
    }
  );
});

// POST /api/abandonner-client - Un vendeur abandonne son client
app.post('/api/abandonner-client', (req, res) => {
  const { vendeur } = req.body;

  if (!vendeur) {
    return res.status(400).json({ error: 'Vendeur non spécifié' });
  }

  db.get(
    'SELECT * FROM vendeurs WHERE nom = ?',
    [vendeur],
    (err, vendeurData) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!vendeurData || !vendeurData.client_id) {
        return res.status(400).json({ error: 'Le vendeur n\'a pas de client' });
      }

      const clientId = vendeurData.client_id;
      const maintenant = getAdjustedDate();

      db.serialize(() => {
        // Libérer le vendeur ET incrémenter les abandons
        db.run(
          `UPDATE vendeurs 
            SET client_id = NULL, client_heure_debut = NULL, client_date_debut = NULL, abandons = abandons + 1
            WHERE nom = ?`,
          [vendeur]
        );

        // Ajouter à l'historique
        db.run(
          'INSERT INTO historique (date, heure, action, vendeur, client_id) VALUES (?, ?, ?, ?, ?)',
          [
            maintenant.toLocaleDateString('fr-FR'),
            maintenant.toLocaleTimeString('fr-FR'),
            `Client abandonné par ${vendeur}`,
            vendeur,
            clientId
          ]
        );

        res.json({ success: true });
      });
    }
  );
});

// POST /api/enregistrer-vente - Enregistrer une vente
app.post('/api/enregistrer-vente', (req, res) => {
  const { vendeur } = req.body;

  if (!vendeur) {
    return res.status(400).json({ error: 'Vendeur non spécifié' });
  }

  db.get(
    'SELECT * FROM vendeurs WHERE nom = ?',
    [vendeur],
    (err, vendeurData) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!vendeurData || !vendeurData.client_id) {
        return res.status(400).json({ error: 'Le vendeur n\'a pas de client' });
      }

      const clientId = vendeurData.client_id;
      const maintenant = getAdjustedDate();

      db.serialize(() => {
        // Incrémenter les ventes et libérer le vendeur
        db.run(
          `UPDATE vendeurs 
           SET ventes = ventes + 1, 
               client_id = NULL, 
               client_heure_debut = NULL, 
               client_date_debut = NULL
           WHERE nom = ?`,
          [vendeur]
        );

        // Ajouter à l'historique
        db.run(
          'INSERT INTO historique (date, heure, action, vendeur, client_id) VALUES (?, ?, ?, ?, ?)',
          [
            maintenant.toLocaleDateString('fr-FR'),
            maintenant.toLocaleTimeString('fr-FR'),
            `Vente finalisée par ${vendeur}`,
            vendeur,
            clientId
          ]
        );

        res.json({ success: true });
      });
    }
  );
});

// POST /api/enregistrer-vente-directe - Enregistrer une vente sans client
app.post('/api/enregistrer-vente-directe', (req, res) => {
  const { vendeur } = req.body;

  if (!vendeur) {
    return res.status(400).json({ error: 'Vendeur non spécifié' });
  }

  db.get(
    'SELECT * FROM vendeurs WHERE nom = ?',
    [vendeur],
    (err, vendeurData) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!vendeurData) {
        return res.status(404).json({ error: 'Vendeur non trouvé' });
      }

      const maintenant = getAdjustedDate();

      db.serialize(() => {
        // Incrémenter les ventes
        db.run(
          'UPDATE vendeurs SET ventes = ventes + 1 WHERE nom = ?',
          [vendeur],
          (err) => {
            if (err) {
              console.error('Erreur update ventes:', err);
              return res.status(500).json({ error: err.message });
            }

            // Ajouter à l'historique
            db.run(
              'INSERT INTO historique (date, heure, action, vendeur) VALUES (?, ?, ?, ?)',
              [
                maintenant.toLocaleDateString('fr-FR'),
                maintenant.toLocaleTimeString('fr-FR'),
                `Vente directe enregistrée par ${vendeur}`,
                vendeur
              ],
              (err) => {
                if (err) {
                  console.error('Erreur historique:', err);
                  // Pas critique
                }
                
                res.json({ success: true, message: 'Vente directe enregistrée' });
              }
            );
          }
        );
      });
    }
  );
});

// POST /api/terminer-journee - Terminer la journée
// POST /api/terminer-journee - Terminer et clôturer la journée
app.post('/api/terminer-journee', (req, res) => {
  const maintenant = getAdjustedDate();

  db.serialize(() => {
    // Récupérer toutes les données avant la clôture
    db.all('SELECT * FROM vendeurs', [], (err, vendeurs) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.all('SELECT * FROM historique ORDER BY timestamp DESC', [], (err, historique) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Calculer les statistiques finales
        const totalVentes = vendeurs.reduce((sum, v) => sum + v.ventes, 0);
        const vendeursData = vendeurs.map(v => ({
          nom: v.nom,
          ventes: v.ventes,
          clientEnCours: v.client_id ? {
            id: v.client_id,
            heureDebut: v.client_heure_debut,
            dateDebut: v.client_date_debut
          } : null
        }));

        // Créer l'export de données
        const exportData = {
          dateClôture: maintenant.toLocaleDateString('fr-FR'),
          heureClôture: maintenant.toLocaleTimeString('fr-FR'),
          timestamp: maintenant.toISOString(),
          statistiques: {
            totalVendeurs: vendeurs.length,
            totalVentes: totalVentes,
            moyenneVentes: vendeurs.length > 0 ? (totalVentes / vendeurs.length).toFixed(2) : 0
          },
          vendeurs: vendeursData,
          historique: historique.map(h => ({
            date: h.date,
            heure: h.heure,
            action: h.action,
            vendeur: h.vendeur,
            clientId: h.client_id
          }))
        };

        // ✅ SUPPRIMER les vendeurs
        db.run(`DELETE FROM vendeurs`, (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // ✅ SUPPRIMER l'historique
          db.run(`DELETE FROM historique`, (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            res.json({ 
              success: true, 
              message: 'Journée clôturée avec succès',
              exportData: exportData
            });
          });
        });
      });
    });
  });
});

// POST /api/reinitialiser - Réinitialiser tout
app.post('/api/reinitialiser', async (req, res) => {
  const runDelete = (sql) => new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  try {
    // Supprimer d'abord les tables enfants (FK), puis les parents
    await runDelete('DELETE FROM planning_journee_vendeurs');
    await runDelete('DELETE FROM planning_template_vendeurs');
    await runDelete('DELETE FROM planning_journees');
    await runDelete('DELETE FROM planning_templates');
    if (process.env.NODE_ENV === 'test') {
      await runDelete('DELETE FROM utilisateurs');
    }
    await runDelete('DELETE FROM vendeurs');
    await runDelete('DELETE FROM historique');
    await runDelete('DELETE FROM config');

    if (process.env.NODE_ENV === 'test') {
      await seedAdminAsync();
    }
    res.json({ success: true, message: 'Réinitialisation complète' });
  } catch (err) {
    console.error('❌ Erreur réinitialisation:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ajouter-vendeur - Ajouter un vendeur en cours de journée
app.post('/api/ajouter-vendeur', (req, res) => {
  const { vendeur } = req.body;

  if (!vendeur || !vendeur.trim()) {
    return res.status(400).json({ error: 'Nom de vendeur invalide' });
  }

  const vendeurTrim = vendeur.trim();

  // Vérifier si le vendeur existe déjà
  db.get(
    'SELECT * FROM vendeurs WHERE nom = ?',
    [vendeurTrim],
    (err, existant) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existant) {
        return res.status(400).json({ error: 'Ce vendeur existe déjà' });
      }

      const maintenant = getAdjustedDate();

      db.serialize(() => {
        // Insérer le nouveau vendeur avec 0 ventes
        db.run(
          'INSERT INTO vendeurs (nom, ventes) VALUES (?, 0)',
          [vendeurTrim],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Ajouter à l'historique
            db.run(
              'INSERT INTO historique (date, heure, action, vendeur) VALUES (?, ?, ?, ?)',
              [
                maintenant.toLocaleDateString('fr-FR'),
                maintenant.toLocaleTimeString('fr-FR'),
                `Vendeur ${vendeurTrim} ajouté en cours de journée`,
                'Système'
              ]
            );

            res.json({ 
              success: true, 
              message: `Vendeur ${vendeurTrim} ajouté avec succès`,
              vendeur: vendeurTrim
            });
          }
        );
      });
    }
  );
});

// GET /api/planning-du-jour - Planning du jour (accessible par tous les utilisateurs authentifiés)
app.get('/api/planning-du-jour', (req, res) => {
  const aujourdhui = getAdjustedDate().toISOString().split('T')[0];

  db.get(
    'SELECT * FROM planning_journees WHERE date_journee = ?',
    [aujourdhui],
    (err, journee) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!journee) {
        return res.json({ journee: null });
      }

      db.all(
        `SELECT pjv.utilisateur_id, pjv.ordre, pjv.present, u.nom
         FROM planning_journee_vendeurs pjv
         JOIN utilisateurs u ON u.id = pjv.utilisateur_id
         WHERE pjv.journee_id = ?
         ORDER BY pjv.ordre`,
        [journee.id],
        (err, vendeurs) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ journee: { ...journee, vendeurs: vendeurs || [] } });
        }
      );
    }
  );
});

// GET /api/stats - Statistiques
app.get('/api/stats', (req, res) => {
  db.all('SELECT * FROM vendeurs', [], (err, vendeurs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const totalVendeurs = vendeurs.length;
    const vendeursOccupes = vendeurs.filter(v => v.client_id).length;
    const vendeursDisponibles = totalVendeurs - vendeursOccupes;
    const totalVentes = vendeurs.reduce((sum, v) => sum + v.ventes, 0);

    const vendeursData = vendeurs.map(v => ({
      nom: v.nom,
      ventes: v.ventes,
      abandons: v.abandons || 0,
      clientEnCours: v.client_id ? {
        id: v.client_id,
        heureDebut: v.client_heure_debut,
        dateDebut: v.client_date_debut
      } : null
    }));

    const prochainVendeur = calculerProchainVendeur(vendeursData);

    res.json({
      totalVendeurs,
      vendeursOccupes,
      vendeursDisponibles,
      totalVentes,
      prochainVendeur,
      vendeurs: vendeursData
    });
  });
});

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM vendeurs', [], (err, result) => {
    if (err) {
      return res.status(500).json({ status: 'ERROR', error: err.message });
    }

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      vendeurs: result.count
    });
  });
});

// Démarrer le serveur SEULEMENT si ce n'est pas un import (pour les tests)
if (require.main === module) {
  const PORT = process.env.PORT || 8082;
  app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Serveur REST démarré !');
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
    console.log(`💾 Base de données: ${dbPath}`);
  });

  // Gérer la fermeture propre
  process.on('SIGINT', () => {
    db.close((err) => {
      if (err) {
        console.error(err.message);
      }
      process.exit(0);
    });
  });
}

// 📋 DEBUG : Lister tous les endpoints
if (process.env.NODE_ENV === 'test') {
  app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
      console.log(`  ${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`);
    }
  });
}

// ✅ EXPORTER pour les tests
module.exports = { app, db, initDatabase, seedAdmin };
