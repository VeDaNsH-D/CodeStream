const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// --- SOLUTION: A more aggressive keep-alive configuration ---
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  // Send a heartbeat ping every 10 seconds to keep the connection alive
  pingInterval: 10000,
  // Wait up to 25 seconds for the pong response before disconnecting
  pingTimeout: 25000,
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// In-memory storage for rooms
const rooms = {};

// Map language names to Judge0 API language IDs
const languageIdMap = {
    'python': 71,
    'javascript': 63,
    'text/x-c++src': 54,
    'text/x-java': 62,
    'text/x-csrc': 50
};

// Serve the frontend file
app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('room:join', ({ roomId, user }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = {
                files: [],
                participants: {}
            };
            console.log(`Room [${roomId}] created.`);
        }

        rooms[roomId].participants[socket.id] = { ...user, id: socket.id };

        // Send the current room state to the newly joined user
        socket.emit('room:joined', {
            roomId,
            files: rooms[roomId].files,
            participants: Object.values(rooms[roomId].participants)
        });

        // Inform other users in the room about the new participant
        socket.to(roomId).emit('user:joined', rooms[roomId].participants[socket.id]);

        console.log(`User ${user.name} (${socket.id}) joined room [${roomId}]`);
    });

    // --- FILE SYNC EVENTS ---

    socket.on('file:add', (newFile) => {
        const roomId = Array.from(socket.rooms)[1];
        if (rooms[roomId]) {
            rooms[roomId].files.push(newFile);
            io.to(roomId).emit('state:update', rooms[roomId]);
        }
    });

    socket.on('file:delete', (fileId) => {
        const roomId = Array.from(socket.rooms)[1];
        if (rooms[roomId]) {
            rooms[roomId].files = rooms[roomId].files.filter(f => f.id !== fileId);
            io.to(roomId).emit('state:update', rooms[roomId]);
        }
    });

    socket.on('file:update', ({ id, content }) => {
        const roomId = Array.from(socket.rooms)[1];
        if (rooms[roomId]) {
            const file = rooms[roomId].files.find(f => f.id === id);
            if (file) file.content = content;
            // Use broadcast to avoid sending the update back to the originator
            socket.to(roomId).emit('state:update', rooms[roomId]);
        }
    });

    socket.on('file:language-change', ({ id, language }) => {
        const roomId = Array.from(socket.rooms)[1];
        if (rooms[roomId]) {
            const file = rooms[roomId].files.find(f => f.id === id);
            if (file) file.language = language;
            io.to(roomId).emit('state:update', rooms[roomId]);
        }
    });

    // --- CURSOR SYNC EVENT ---

    socket.on('cursor:move', (cursorData) => {
        const roomId = Array.from(socket.rooms)[1];
        if (rooms[roomId]) {
            const user = rooms[roomId].participants[socket.id];
            if (user) {
                socket.to(roomId).emit('cursor:update', {
                    userId: user.id,
                    userName: user.name,
                    userColor: user.color,
                    ...cursorData,
                });
            }
        }
    });

    // --- WebRTC Signaling Relays ---
    socket.on('webrtc:offer', ({ target, offer }) => {
        socket.to(target).emit('webrtc:offer', { from: socket.id, offer });
    });

    socket.on('webrtc:answer', ({ target, answer }) => {
        socket.to(target).emit('webrtc:answer', { from: socket.id, answer });
    });

    socket.on('webrtc:ice-candidate', ({ target, candidate }) => {
        socket.to(target).emit('webrtc:ice-candidate', { from: socket.id, candidate });
    });

    // --- Code Execution ---
    socket.on('code:run', async ({ language, code, fileName }) => {
        const roomId = Array.from(socket.rooms)[1];
        if (!rooms[roomId]) return;

        const user = rooms[roomId].participants[socket.id];
        // Notify others that a user started running code
        socket.to(roomId).emit('user:ran-code', { user, fileName });

        const languageId = languageIdMap[language];
        if (!languageId) {
            return socket.emit('code:output', { error: true, output: 'Unsupported language.' });
        }

        const options = {
            method: 'POST',
            url: 'https://judge0-ce.p.rapidapi.com/submissions',
            params: { base64_encoded: 'false', fields: '*' },
            headers: {
                'content-type': 'application/json',
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'YOUR_FALLBACK_RAPIDAPI_KEY',
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            },
            data: {
                language_id: languageId,
                source_code: code,
            }
        };

        try {
            const submissionResponse = await axios.request(options);
            const token = submissionResponse.data.token;

            // Poll for result
            const pollResult = async () => {
                const resultResponse = await axios.request({
                    method: 'GET',
                    url: `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
                    params: { base64_encoded: 'false', fields: '*' },
                    headers: {
                        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'YOUR_FALLBACK_RAPIDAPI_KEY',
                        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                    }
                });

                const statusId = resultResponse.data.status.id;

                if (statusId <= 2) { // In Queue or Processing
                    setTimeout(pollResult, 2000);
                } else {
                    const output = resultResponse.data.stdout || resultResponse.data.stderr || resultResponse.data.compile_output || 'Execution finished.';
                    const error = statusId !== 3; // 3 is "Accepted"
                    socket.emit('code:output', { output, error });
                }
            };
            setTimeout(pollResult, 2000);

        } catch (error) {
            console.error('Judge0 API Error:', error.response ? error.response.data : error.message);
            socket.emit('code:output', { error: true, output: 'Failed to run code. Check server logs.' });
        }
    });

    // --- Disconnection Logic ---
    socket.on('disconnecting', () => {
        const roomId = Array.from(socket.rooms)[1];
        if (rooms[roomId]) {
            const user = rooms[roomId].participants[socket.id];
            console.log(`User ${user ? user.name : socket.id} disconnecting from room [${roomId}]`);

            delete rooms[roomId].participants[socket.id];

            if (Object.keys(rooms[roomId].participants).length === 0) {
                 setTimeout(() => {
                    if (rooms[roomId] && Object.keys(rooms[roomId].participants).length === 0) {
                         delete rooms[roomId];
                         console.log(`Room [${roomId}] deleted as it is empty.`);
                    }
                }, 60000); // 1 minute delay
            } else {
                io.to(roomId).emit('user:left', socket.id);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

