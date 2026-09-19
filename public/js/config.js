// Central Game & Server Configuration for GitHub Pages & Render integration
(function () {
    const RENDER_BACKEND_URL = 'https://sky-warriors-2.onrender.com';

    function getBackendUrl() {
        const customUrl = localStorage.getItem('sky_warriors_custom_server');
        if (customUrl && customUrl.trim()) {
            return customUrl.trim().replace(/\/+$/, '');
        }
        
        // If running on GitHub Pages or local file protocol, default to live Render backend
        if (window.location.hostname.includes('github.io') || window.location.protocol === 'file:') {
            return RENDER_BACKEND_URL;
        }
        
        // Default to same origin (running directly on Render host or local express server)
        return window.location.origin;
    }

    function getWsUrl() {
        const backend = getBackendUrl();
        if (backend.startsWith('https://')) {
            return backend.replace(/^https:\/\//, 'wss://');
        } else if (backend.startsWith('http://')) {
            return backend.replace(/^http:\/\//, 'ws://');
        }
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return wsProtocol + '//' + window.location.host;
    }

    async function apiFetch(path, options = {}) {
        const baseUrl = getBackendUrl();
        const url = baseUrl + (path.startsWith('/') ? path : '/' + path);
        const res = await fetch(url, options);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
    }

    window.GAME_CONFIG = {
        RENDER_BACKEND_URL: RENDER_BACKEND_URL,
        getBackendUrl: getBackendUrl,
        getWsUrl: getWsUrl,
        apiFetch: apiFetch,
        isGitHubPages: function() {
            return window.location.hostname.includes('github.io');
        }
    };
})();
