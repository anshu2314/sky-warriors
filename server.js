const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Store connected players
const players = new Map();

wss.on('connection', (ws) => {
    // Generate a unique ID for the player
    const playerId = Math.random().toString(36).substr(2, 9);
    
    // Store player data
    players.set(playerId, {
        id: playerId,
        position: { x: 0, y: 30.0, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        rotation: { x: 0, y: Math.PI, z: 0 },
        speed: 1.2,
        isAirborne: true,
        username: 'Player',
        health: 100,
        score: 0
    });

    // Send player their ID
    ws.send(JSON.stringify({
        type: 'init',
        id: playerId
    }));

    // Send current players to new player
    ws.send(JSON.stringify({
        type: 'players',
        players: Array.from(players.values())
    }));

    // Broadcast new player to others
    broadcast({
        type: 'newPlayer',
        player: players.get(playerId)
    }, ws);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'update':
                    // Update player position and state
                    const player = players.get(playerId);
                    if (player) {
                        player.position = data.position;
                        if (data.quaternion) player.quaternion = data.quaternion;
                        player.rotation = data.rotation;
                        player.speed = data.speed;
                        player.isAirborne = data.isAirborne;
                        player.username = data.username;
                        if (data.score !== undefined) player.score = data.score;
                        if (data.health !== undefined) player.health = data.health;
                        
                        // Broadcast update to other players
                        broadcast({
                            type: 'playerUpdate',
                            id: playerId,
                            player: player
                        }, ws);
                    }
                    break;

                case 'missileFired':
                    // Relayer missile fired event to all other players
                    broadcast({
                        type: 'missileFired',
                        ownerId: playerId,
                        isSpecial: data.isSpecial,
                        position: data.position,
                        quaternion: data.quaternion
                    }, ws);
                    break;

                case 'missileHit':
                    // A player reports a hit on a target
                    const targetId = data.targetId;
                    const targetPlayer = players.get(targetId);
                    
                    if (targetPlayer) {
                        targetPlayer.health = Math.max(0, targetPlayer.health - data.damage);
                        
                        // If shooter is valid, reward points
                        const shooter = players.get(playerId);
                        const points = data.isSpecial ? 50 : 25;
                        if (shooter && playerId !== targetId) {
                            shooter.score += points;
                        }

                        // Broadcast hit to ALL players (including sender to sync HUD/state)
                        broadcast({
                            type: 'missileHit',
                            shooterId: playerId,
                            targetId: targetId,
                            damage: data.damage,
                            isSpecial: data.isSpecial,
                            newHealth: targetPlayer.health,
                            scores: Array.from(players.entries()).map(([id, p]) => ({ id, username: p.username, score: p.score }))
                        });
                    }
                    break;

                case 'playerRespawn':
                    // Reset player health and state on server
                    const respawnPlayer = players.get(playerId);
                    if (respawnPlayer) {
                        respawnPlayer.health = 100;
                        respawnPlayer.position = { x: 0, y: 30.0, z: 0 };
                        respawnPlayer.quaternion = { x: 0, y: 0, z: 0, w: 1 };
                        respawnPlayer.rotation = { x: 0, y: Math.PI, z: 0 };
                        
                        broadcast({
                            type: 'playerRespawn',
                            id: playerId,
                            player: respawnPlayer
                        });
                    }
                    break;
            }
        } catch (e) {
            console.error('Error handling WebSocket message:', e);
        }
    });

    ws.on('close', () => {
        // Remove player when disconnected
        players.delete(playerId);
        broadcast({
            type: 'playerLeft',
            id: playerId
        });
    });
});

// Broadcast message to all connected clients
function broadcast(data, exclude = null) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// Fallback to index.html for Single Page Application routing (optional but neat)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

