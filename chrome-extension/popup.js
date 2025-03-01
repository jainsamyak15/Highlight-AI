let userState = {
    isConnectedToNotion: false,
    notionPages: [],
    settings: null,
    highlights: [],
    stats: {
        totalHighlights: 0,
        savedToNotion: 0
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const authContainer = document.getElementById('authContainer');
    const contentContainer = document.getElementById('contentContainer');
    const userSection = document.getElementById('userSection');
    const connectNotionBtn = document.getElementById('connectNotionBtn');
    const notionPageSelect = document.getElementById('notionPage');
    const autoSummarize = document.getElementById('autoSummarize');
    const logoutBtn = document.getElementById('logoutBtn');
    const highlightsList = document.getElementById('highlightsList');
    const highlightCount = document.getElementById('highlightCount');
    const savedCount = document.getElementById('savedCount');

    // Add loading animation to the connect button
    connectNotionBtn.addEventListener('mousedown', function() {
        this.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connecting...
        `;
    });

    checkNotionConnection();
    loadHighlights();
    updateStats();

    connectNotionBtn.addEventListener('click', handleNotionConnect);
    notionPageSelect.addEventListener('change', updateNotionPage);
    autoSummarize.addEventListener('change', updateSettings);

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

function checkNotionConnection() {
    chrome.storage.sync.get(['notionToken', 'notionPageId', 'settings'], function(result) {
        console.log("Checking Notion connection:", result);
        if (result.notionToken) {
            userState.isConnectedToNotion = true;
            userState.settings = result.settings || { autoSummarize: true };

            // Update UI based on settings
            if (userState.settings.autoSummarize !== undefined) {
                document.getElementById('autoSummarize').checked = userState.settings.autoSummarize;
            }

            showConnectedUI();
            fetchNotionPages();
        } else {
            showDisconnectedUI();
        }
    });
}

function showConnectedUI() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('contentContainer').style.display = 'block';
    document.getElementById('userSection').style.display = 'flex';

    // Add animation
    document.getElementById('contentContainer').classList.add('fade-in');
}

function showDisconnectedUI() {
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('contentContainer').style.display = 'none';
    document.getElementById('userSection').style.display = 'none';
}

async function handleNotionConnect() {
    try {
        const redirectUri = chrome.identity.getRedirectURL();
        console.log("Redirect URI:", redirectUri);

        const clientId = '1a8d872b-594c-8094-8124-0037f857249e';
        const scope = 'page:write page:read';

        const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&owner=user&scope=${scope}`;
        console.log("Auth URL:", authUrl);

        chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
        }, async function(redirectUrl) {
            if (chrome.runtime.lastError) {
                console.error("Chrome runtime error:", chrome.runtime.lastError);
                showAuthError("Authentication failed. Please try again.");
                resetConnectButton();
                return;
            }

            if (!redirectUrl) {
                console.error('No redirect URL received');
                showAuthError("No response received from Notion. Please try again.");
                resetConnectButton();
                return;
            }

            console.log("Redirect URL received:", redirectUrl);
            const url = new URL(redirectUrl);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            if (error) {
                console.error("OAuth error:", error);
                showAuthError("Notion authorization failed: " + error);
                resetConnectButton();
                return;
            }

            if (code) {
                try {
                    console.log("Exchanging code for token:", code);
                    const response = await fetch('http://localhost:8000/api/notion/exchange-token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            code,
                            redirectUri
                        })
                    });
                    console.log("Token exchange response status:", response.status);

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error("Token exchange error:", errorText);
                        showAuthError("Failed to connect with Notion. Please try again.");
                        resetConnectButton();
                        return;
                    }

                    const data = await response.json();
                    console.log("Token exchange response:", data);

                    if (data.access_token) {
                        chrome.storage.sync.set({
                            notionToken: data.access_token,
                            notionWorkspaceId: data.workspace_id,
                            notionBotId: data.bot_id
                        }, function() {
                            console.log("Notion token saved");
                            userState.isConnectedToNotion = true;
                            showConnectedUI();
                            fetchNotionPages();
                            showSuccessMessage("Successfully connected to Notion!");
                        });
                    } else {
                        console.error("No access token in response:", data);
                        showAuthError("Invalid response from Notion. Please try again.");
                        resetConnectButton();
                    }
                } catch (error) {
                    console.error('Failed to exchange token:', error);
                    showAuthError("Connection error. Please check your internet connection and try again.");
                    resetConnectButton();
                }
            }
        });
    } catch (error) {
        console.error("Error in handleNotionConnect:", error);
        showAuthError("An unexpected error occurred. Please try again.");
        resetConnectButton();
    }
}

function resetConnectButton() {
    const connectNotionBtn = document.getElementById('connectNotionBtn');
    connectNotionBtn.innerHTML = 'Connect with Notion';
}

function showAuthError(message) {
    const authContainer = document.getElementById('authContainer');
    const errorElement = document.createElement('div');
    errorElement.className = 'auth-error';
    errorElement.style.color = '#ef4444';
    errorElement.style.marginTop = '16px';
    errorElement.style.fontSize = '14px';
    errorElement.textContent = message;

    // Remove any existing error messages
    const existingError = authContainer.querySelector('.auth-error');
    if (existingError) {
        existingError.remove();
    }

    authContainer.appendChild(errorElement);

    // Remove the error message after 5 seconds
    setTimeout(() => {
        if (errorElement.parentNode) {
            errorElement.remove();
        }
    }, 5000);
}

async function fetchNotionPages() {
    try {
        chrome.storage.sync.get(['notionToken'], async function(result) {
            if (!result.notionToken) {
                console.error("No Notion token available");
                return;
            }

            console.log("Fetching Notion pages with token");
            const response = await chrome.runtime.sendMessage({
                action: 'getNotionPages'
            });

            console.log("Notion pages response:", response);
            if (response.success) {
                const notionPageSelect = document.getElementById('notionPage');
                notionPageSelect.innerHTML = '<option value="">Select a page</option>';

                response.pages.forEach(page => {
                    const option = document.createElement('option');
                    option.value = page.id;
                    option.textContent = page.title;
                    notionPageSelect.appendChild(option);
                });

                chrome.storage.sync.get(['notionPageId'], function(result) {
                    if (result.notionPageId) {
                        notionPageSelect.value = result.notionPageId;
                    }
                });
            }
        });
    } catch (error) {
        console.error('Failed to fetch Notion pages:', error);
    }
}

function updateNotionPage() {
    const pageId = document.getElementById('notionPage').value;
    console.log("Updating Notion page ID:", pageId);
    chrome.storage.sync.set({ notionPageId: pageId }, function() {
        showSuccessMessage("Default Notion page updated!");
    });
}

function updateSettings() {
    const settings = {
        autoSummarize: document.getElementById('autoSummarize').checked
    };

    console.log("Updating settings:", settings);
    chrome.storage.sync.set({ settings }, function() {
        showSuccessMessage("Settings saved!");
    });
}

function handleLogout() {
    chrome.storage.sync.remove(['notionToken', 'notionPageId', 'notionWorkspaceId', 'notionBotId'], function() {
        userState.isConnectedToNotion = false;
        showDisconnectedUI();
        showSuccessMessage("Logged out successfully");
    });
}

function showSuccessMessage(message) {
    const existingMessage = document.querySelector('.success-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageElement = document.createElement('div');
    messageElement.className = 'success-message';
    messageElement.textContent = message;
    document.body.appendChild(messageElement);

    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, 2000);
}

function loadHighlights() {
    chrome.storage.local.get(['highlights'], function(result) {
        if (result.highlights && result.highlights.length > 0) {
            userState.highlights = result.highlights;
            renderHighlights();
        } else {
            showEmptyState();
        }
    });
}

function renderHighlights() {
    const highlightsList = document.getElementById('highlightsList');
    highlightsList.innerHTML = '';

    if (userState.highlights.length === 0) {
        showEmptyState();
        return;
    }

    const sortedHighlights = [...userState.highlights].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Show only the 5 most recent highlights
    const recentHighlights = sortedHighlights.slice(0, 5);

    recentHighlights.forEach(highlight => {
        const highlightElement = document.createElement('div');
        highlightElement.className = 'highlight-item';

        const truncatedText = highlight.text.length > 150
            ? highlight.text.substring(0, 150) + '...'
            : highlight.text;

        const date = new Date(highlight.timestamp);
        const formattedDate = date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });

        highlightElement.innerHTML = `
            <div class="highlight-text">${truncatedText}</div>
            <div class="highlight-meta">
                <div class="highlight-source">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    </svg>
                    ${highlight.url ? new URL(highlight.url).hostname : 'Unknown source'}
                </div>
                <div class="highlight-date">${formattedDate}</div>
            </div>
        `;

        highlightsList.appendChild(highlightElement);
    });
}

function showEmptyState() {
    const highlightsList = document.getElementById('highlightsList');
    highlightsList.innerHTML = `
        <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No highlights yet</p>
            <button class="btn-secondary">Learn how to use Highlight.ai</button>
        </div>
    `;

    const learnButton = highlightsList.querySelector('.btn-secondary');
    learnButton.addEventListener('click', function() {
        chrome.tabs.create({ url: 'https://highlight-ai.notion.site/Getting-Started-with-Highlight-ai-f7d7e2f5b8e84a8d9b5c9f9b9b9b9b9b' });
    });
}

function updateStats() {
    chrome.storage.local.get(['highlights'], function(result) {
        if (result.highlights) {
            const totalHighlights = result.highlights.length;
            const savedToNotion = result.highlights.filter(h => h.synced).length;

            document.getElementById('highlightCount').textContent = totalHighlights;
            document.getElementById('savedCount').textContent = savedToNotion;
        }
    });
}