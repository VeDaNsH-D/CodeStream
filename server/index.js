const express = require('express');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const fsService = require('./fs-service');

const app = express();

// In-memory storage for file contents and client subscriptions
const fileContents = new Map();
const fileSubscriptions = new Map(); // Map<filePath, Set<WebSocket>>
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
    console.log(`SAVING: Received request to save to ${relativePath}`);
    console.log(`SAVING: Content length: ${content.length}`);
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(projectRoot, safePath);

    if (!filePath.startsWith(path.join(projectRoot, 'workspace'))) {
      console.log(`SAVING: Access denied for path ${filePath}`);
      return res.status(403).send('Access denied.');
    }
    console.log(`SAVING: Writing to absolute path ${filePath}`);
    await fsService.saveFileContent(filePath, content);
    console.log(`SAVING: File saved successfully.`);
    res.status(200).send('File saved successfully');
  } catch (error) {
    console.error('Error saving file content:', error);
    res.status(500).send('Error saving file content');
  }
});

app.post('/api/execute', (req, res) => {
  const { filePath: relativePath, language } = req.body;

  if (!relativePath || !language) {
    return res.status(400).send('File path and language are required.');
  }

  const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(projectRoot, safePath);

  if (!filePath.startsWith(path.join(projectRoot, 'workspace'))) {
    return res.status(403).send('Access denied. You can only execute files in the workspace.');
  }

  let command;
  const parsedPath = path.parse(filePath);
  const executableName = path.join(parsedPath.dir, parsedPath.name);

  switch (language) {
    case 'javascript':
      command = `node ${filePath}`;
      break;
    case 'python':
      command = `python ${filePath}`;
      break;
    case 'c':
      command = `gcc ${filePath} -o ${executableName} && ${executableName}`;
      break;
    case 'cpp':
      command = `g++ ${filePath} -o ${executableName} && ${executableName}`;
      break;
    case 'java':
      command = `javac ${filePath} && java -cp ${parsedPath.dir} ${parsedPath.name}`;
      break;
    default:
      return res.status(400).send('Unsupported language.');
  }

  exec(command, (error, stdout, stderr) => {
    // Cleanup compiled files
    if (['c', 'cpp'].includes(language) && fs.existsSync(executableName)) {
      fs.unlinkSync(executableName);
    } else if (language === 'java') {
      const classFile = path.join(parsedPath.dir, `${parsedPath.name}.class`);
      if (fs.existsSync(classFile)) {
        fs.unlinkSync(classFile);
      }
    }

    if (error) {
      return res.status(500).json({
        message: 'Error executing file',
        stdout,
        stderr: error.message,
      });
    }
    res.json({ stdout, stderr });
  });
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
  ws.currentFile = null; // Track the file this client is currently viewing
  console.log(`Client ${clientId} connected`);

  // Send ID to the new client
  ws.send(JSON.stringify({ type: 'ID_ASSIGN', payload: clientId }));

  const broadcast = (filePath, message, excludeClient) => {
    const subscribers = fileSubscriptions.get(filePath);
    if (!subscribers) return;

    subscribers.forEach((client) => {
      if (client !== excludeClient && client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  };

  const unsubscribe = (client) => {
    const { id: clientId, currentFile } = client;
    if (!currentFile) return;

    const subscribers = fileSubscriptions.get(currentFile);
    if (subscribers) {
      subscribers.delete(client);
      console.log(`Client ${clientId} unsubscribed from ${currentFile}`);

      if (subscribers.size === 0) {
        fileSubscriptions.delete(currentFile);
        fileContents.delete(currentFile);
        console.log(`No clients left for ${currentFile}, cleaning up.`);
      } else {
        // Notify remaining clients of disconnection
        broadcast(currentFile, {
          type: 'USER_DISCONNECTED',
          payload: { userId: clientId, filePath: currentFile },
        });
      }
    }
    client.currentFile = null;
  };

  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());
    const { type, payload } = message;
    const { id: clientId } = ws;

    switch (type) {
      case 'JOIN_FILE': {
        const { filePath } = payload;
        // Unsubscribe from the previous file, if any
        unsubscribe(ws);

        // Subscribe to the new file
        ws.currentFile = filePath;
        if (!fileSubscriptions.has(filePath)) {
          fileSubscriptions.set(filePath, new Set());
        }
        fileSubscriptions.get(filePath).add(ws);
        console.log(`Client ${clientId} subscribed to ${filePath}`);

        // If content is not in memory, load it from disk
        if (!fileContents.has(filePath)) {
          try {
            const fullPath = path.join(projectRoot, filePath);
            const content = await fsService.getFileContent(fullPath);
            fileContents.set(filePath, content);
            console.log(`Loaded content for ${filePath} from disk.`);
          } catch (error) {
            console.error(`Failed to load file content for ${filePath}:`, error);
            // Notify client of the error
            ws.send(JSON.stringify({ type: 'ERROR', payload: `Could not load file: ${filePath}` }));
            unsubscribe(ws); // Clean up subscription on error
            return;
          }
        }

        // Send the current content to the newly joined client
        ws.send(JSON.stringify({
          type: 'CONTENT_UPDATE',
          payload: {
            filePath,
            content: fileContents.get(filePath),
          },
        }));
        break;
      }

      case 'CONTENT_CHANGE': {
        const { filePath, content } = payload;
        if (ws.currentFile !== filePath) return; // Ignore if not subscribed

        fileContents.set(filePath, content);
        broadcast(filePath, {
          type: 'CONTENT_UPDATE',
          payload: { filePath, content },
        }, ws); // Broadcast to others
        break;
      }

      case 'CURSOR_CHANGE': {
        const { filePath, position } = payload;
        if (ws.currentFile !== filePath) return;

        broadcast(filePath, {
          type: 'CURSOR_UPDATE',
          payload: { userId: clientId, position, filePath },
        }, ws);
        break;
      }

      case 'CHAT_MESSAGE': {
        // Chat is still global for simplicity, but could be room-based
        console.log(`Chat from ${clientId}: ${payload.text}`);
        wss.clients.forEach((client) => {
           if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'NEW_CHAT_MESSAGE',
              payload: { ...payload, user: clientId },
            }));
          }
        });
        break;
      }
    }
  });

  ws.on('close', () => {
    console.log(`Client ${ws.id} disconnected`);
    unsubscribe(ws);
  });
});
