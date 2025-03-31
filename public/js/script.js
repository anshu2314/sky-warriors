// Game variables
let score = 0;
let health = 100;

// Update score
function updateScore(points) {
    score += points;
    document.getElementById('score').textContent = score;
}

// Update health
function updateHealth(value) {
    health = Math.max(0, Math.min(100, health + value));
    document.getElementById('health').textContent = health;
}

// Toggle leaderboard
function toggleLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.classList.toggle('active');
}

// Check if player name exists
const playerName = localStorage.getItem("playerName");
if (!playerName) {
    // Redirect to index.html if no player name
    window.location.href = "index.html";
} else {
    // Update player name display
    const playerNameElement = document.getElementById("player-name");
    if (playerNameElement) {
        playerNameElement.textContent = "Player: " + playerName;
    }
}

// Export functions for use in game.html
window.updateScore = updateScore;
window.updateHealth = updateHealth;
window.toggleLeaderboard = toggleLeaderboard;

