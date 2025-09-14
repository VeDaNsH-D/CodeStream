const express = require('express');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const fsService = require('./fs-service');

const app = express();

// In-memory storage for clients and document content
const clients = new Set();
let documentContent = `function helloWorld() {
  console.log("Hello, collaborative world!");
}`;
const port = 3001;

// Enable CORS
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- File System API Endpoints ---
const workspaceRoot = path.join(__dirname, '../workspace');

app.get('/api/fs/tree', async (req, res) => {
  try {
    const tree = await fsService.getDirectoryTree(workspaceRoot);
    res.json(tree);
  } catch (error) {
    console.error('Error reading directory tree:', error);
    res.status(500).send('Error reading directory tree');
  }
});

const projectRoot = path.resolve(__dirname, '..');

app.get('/api/fs/content', async (req, res) => {
  try {
    // Sanitize path to prevent directory traversal
    const safePath = path.normalize(req.query.path).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(projectRoot, safePath);

    if (!filePath.startsWith(path.join(projectRoot, 'workspace'))) {
      return res.status(403).send('Access denied.');
    }
    const content = await fsService.getFileContent(filePath);
    res.send(content);
  } catch (error) {
    console.error('Error reading file content:', error);
    res.status(500).send('Error reading file content');
  }
});

app.post('/api/fs/content', async (req, res) => {
  try {
    const { path: relativePath, content } = req.body;
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(projectRoot, safePath);

    if (!filePath.startsWith(path.join(projectRoot, 'workspace'))) {
      return res.status(403).send('Access denied.');
    }
    await fsService.saveFileContent(filePath, content);
    res.status(200).send('File saved successfully');
  } catch (error) {
    console.error('Error saving file content:', error);
    res.status(500).send('Error saving file content');
  }
});

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
  const clientId = crypto.randomUUID();
  ws.id = clientId;
  clients.add(ws);
  console.log(`Client ${clientId} connected`);

  // Send initial state to the new client
  ws.send(JSON.stringify({ type: 'ID_ASSIGN', payload: clientId }));
  ws.send(JSON.stringify({ type: 'CONTENT_UPDATE', payload: documentContent }));

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'CONTENT_CHANGE':
        documentContent = message.payload;
        console.log(`Content change from ${clientId} => broadcasting`);
        clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify({ type: 'CONTENT_UPDATE', payload: documentContent }));
          }
        });
        break;
      case 'CHAT_MESSAGE':
        console.log(`Chat from ${clientId}: ${message.payload.text}`);
        clients.forEach((client) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify({
              type: 'NEW_CHAT_MESSAGE',
              payload: message.payload,
            }));
          }
        });
        break;
      case 'CURSOR_CHANGE':
        console.log(`Cursor change from ${clientId} => broadcasting`);
        clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify({
              type: 'CURSOR_UPDATE',
              payload: message.payload,
            }));
          }
        });
        break;
    }
  });

  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(ws);
    // Broadcast disconnection to other clients
    clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({
          type: 'USER_DISCONNECTED',
          payload: { userId: clientId },
        }));
      }
    });
  });
});
