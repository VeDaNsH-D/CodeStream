const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows connections from any origin
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// In-memory storage for rooms. No database needed!
const rooms = {};

// Serve the frontend
app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Map our language names to Judge0 language IDs
const languageIdMap = {
    'python': 71,
    'javascript': 63,
    'text/x-c++src': 54,
    'text/x-java': 62,
    'text/x-csrc': 50
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('room:join', ({ roomId, user }) => {
        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = { files: [], participants: {} };
            console.log(`Room [${roomId}] created.`);
        }

        const state = {
            files: rooms[roomId].files,
            participants: Object.values(rooms[roomId].participants)
        };
        socket.emit('room:joined', state);

        rooms[roomId].participants[socket.id] = { ...user, id: socket.id };
        
        socket.to(roomId).emit('user:joined', rooms[roomId].participants[socket.id]);
        
        console.log(`User ${user.name} (${socket.id}) joined room [${roomId}]`);
    });

    const broadcastStateUpdate = (roomId) => {
        if (rooms[roomId]) {
            const state = {
                files: rooms[roomId].files,
                participants: Object.values(rooms[roomId].participants)
            };
            io.to(roomId).emit('state:update', state);
        }
    };

    socket.on('file:add', (file) => {
        const roomId = Array.from(socket.rooms)[1];
        if (rooms[roomId] && !rooms[roomId].files.find(f => f.id === file.id)) {
            rooms[roomId].files.push(file);
            broadcastStateUpdate(roomId);
        }
    });

    socket.on('file:delete', (fileId) => {
        const roomId = Array.from(socket.rooms)[1];
        if (rooms[roomId]) {
            rooms[roomId].files = rooms[roomId].files.filter(f => f.id !== fileId);
            broadcastStateUpdate(roomId);
        }
    });
    
    socket.on('file:update', ({ id, content }) => {
        const roomId = Array.from(socket.rooms)[1];
        if (rooms[roomId]) {
            const file = rooms[roomId].files.find(f => f.id === id);
            if (file) {
                file.content = content;
                socket.to(roomId).emit('state:update', {
                    files: rooms[roomId].files,
                    participants: Object.values(rooms[roomId].participants)
                });
            }
        }
    });

    socket.on('file:language-change', ({ id, language }) => {
        const roomId = Array.from(socket.rooms)[1];
         if (rooms[roomId]) {
            const file = rooms[roomId].files.find(f => f.id === id);
            if (file) {
                file.language = language;
                broadcastStateUpdate(roomId);
            }
        }
    });
    
    // --- Cursor Position Relay ---
    socket.on('cursor:move', (data) => {
        const roomId = Array.from(socket.rooms)[1];
        if (rooms[roomId]) {
            const user = rooms[roomId].participants[socket.id];
            if(user) {
                 socket.to(roomId).emit('cursor:update', {
                    userId: socket.id,
                    userName: user.name,
                    userColor: user.color,
                    ...data
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
        socket.to(roomId).emit('user:ran-code', { user, fileName });

        const languageId = languageIdMap[language];
        if (!languageId) {
            return socket.emit('code:output', { output: "Language not supported for execution.", error: true });
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
            data: { language_id: languageId, source_code: code }
        };

        try {
            const submissionResponse = await axios.request(options);
            const token = submissionResponse.data.token;

            let pollTimeout = null;
            let timedOut = false;

            const pollResult = async () => {
                if (timedOut) return;
                try {
                    const resultOptions = { ...options, method: 'GET', url: `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=false&fields=*` };
                    const resultResponse = await axios.request(resultOptions);
                    const statusId = resultResponse.data.status.id;

                    if (statusId <= 2) { // In Queue or Processing
                        setTimeout(pollResult, 1500);
                    } else {
                        clearTimeout(pollTimeout);
                        const output = resultResponse.data.stdout || resultResponse.data.compile_output || resultResponse.data.stderr;
                        const hasError = statusId !== 3; // 3 is "Accepted"
                        socket.emit('code:output', { output: output || "Execution finished with no output.", error: hasError });
                    }
                } catch (pollError) {
                     clearTimeout(pollTimeout);
                     console.error('Judge0 Poll Error:', pollError.message);
                     socket.emit('code:output', { output: `Error fetching execution result.`, error: true });
                }
            };
            
            pollTimeout = setTimeout(() => {
                timedOut = true;
                socket.emit('code:output', { output: 'Execution timed out after 15 seconds.', error: true });
            }, 15000);

            setTimeout(pollResult, 1500);

        } catch (error) {
            const errorMessage = error.response ? JSON.stringify(error.response.data) : "API request failed.";
            console.error('Judge0 API Error:', errorMessage);
            socket.emit('code:output', { output: `Execution Error: Could not connect to the compilation service.`, error: true });
        }
    });

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


