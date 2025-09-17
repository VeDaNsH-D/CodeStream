// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket', 'polling']
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let rooms = {};
const languageMap = { 'javascript': 63, 'python': 71, 'java': 62, 'c': 50, 'cpp': 54 };
const getRandomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;

const pollForResult = async (token, socket, retries = 7) => {
    if (retries === 0) return socket.emit('code-output', { stderr: 'Execution timed out.', stdout: '' });
    try {
        const resultResponse = await axios.request({
            method: 'GET',
            url: `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
            params: { base64_encoded: 'false', fields: '*' },
            headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'API_KEY', 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com' }
        });
        const statusId = resultResponse.data.status?.id;
        if (statusId === 1 || statusId === 2) {
            setTimeout(() => pollForResult(token, socket, retries - 1), 2000);
        } else {
            const { stdout, stderr, compile_output, status } = resultResponse.data;
            socket.emit('code-output', { stdout: stdout || '', stderr: stderr || '', compile_output: compile_output || '', status: status?.description || 'Error' });
        }
    } catch (pollError) {
        console.error('Judge0 Poll Error:', pollError.response ? pollError.response.data : pollError.message);
        socket.emit('code-output', { stderr: 'Failed to retrieve execution result.', stdout: '' });
    }
};

io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUser = null;

  socket.on('join-room', ({ roomId, username }) => {
    // Leave previous room if any
    if (currentRoomId) {
        socket.leave(currentRoomId);
        if (rooms[currentRoomId]?.participants) {
            delete rooms[currentRoomId].participants[socket.id];
            io.to(currentRoomId).emit('user-left', { userId: socket.id });
        }
    }

    currentRoomId = roomId;
    currentUser = { id: socket.id, username, color: getRandomColor() };

    if (!rooms[roomId]) {
      rooms[roomId] = { participants: {}, files: { 'main.py': `print("Hello, collaborative world!")` } };
    }

    socket.join(roomId);
    rooms[roomId].participants[socket.id] = currentUser;

    socket.emit('initial-sync', { files: rooms[roomId].files, participants: rooms[roomId].participants, currentUser: currentUser });
    socket.to(roomId).emit('user-joined', { user: currentUser });
  });

  socket.on('file-add', ({ path }) => { if (rooms[currentRoomId]) { rooms[currentRoomId].files[path] = ''; io.to(currentRoomId).emit('file-add', { path }); } });
  socket.on('file-rename', ({ oldPath, newPath }) => { if (rooms[currentRoomId]?.files[oldPath] !== undefined) { rooms[currentRoomId].files[newPath] = rooms[currentRoomId].files[oldPath]; delete rooms[currentRoomId].files[oldPath]; io.to(currentRoomId).emit('file-rename', { oldPath, newPath }); } });
  socket.on('file-delete', ({ path }) => { if (rooms[currentRoomId]?.files[path] !== undefined) { delete rooms[currentRoomId].files[path]; io.to(currentRoomId).emit('file-delete', { path }); } });
  socket.on('code-change', ({ path, newCode }) => { if (rooms[currentRoomId]?.files[path] !== undefined) { rooms[currentRoomId].files[path] = newCode; socket.to(currentRoomId).emit('code-change', { path, newCode }); } });
  
  socket.on('run-code', async ({ language, code, currentFile }) => {
    if (!currentUser) return;
    socket.to(currentRoomId).emit('execution-notification', { username: currentUser.username, file: currentFile });
    const languageId = languageMap[language];
    if (!languageId) return socket.emit('code-output', { stderr: 'Unsupported language.', stdout: '' });
    const options = { method: 'POST', url: 'https://judge0-ce.p.rapidapi.com/submissions', params: { base64_encoded: 'false', fields: '*' }, headers: { 'content-type': 'application/json', 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'API_KEY', 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com' }, data: { language_id: languageId, source_code: code } };
    try {
      const submissionResponse = await axios.request(options);
      const token = submissionResponse.data.token;
      if (token) pollForResult(token, socket); else socket.emit('code-output', { stderr: 'Failed to create submission.', stdout: '' });
    } catch (submitError) {
      console.error('Judge0 Submit Error:', submitError.response ? submitError.response.data : submitError.message);
      socket.emit('code-output', { stderr: 'An error occurred during code submission.', stdout: '' });
    }
  });
  
  socket.on('send-chat-message', ({ message }) => { if (currentUser) io.to(currentRoomId).emit('receive-chat-message', { user: currentUser, message }); });

  // **FIX APPLIED**: Made signaling logic more robust.
  const relaySignal = (event, payload) => {
      const { to } = payload;
      if (rooms[currentRoomId]?.participants[to]) {
          socket.to(to).emit(event, { ...payload, from: socket.id });
      } else {
          console.log(`Signal relay failed: Target ${to} not in room ${currentRoomId}`);
      }
  };

  socket.on('webrtc-offer', (payload) => relaySignal('webrtc-offer', payload));
  socket.on('webrtc-answer', (payload) => relaySignal('webrtc-answer', payload));
  socket.on('webrtc-ice-candidate', (payload) => relaySignal('webrtc-ice-candidate', payload));

  socket.on('disconnect', () => {
    if (currentRoomId && rooms[currentRoomId]?.participants[socket.id]) {
      delete rooms[currentRoomId].participants[socket.id];
      io.to(currentRoomId).emit('user-left', { userId: socket.id });
      if (Object.keys(rooms[currentRoomId].participants).length === 0) {
        delete rooms[currentRoomId];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Code Stream server running on http://localhost:${PORT}`);
});
