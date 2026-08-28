const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const players = {};
let roomStarted = false;

io.on('connection', (socket) => {
    console.log('Entrenador conectado:', socket.id);

    // Registrar jugador cuando entra desde el lobby
    socket.on('joinPlayer', (playerData) => {
        players[socket.id] = {
            id: socket.id,
            name: playerData.name,
            pokemon: playerData.pokemon,
            x: playerData.x || 400,
            y: playerData.y || 225,
            stats: playerData.stats || { hp: 100, attack: 50 },
            speed: playerData.speed || 4
        };

        // Emitir estado actualizado a todos
        io.emit('stateUpdate', players);
        
        // Si la sala ya había iniciado, notificar al nuevo jugador
        if (roomStarted) {
            socket.emit('roomStarted');
        }
    });

    // Actualizar movimiento del jugador
    socket.on('playerMove', (moveData) => {
        if (players[socket.id]) {
            players[socket.id].x = moveData.x;
            players[socket.id].y = moveData.y;
            io.emit('stateUpdate', players);
        }
    });

    // Disparar inicio global de la partida (solo Admin o cualquier jugador listado)
    socket.on('triggerStart', () => {
        roomStarted = true;
        io.emit('roomStarted');
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log('Entrenador desconectado:', socket.id);
        delete players[socket.id];
        io.emit('stateUpdate', players);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 Servidor corriendo en puerto ${PORT}`);
});
