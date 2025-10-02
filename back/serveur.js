const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configuration CORS pour permettre les connexions depuis ton frontend
app.use(cors());
app.use(express.json());

// Créer le serveur WebSocket
const wss = new WebSocket.Server({ server });

// Stocker l'état actuel de l'application (en mémoire pour cet exemple)
let currentState = {
  ordreActuel: {
    prochainVendeur: 'matthieu'
  },
  vendeurs: [
    { nom: 'Chloé', ventes: 0, clientEnCours: null },
    { nom: 'Ana', ventes: 0, clientEnCours: null },
    { nom: 'Antoine', ventes: 0, clientEnCours: null },
    { nom: 'Thomas', ventes: 0, clientEnCours: null },
  ],
  historique: []
};

// Fonction pour générer un ID unique de client
function genererIdClient() {
  return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Fonction pour obtenir la date/heure ajustée (timezone française)
function getAdjustedDate() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000);
}

// Fonction pour diffuser un message à tous les clients connectés
function broadcast(message) {
  const messageString = JSON.stringify(message);
  console.log('📢 Diffusion:', messageString);
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

// Fonction pour calculer le prochain vendeur disponible selon les règles métier
function calculerProchainVendeur() {
  // Trouver les vendeurs disponibles (sans client en cours)
  const vendeursDisponibles = currentState.vendeurs.filter(v => !v.clientEnCours);
  
  if (vendeursDisponibles.length === 0) {
    return null; // Tous les vendeurs sont occupés
  }

  // Obtenir le nombre minimum de ventes parmi les vendeurs disponibles
  const minVentes = Math.min(...vendeursDisponibles.map(v => v.ventes));
  
  // Filtrer les vendeurs avec le minimum de ventes
  const vendeursPrioritaires = vendeursDisponibles.filter(v => v.ventes === minVentes);
  
  // Retourner le premier vendeur prioritaire selon l'ordre initial
  return vendeursPrioritaires[0];
}

// Fonction pour traiter les actions métier
function handleAction(action, ws) {
  console.log('🔄 Action reçue:', action);
  
  switch (action.type) {
    case 'PRENDRE_CLIENT':
      const vendeurPriseClient = action.payload.vendeur;
      const vendeurIndexPrise = currentState.vendeurs.findIndex(v => v.nom === vendeurPriseClient);
      
      if (vendeurIndexPrise !== -1 && !currentState.vendeurs[vendeurIndexPrise].clientEnCours) {
        const clientId = action.payload.clientId || genererIdClient();
        const maintenant = getAdjustedDate();
        
        // Assigner le client au vendeur
        currentState.vendeurs[vendeurIndexPrise].clientEnCours = {
          id: clientId,
          heureDebut: maintenant.toLocaleTimeString('fr-FR'),
          dateDebut: maintenant.toLocaleDateString('fr-FR')
        };
        
        // Ajouter à l'historique
        currentState.historique.unshift({
          date: maintenant.toLocaleDateString('fr-FR'),
          heure: maintenant.toLocaleTimeString('fr-FR'),
          action: `Client pris en charge par ${vendeurPriseClient}`,
          vendeur: vendeurPriseClient,
          clientId: clientId
        });
        
        // Recalculer le prochain vendeur
        const prochainVendeur = calculerProchainVendeur();
        if (prochainVendeur) {
          currentState.ordreActuel.prochainVendeur = prochainVendeur.nom;
        }
        
        // Diffuser la mise à jour
        broadcast({
          type: 'STATE_UPDATE',
          payload: currentState
        });
        
        console.log(`✅ Client ${clientId} pris en charge par ${vendeurPriseClient}`);
      } else {
        console.log(`❌ Impossible d'assigner un client à ${vendeurPriseClient}`);
      }
      break;
      
    case 'ABANDONNER_CLIENT':
      const vendeurAbandon = action.payload.vendeur;
      const vendeurIndexAbandon = currentState.vendeurs.findIndex(v => v.nom === vendeurAbandon);
      
      if (vendeurIndexAbandon !== -1 && currentState.vendeurs[vendeurIndexAbandon].clientEnCours) {
        const clientId = currentState.vendeurs[vendeurIndexAbandon].clientEnCours.id;
        
        // Libérer le vendeur
        currentState.vendeurs[vendeurIndexAbandon].clientEnCours = null;
        
        // Ajouter à l'historique
        const maintenant = getAdjustedDate();
        currentState.historique.unshift({
          date: maintenant.toLocaleDateString('fr-FR'),
          heure: maintenant.toLocaleTimeString('fr-FR'),
          action: `Client abandonné par ${vendeurAbandon}`,
          vendeur: vendeurAbandon,
          clientId: clientId
        });
        
        // Recalculer le prochain vendeur
        const prochainVendeur = calculerProchainVendeur();
        if (prochainVendeur) {
          currentState.ordreActuel.prochainVendeur = prochainVendeur.nom;
        }
        
        // Diffuser la mise à jour
        broadcast({
          type: 'STATE_UPDATE',
          payload: currentState
        });
        
        console.log(`✅ Client ${clientId} abandonné par ${vendeurAbandon}`);
      }
      break;
      
    case 'ENREGISTRER_VENTE':
      const vendeurVente = action.payload.vendeur;
      const vendeurIndexVente = currentState.vendeurs.findIndex(v => v.nom === vendeurVente);
      
      if (vendeurIndexVente !== -1 && currentState.vendeurs[vendeurIndexVente].clientEnCours) {
        const clientId = currentState.vendeurs[vendeurIndexVente].clientEnCours.id;
        
        // Incrémenter les ventes du vendeur
        currentState.vendeurs[vendeurIndexVente].ventes += 1;
        
        // Libérer le vendeur
        currentState.vendeurs[vendeurIndexVente].clientEnCours = null;
        
        // Ajouter à l'historique
        const maintenant = getAdjustedDate();
        currentState.historique.unshift({
          date: maintenant.toLocaleDateString('fr-FR'),
          heure: maintenant.toLocaleTimeString('fr-FR'),
          action: `Vente finalisée par ${vendeurVente}`,
          vendeur: vendeurVente,
          clientId: clientId
        });
        
        // Recalculer le prochain vendeur
        const prochainVendeur = calculerProchainVendeur();
        if (prochainVendeur) {
          currentState.ordreActuel.prochainVendeur = prochainVendeur.nom;
        }
        
        // Diffuser la mise à jour à tous les clients
        broadcast({
          type: 'STATE_UPDATE',
          payload: currentState
        });
        
        console.log(`✅ Vente finalisée par ${vendeurVente} pour le client ${clientId}`);
      } else {
        console.log(`❌ ${vendeurVente} n'a pas de client en cours`);
      }
      break;
      
    case 'DEMARRER_JOURNEE':
      const vendeursInitiaux = action.payload.vendeurs;
      
      // Réinitialiser les vendeurs avec les nouveaux noms
      currentState.vendeurs = vendeursInitiaux.map(nom => ({
        nom: nom,
        ventes: 0,
        clientEnCours: null
      }));
      
      // Définir le premier vendeur comme prochain
      if (vendeursInitiaux.length > 0) {
        currentState.ordreActuel.prochainVendeur = vendeursInitiaux[0];
      }
      
      // Ajouter à l'historique
      const maintenant = getAdjustedDate();
      currentState.historique.unshift({
        date: maintenant.toLocaleDateString('fr-FR'),
        heure: maintenant.toLocaleTimeString('fr-FR'),
        action: `Démarrage de la journée avec: ${vendeursInitiaux.join(', ')}`,
        vendeur: 'Système'
      });
      
      broadcast({
        type: 'STATE_UPDATE',
        payload: currentState
      });
      
      console.log('🚀 Journée démarrée avec les vendeurs:', vendeursInitiaux);
      break;
      
    case 'TERMINER_JOURNEE':
      // Libérer tous les vendeurs et remettre à zéro les ventes
      currentState.vendeurs.forEach(v => {
        v.ventes = 0;
        v.clientEnCours = null;
      });
      
      // Ajouter à l'historique
      const maintenantFin = getAdjustedDate();
      currentState.historique.unshift({
        date: maintenantFin.toLocaleDateString('fr-FR'),
        heure: maintenantFin.toLocaleTimeString('fr-FR'),
        action: 'Journée terminée - Remise à zéro',
        vendeur: 'Système'
      });
      
      broadcast({
        type: 'STATE_UPDATE',
        payload: currentState
      });
      
      console.log('🔄 Journée terminée');
      break;
      
    case 'REINITIALISER_TOUT':
      // Réinitialiser complètement l'état
      currentState = {
        ordreActuel: { prochainVendeur: null },
        vendeurs: [],
        historique: []
      };
      
      broadcast({
        type: 'STATE_UPDATE',
        payload: currentState
      });
      
      console.log('🗑️ Réinitialisation complète');
      break;
      
    case 'SYNC_VENDEURS':
      const vendeursSync = action.payload.vendeurs;
      
      // Mettre à jour la liste des vendeurs en préservant les données existantes
      const nouveauxVendeurs = vendeursSync.map(nom => {
        const vendeurExistant = currentState.vendeurs.find(v => v.nom === nom);
        return vendeurExistant || { nom: nom, ventes: 0, clientEnCours: null };
      });
      
      currentState.vendeurs = nouveauxVendeurs;
      
      // Recalculer le prochain vendeur
      const prochainVendeurSync = calculerProchainVendeur();
      if (prochainVendeurSync) {
        currentState.ordreActuel.prochainVendeur = prochainVendeurSync.nom;
      }
      
      broadcast({
        type: 'STATE_UPDATE',
        payload: currentState
      });
      
      console.log('🔄 Vendeurs synchronisés:', vendeursSync);
      break;
      
    case 'GET_INITIAL_STATE':
      // Envoyer l'état actuel uniquement au client qui le demande
      ws.send(JSON.stringify({
        type: 'STATE_UPDATE',
        payload: currentState
      }));
      break;
      
    default:
      console.log('❌ Action inconnue:', action.type);
  }
}

// Gérer les connexions WebSocket
wss.on('connection', (ws, request) => {
  const clientIP = request.socket.remoteAddress;
  console.log(`🟢 Nouvelle connexion depuis ${clientIP}`);
  
  // Envoyer l'état initial au nouveau client
  ws.send(JSON.stringify({
    type: 'STATE_UPDATE',
    payload: currentState
  }));
  
  // Gérer les messages reçus
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleAction(message, ws);
    } catch (error) {
      console.error('❌ Erreur parsing message:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        payload: { message: 'Format de message invalide' }
      }));
    }
  });
  
  // Gérer la déconnexion
  ws.on('close', () => {
    console.log(`🔴 Connexion fermée depuis ${clientIP}`);
  });
  
  // Gérer les erreurs
  ws.on('error', (error) => {
    console.error('❌ Erreur WebSocket:', error);
  });
});

// Routes API optionnelles (pour debug)
app.get('/api/state', (req, res) => {
  res.json(currentState);
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    clients: wss.clients.size,
    timestamp: new Date().toISOString(),
    vendeurs: currentState.vendeurs.length,
    vendeursOccupes: currentState.vendeurs.filter(v => v.clientEnCours).length
  });
});

// Route pour obtenir les statistiques
app.get('/api/stats', (req, res) => {
  const vendeursOccupes = currentState.vendeurs.filter(v => v.clientEnCours);
  const vendeursDisponibles = currentState.vendeurs.filter(v => !v.clientEnCours);
  
  res.json({
    totalVendeurs: currentState.vendeurs.length,
    vendeursOccupes: vendeursOccupes.length,
    vendeursDisponibles: vendeursDisponibles.length,
    totalVentes: currentState.vendeurs.reduce((sum, v) => sum + v.ventes, 0),
    prochainVendeur: currentState.ordreActuel.prochainVendeur,
    vendeurs: currentState.vendeurs.map(v => ({
      nom: v.nom,
      ventes: v.ventes,
      occupé: !!v.clientEnCours,
      tempsOccupation: v.clientEnCours ? 
        `depuis ${v.clientEnCours.heureDebut}` : null
    }))
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 8082;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Serveur WebSocket démarré !');
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`👥 Prêt à accepter des connexions...`);
  console.log(`📊 Stats disponibles sur: http://localhost:${PORT}/api/stats`);
});