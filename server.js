const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const rooms = {};

// Serve the frontend
app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const languageIdMap = {
    'python': 71, 'javascript': 63, 'text/x-c++src': 54, 'text/x-java': 62, 'text/x-csrc': 50
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('room:join', ({ roomId, user }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = { files: [], participants: {} };
            console.log(`Room [${roomId}] created.`);
        }

        const existingUsers = Object.values(rooms[roomId].participants);
        socket.emit('room:existing-users', existingUsers);

        rooms[roomId].participants[socket.id] = { ...user, id: socket.id };

        socket.emit('room:joined', {
            roomId,
            files: rooms[roomId].files,
            participants: Object.values(rooms[roomId].participants)
        });

        socket.to(roomId).emit('user:joined', rooms[roomId].participants[socket.id]);

        console.log(`User ${user.name} (${socket.id}) joined room [${roomId}]`);
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
        socket.to(roomId).emit('user:ran-code', { user, fileName });

        // ... (Rest of the code execution logic with Judge0)
    });

    socket.on('disconnecting', () => {
        const roomId = Array.from(socket.rooms)[1];
        if (rooms[roomId]) {
            delete rooms[roomId].participants[socket.id];

            if (Object.keys(rooms[roomId].participants).length === 0) {
                 setTimeout(() => {
                    // ... (Delete room logic)
                 }, 60000);
            } else {
                io.to(roomId).emit('user:left', socket.id);
            }
        }
    });

    // --- Other file-related handlers (file:add, etc.) are here ---
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
