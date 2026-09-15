const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite Database
const db = new sqlite3.Database(path.join(__dirname, 'leaderboard.db'), (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
        db.run(`CREATE TABLE IF NOT EXISTS leaderboard (
            username TEXT PRIMARY KEY,
            score INTEGER
        )`);
    }
});

// Store connected players
const players = new Map();

// Activity Log - persists across sessions in memory
const activityLog = [];
const MAX_LOG = 200; // Keep last 200 events

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
        score: 0,
        joinTime: Date.now()
    });

    // Log the join
    activityLog.unshift({ event: 'join', username: 'Player', playerId, time: new Date().toISOString() });
    if (activityLog.length > MAX_LOG) activityLog.pop();

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
                        // Update username in log if changed
                        if (data.username && data.username !== player.username) {
                            // Patch latest join log entry for this player
                            const entry = activityLog.find(e => e.playerId === playerId && e.event === 'join');
                            if (entry) entry.username = data.username;
                        }
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
                        targetId: data.targetId,
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

                            // Save accumulated score to SQLite database
                            db.run(`INSERT INTO leaderboard (username, score) VALUES (?, ?) 
                                    ON CONFLICT(username) DO UPDATE SET score = score + ?`, 
                                    [shooter.username, points, points]);
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
        // Log leave with duration
        const p = players.get(playerId);
        if (p) {
            const durationSec = Math.round((Date.now() - (p.joinTime || Date.now())) / 1000);
            const mins = Math.floor(durationSec / 60);
            const secs = durationSec % 60;
            activityLog.unshift({
                event: 'leave',
                username: p.username,
                playerId,
                time: new Date().toISOString(),
                duration: `${mins}m ${secs}s`,
                score: p.score
            });
            if (activityLog.length > MAX_LOG) activityLog.pop();
        }
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

// Endpoint to check active player count in multiplayer
app.get('/api/players-count', (req, res) => {
    res.json({ count: players.size });
});

// Endpoint to fetch global leaderboard from SQLite
app.get('/api/leaderboard', (req, res) => {
    db.all(`SELECT username, score FROM leaderboard ORDER BY score DESC LIMIT 50`, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Endpoint to fetch activity log (recent joins/leaves)
app.get('/api/activity-log', (req, res) => {
    res.json(activityLog);
});

// Endpoint to get currently online players
app.get('/api/online', (req, res) => {
    const online = Array.from(players.values()).map(p => ({
        username: p.username,
        score: p.score,
        joinTime: new Date(p.joinTime).toISOString()
    }));
    res.json(online);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

