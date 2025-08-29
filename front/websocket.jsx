// Serveur WebSocket (utilisant ws)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', (ws) => {
  console.log('Client connecté');

  // Diffuser les mises à jour des données aux clients connectés
  ws.on('message', (message) => {
    console.log(`Reçu message : ${message}`);
    wss.clients.forEach((client) => {
      client.send(message);
    });
  });

  // Fermer la connexion
  ws.on('close', () => {
    console.log('Client déconnecté');
  });
});