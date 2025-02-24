// State management
let userState = {
    isAuthenticated: false,
    email: null,
    settings: null,
    highlights: []
};

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    const authContainer = document.getElementById('authContainer');
    const contentContainer = document.getElementById('contentContainer');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userEmail = document.getElementById('userEmail');
    const defaultLocation = document.getElementById('defaultLocation');
    const autoSummarize = document.getElementById('autoSummarize');
    const highlightsList = document.getElementById('highlightsList');

    // Initialize
    checkAuthState();

    // Event Listeners
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    defaultLocation.addEventListener('change', updateSettings);
    autoSummarize.addEventListener('change', updateSettings);

    // Load user settings from storage
    chrome.storage.sync.get(['settings'], function(result) {
        if (result.settings) {
            defaultLocation.value = result.settings.defaultLocation || 'notion';
            autoSummarize.checked = result.settings.autoSummarize || false;
        }
    });
});

function checkAuthState() {
    chrome.storage.sync.get(['authToken', 'userEmail'], function(result) {
        if (result.authToken && result.userEmail) {
            userState.isAuthenticated = true;
            userState.email = result.userEmail;
            showAuthenticatedUI();
            loadHighlights();
        } else {
            showUnauthenticatedUI();
        }
    });
}

function showAuthenticatedUI() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('contentContainer').style.display = 'block';
    document.getElementById('userEmail').textContent = userState.email;
    updateStats();
}

function showUnauthenticatedUI() {
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('contentContainer').style.display = 'none';
}

async function handleLogin() {
    try {
        // Launch Google OAuth flow
        chrome.identity.getAuthToken({ interactive: true }, function(token) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }

            // Get user info from Google
            fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(response => response.json())
            .then(data => {
                chrome.storage.sync.set({
                    authToken: token,
                    userEmail: data.email
                }, function() {
                    userState.isAuthenticated = true;
                    userState.email = data.email;
                    showAuthenticatedUI();
                });
            });
        });
    } catch (error) {
        console.error('Login failed:', error);
    }
}

function handleLogout() {
    chrome.storage.sync.remove(['authToken', 'userEmail'], function() {
        userState.isAuthenticated = false;
        userState.email = null;
        showUnauthenticatedUI();
    });
}

function updateSettings() {
    const settings = {
        defaultLocation: document.getElementById('defaultLocation').value,
        autoSummarize: document.getElementById('autoSummarize').checked
    };

    chrome.storage.sync.set({ settings }, function() {
        // Show success message
        const message = document.createElement('div');
        message.className = 'success-message';
        message.textContent = 'Settings saved!';
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 2000);
    });
}

async function loadHighlights() {
    try {
        const response = await fetch('https://api.highlight.ai/highlights', {
            headers: {
                'Authorization': `Bearer ${await chrome.storage.sync.get(['authToken'])}`
            }
        });
        const highlights = await response.json();

        const highlightsList = document.getElementById('highlightsList');
        highlightsList.innerHTML = highlights.slice(0, 5).map(highlight => `
            <div class="highlight-item">
                <p class="highlight-text">${highlight.text.substring(0, 100)}...</p>
                <div class="highlight-meta">
                    <span class="highlight-date">${new Date(highlight.created_at).toLocaleDateString()}</span>
                    <span class="highlight-source">${new URL(highlight.url).hostname}</span>
                </div>
            </div>
        `).join('');

        updateStats(highlights);
    } catch (error) {
        console.error('Failed to load highlights:', error);
    }
}

function updateStats(highlights = []) {
    const today = new Date().toDateString();
    const todayCount = highlights.filter(h =>
        new Date(h.created_at).toDateString() === today
    ).length;

    document.getElementById('todayCount').textContent = todayCount;
    document.getElementById('totalCount').textContent = highlights.length;
}