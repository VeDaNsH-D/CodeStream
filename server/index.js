const express = require('express');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();

// In-memory storage for clients and document content
const clients = new Set();
let documentContent = `function helloWorld() {
  console.log("Hello, collaborative world!");
}`;
const port = 3001;

// Enable CORS
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);

  // Send the current document content to the new client
  ws.send(documentContent);

  // Handle messages from clients
  ws.on('message', (message) => {
    const receivedContent = message.toString();
    documentContent = receivedContent;
    console.log('Received message => broadcasting to other clients');
    clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) { // WebSocket.OPEN
        client.send(documentContent);
      }
    });
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
});
