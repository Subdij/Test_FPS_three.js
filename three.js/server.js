const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const port = 3000;

// Créer un serveur HTTP
const server = http.createServer(app);

// Créer un serveur WebSocket
const wss = new WebSocket.Server({ server });

// Middleware pour loguer chaque requête
app.use((req, res, next) => {
  console.log(`Request URL: ${req.url}`);
  next();
});

// Servir les fichiers statiques nécessaires pour le jeu FPS
app.use('/build', express.static(path.join(__dirname, 'build')));
app.use('/examples', express.static(path.join(__dirname, 'examples')));
app.use('/files', express.static(path.join(__dirname, 'files')));
app.use('/models', express.static(path.join(__dirname, 'examples/models')));

// Route pour le jeu FPS
app.get('/', (req, res) => {
  console.log('Serving game_fps.html');
  res.sendFile(path.join(__dirname, 'examples', 'games_fps.html'), (err) => {
    if (err) {
      console.error('Error serving game_fps.html:', err);
    }
  });
});

// Stocker les positions des joueurs et des sphères
const players = {};
const spheres = {};

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    const { id, position, rotation, sphereId, spherePosition, sphereVelocity } = data;

    if (id) {
      // Mettre à jour la position du joueur
      players[id] = { position, rotation };

      // Diffuser la position mise à jour à tous les clients connectés
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ id, position, rotation }));
        }
      });
    }

    if (sphereId) {
      // Mettre à jour la position et la vélocité de la sphère
      spheres[sphereId] = { spherePosition, sphereVelocity };

      // Diffuser la position et la vélocité mises à jour à tous les clients connectés
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ sphereId, spherePosition, sphereVelocity }));
        }
      });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Trouver l'ID du joueur déconnecté
    let disconnectedPlayerId = null;
    for (const id in players) {
      if (players[id].ws === ws) {
        disconnectedPlayerId = id;
        break;
      }
    }
    if (disconnectedPlayerId) {
      // Supprimer le joueur de la liste des joueurs
      delete players[disconnectedPlayerId];
      // Informer tous les clients connectés de supprimer le joueur déconnecté
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ id: disconnectedPlayerId, disconnected: true }));
        }
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});