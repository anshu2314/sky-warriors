const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

// Store connected players
const players = new Map();

server.on('connection', (ws) => {
    // Generate a unique ID for the player
    const playerId = Math.random().toString(36).substr(2, 9);
    
    // Store player data
    players.set(playerId, {
        id: playerId,
        position: { x: 0, y: 0.5, z: 0 },
        rotation: { x: 0, y: Math.PI, z: 0 },
        speed: 0,
        isAirborne: false,
        username: 'Player'
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
        const data = JSON.parse(message);
        
        switch(data.type) {
            case 'update':
                // Update player position and state
                const player = players.get(playerId);
                if (player) {
                    player.position = data.position;
                    player.rotation = data.rotation;
                    player.speed = data.speed;
                    player.isAirborne = data.isAirborne;
                    player.username = data.username;
                    
                    // Broadcast update to other players
                    broadcast({
                        type: 'playerUpdate',
                        id: playerId,
                        player: player
                    }, ws);
                }
                break;
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

// Broadcast message to all connected clients except sender
function broadcast(data, exclude = null) {
    server.clients.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

console.log('WebSocket server running on port 8080');
