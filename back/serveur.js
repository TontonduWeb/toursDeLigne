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
    { nom: 'matthieu', ventes: 0 },
    { nom: 'Cindy', ventes: 0 },
    { nom: 'Thomas', ventes: 0 },
    { nom: 'Olivia', ventes: 0 }
  ],
  historique: []
};

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

// Fonction pour traiter les actions métier
function handleAction(action, ws) {
  console.log('🔄 Action reçue:', action);
  
  switch (action.type) {
    case 'ENREGISTRER_VENTE':
      const vendeur = action.payload.vendeur;
      const vendeurIndex = currentState.vendeurs.findIndex(v => v.nom === vendeur);
      
      if (vendeurIndex !== -1) {
        // Incrémenter les ventes du vendeur
        currentState.vendeurs[vendeurIndex].ventes += 1;
        
        // Ajouter à l'historique
        currentState.historique.unshift({
          date: new Date().toLocaleDateString('fr-FR'),
          heure: new Date().toLocaleTimeString('fr-FR'),
          action: `Vente enregistrée pour ${vendeur}`,
          vendeur: vendeur
        });
        
        // Calculer le prochain vendeur (logique de rotation)
        const nextVendeurIndex = (vendeurIndex + 1) % currentState.vendeurs.length;
        currentState.ordreActuel.prochainVendeur = currentState.vendeurs[nextVendeurIndex].nom;
        
        // Diffuser la mise à jour à tous les clients
        broadcast({
          type: 'STATE_UPDATE',
          payload: currentState
        });
        
        console.log(`✅ Vente enregistrée pour ${vendeur}`);
      }
      break;
      
    case 'TERMINER_JOURNEE':
      // Remettre à zéro les ventes
      currentState.vendeurs.forEach(v => v.ventes = 0);
      
      // Ajouter à l'historique
      currentState.historique.unshift({
        date: new Date().toLocaleDateString('fr-FR'),
        heure: new Date().toLocaleTimeString('fr-FR'),
        action: 'Journée terminée - Remise à zéro',
        vendeur: 'Système'
      });
      
      broadcast({
        type: 'STATE_UPDATE',
        payload: currentState
      });
      
      console.log('🔄 Journée terminée');
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
    timestamp: new Date().toISOString()
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Serveur WebSocket démarré !');
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`👥 Prêt à accepter des connexions...`);
});