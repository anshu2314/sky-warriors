/*!
 * Sky Warriors 2 — Economy, Jet Shop & Quest Engine
 * All data persisted forever in localStorage.
 */
(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    // JET ROSTER  (6 jets — starter Falcon is free)
    // ─────────────────────────────────────────────────────────────
    var JETS = [
        {
            id: 'falcon', name: 'Falcon', cost: 0, rarity: 'COMMON',
            color: 0x4488ff, bodyColor: 0x1a2d55,
            speed: 1.0, health: 1.0, damage: 1.0, boost: 1.0,
            desc: 'F-22 class air-superiority fighter. Balanced tactical performance.',
            svgColors: { body: '#4488ff', wing: '#1a2d55', cockpit: '#88ccff', glow: '#00aaff' }
        },
        {
            id: 'viper', name: 'Viper', cost: 200, rarity: 'UNCOMMON',
            color: 0x00ffcc, bodyColor: 0x004433,
            speed: 1.15, health: 0.9, damage: 1.1, boost: 1.15,
            desc: 'Su-47 forward-swept wing interceptor. Razor agility & canard control.',
            svgColors: { body: '#00ffcc', wing: '#004433', cockpit: '#88ffee', glow: '#00ffaa' }
        },
        {
            id: 'phantom', name: 'Phantom', cost: 500, rarity: 'RARE',
            color: 0xcc00ff, bodyColor: 0x330033,
            speed: 0.95, health: 1.25, damage: 1.2, boost: 0.9,
            desc: 'Heavy assault compound delta wing. Armored hull & quad missile pylons.',
            svgColors: { body: '#cc00ff', wing: '#330033', cockpit: '#ee88ff', glow: '#aa00ff' }
        },
        {
            id: 'raptor', name: 'Fire Raptor', cost: 1000, rarity: 'RARE',
            color: 0xff6600, bodyColor: 0x331100,
            speed: 1.2, health: 1.05, damage: 1.3, boost: 1.2,
            desc: 'Twin-engine strike fighter. Dual outward-canted tails & wingtip missiles.',
            svgColors: { body: '#ff6600', wing: '#331100', cockpit: '#ffaa44', glow: '#ff4400' }
        },
        {
            id: 'nova', name: 'Nova', cost: 2500, rarity: 'EPIC',
            color: 0xffee00, bodyColor: 0x333300,
            speed: 1.3, health: 1.15, damage: 1.35, boost: 1.3,
            desc: 'Hypersonic wave-rider. Mach 5+ chine lifting body & drooped wingtips.',
            svgColors: { body: '#ffee00', wing: '#333300', cockpit: '#fff488', glow: '#ffcc00' }
        },
        {
            id: 'shadow', name: 'Shadow B-2', cost: 5000, rarity: 'LEGENDARY',
            color: 0xff0066, bodyColor: 0x16181f,
            speed: 1.4, health: 1.3, damage: 1.5, boost: 1.4,
            desc: 'Legendary B-2 Stealth Bomber flying wing. Radar-invisible apex predator.',
            svgColors: { body: '#ff0066', wing: '#16181f', cockpit: '#ff88aa', glow: '#ff0044' }
        }
    ];

    // ─────────────────────────────────────────────────────────────
    // QUEST DEFINITIONS
    // ─────────────────────────────────────────────────────────────
    var QUESTS = [
        { id: 'q_kill5',    title: 'First Blood',    icon: '🩸', desc: 'Shoot down 5 enemy jets in Single Player',   type: 'kills',   target: 5,   reward: 25 },
        { id: 'q_kill25',   title: 'Ace Pilot',      icon: '🎖️', desc: 'Shoot down 25 enemy jets in Single Player',  type: 'kills',   target: 25,  reward: 100 },
        { id: 'q_special5', title: 'Missile Master', icon: '🚀', desc: 'Fire your special attack 5 times',           type: 'special', target: 5,   reward: 30 },
        { id: 'q_survive3', title: 'Iron Wing',      icon: '🛡️', desc: 'Survive 3 minutes in one session',          type: 'survive', target: 180, reward: 40 },
        { id: 'q_boost60',  title: 'Speed Demon',    icon: '⚡', desc: 'Use afterburner for 60 total seconds',       type: 'boost',   target: 60,  reward: 35 },
        { id: 'q_score500', title: 'Score Chaser',   icon: '🏆', desc: 'Reach 500 score in Single Player mode',     type: 'score',   target: 500, reward: 75 }
    ];

    // ─────────────────────────────────────────────────────────────
    // STORAGE KEYS
    // ─────────────────────────────────────────────────────────────
    var K = {
        COINS:         'sw2_coins',
        OWNED:         'sw2_owned_jets',
        EQUIPPED:      'sw2_equipped_jet',
        QUEST_PROG:    'sw2_quest_prog',
        QUEST_CLAIMED: 'sw2_quest_claimed',
        SP_HIGHSCORE:  'sw2_sp_highscore',
        SP_KILLS:      'sw2_sp_kills',
        SP_LB:         'sw2_sp_lb'
    };

    // ─────────────────────────────────────────────────────────────
    // COIN WALLET
    // ─────────────────────────────────────────────────────────────
    function getCoins() { return parseInt(localStorage.getItem(K.COINS) || '0', 10); }
    function addCoins(n) {
        var next = getCoins() + (n | 0);
        localStorage.setItem(K.COINS, next);
        return next;
    }
    function spendCoins(n) {
        var c = getCoins();
        if (c < n) return false;
        localStorage.setItem(K.COINS, c - n);
        return true;
    }

    // ─────────────────────────────────────────────────────────────
    // JET MANAGEMENT
    // ─────────────────────────────────────────────────────────────
    function getOwnedJets() {
        try {
            var arr = JSON.parse(localStorage.getItem(K.OWNED) || '["falcon"]');
            if (!arr.includes('falcon')) arr.push('falcon');
            return arr;
        } catch (e) { return ['falcon']; }
    }
    function ownsJet(id) { return getOwnedJets().includes(id); }
    function buyJet(id) {
        var jet = JETS.find(function(j) { return j.id === id; });
        if (!jet) return { ok: false, msg: 'Unknown jet' };
        if (ownsJet(id)) return { ok: false, msg: 'Already owned' };
        if (!spendCoins(jet.cost)) return { ok: false, msg: 'Not enough coins' };
        var owned = getOwnedJets(); owned.push(id);
        localStorage.setItem(K.OWNED, JSON.stringify(owned));
        return { ok: true };
    }
    function getEquippedJet() {
        var id = localStorage.getItem(K.EQUIPPED) || 'falcon';
        return JETS.find(function(j) { return j.id === id; }) || JETS[0];
    }
    function equipJet(id) {
        if (!ownsJet(id)) return false;
        localStorage.setItem(K.EQUIPPED, id);
        return true;
    }

    // ─────────────────────────────────────────────────────────────
    // QUEST SYSTEM
    // ─────────────────────────────────────────────────────────────
    function getQuestProgress() {
        try { return JSON.parse(localStorage.getItem(K.QUEST_PROG) || '{}'); } catch(e) { return {}; }
    }
    function getQuestClaimed() {
        try { return JSON.parse(localStorage.getItem(K.QUEST_CLAIMED) || '{}'); } catch(e) { return {}; }
    }
    function incrementQuestStat(type, amount) {
        amount = amount || 1;
        var prog = getQuestProgress();
        var claimed = getQuestClaimed();
        QUESTS.forEach(function(q) {
            if (q.type === type && !claimed[q.id]) {
                prog[q.id] = Math.min((prog[q.id] || 0) + amount, q.target * 2);
            }
        });
        localStorage.setItem(K.QUEST_PROG, JSON.stringify(prog));
    }
    function isQuestComplete(id) {
        var q = QUESTS.find(function(q) { return q.id === id; });
        if (!q) return false;
        return (getQuestProgress()[id] || 0) >= q.target;
    }
    function isQuestClaimed(id) { return !!getQuestClaimed()[id]; }
    function claimQuest(id) {
        if (!isQuestComplete(id) || isQuestClaimed(id)) return false;
        var q = QUESTS.find(function(q) { return q.id === id; });
        if (!q) return false;
        addCoins(q.reward);
        var claimed = getQuestClaimed(); claimed[id] = true;
        localStorage.setItem(K.QUEST_CLAIMED, JSON.stringify(claimed));
        return q.reward;
    }

    // ─────────────────────────────────────────────────────────────
    // SINGLE PLAYER STATS & LEADERBOARD
    // ─────────────────────────────────────────────────────────────
    function getSPHighScore() { return parseInt(localStorage.getItem(K.SP_HIGHSCORE) || '0', 10); }
    function updateSPHighScore(score) {
        if (score > getSPHighScore()) { localStorage.setItem(K.SP_HIGHSCORE, score); return true; }
        return false;
    }
    function getSPTotalKills() { return parseInt(localStorage.getItem(K.SP_KILLS) || '0', 10); }
    function addSPKills(n) { localStorage.setItem(K.SP_KILLS, getSPTotalKills() + (n || 1)); }
    function getSPLeaderboard() {
        try { return JSON.parse(localStorage.getItem(K.SP_LB) || '[]'); } catch(e) { return []; }
    }
    function submitSPScore(username, score) {
        if (!score || score <= 0) return;
        updateSPHighScore(score);
        var lb = getSPLeaderboard();
        lb.push({ username: username, score: score, date: new Date().toLocaleDateString() });
        lb.sort(function(a, b) { return b.score - a.score; });
        lb.splice(10);
        localStorage.setItem(K.SP_LB, JSON.stringify(lb));
    }

    // ─────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────
    window.ECONOMY = {
        JETS: JETS,
        QUESTS: QUESTS,
        getCoins: getCoins,
        addCoins: addCoins,
        spendCoins: spendCoins,
        getOwnedJets: getOwnedJets,
        ownsJet: ownsJet,
        buyJet: buyJet,
        getEquippedJet: getEquippedJet,
        equipJet: equipJet,
        getQuestProgress: getQuestProgress,
        getQuestClaimed: getQuestClaimed,
        incrementQuestStat: incrementQuestStat,
        isQuestComplete: isQuestComplete,
        isQuestClaimed: isQuestClaimed,
        claimQuest: claimQuest,
        getSPHighScore: getSPHighScore,
        updateSPHighScore: updateSPHighScore,
        getSPTotalKills: getSPTotalKills,
        addSPKills: addSPKills,
        getSPLeaderboard: getSPLeaderboard,
        submitSPScore: submitSPScore
    };
})();
