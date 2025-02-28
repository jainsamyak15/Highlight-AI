let userState = {
    isConnectedToNotion: false,
    notionPages: [],
    settings: null
};

document.addEventListener('DOMContentLoaded', function() {
    const authContainer = document.getElementById('authContainer');
    const contentContainer = document.getElementById('contentContainer');
    const connectNotionBtn = document.getElementById('connectNotionBtn');
    const notionPageSelect = document.getElementById('notionPage');
    const autoSummarize = document.getElementById('autoSummarize');

    checkNotionConnection();

    connectNotionBtn.addEventListener('click', handleNotionConnect);
    notionPageSelect.addEventListener('change', updateNotionPage);
    autoSummarize.addEventListener('change', updateSettings);
});

function checkNotionConnection() {
    chrome.storage.sync.get(['notionToken', 'notionPageId'], function(result) {
        if (result.notionToken) {
            userState.isConnectedToNotion = true;
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
}

function showDisconnectedUI() {
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('contentContainer').style.display = 'none';
}

async function handleNotionConnect() {
    // Get the redirect URL from Chrome identity
    const redirectUri = chrome.identity.getRedirectURL();
    // Replace with your actual client ID from Notion
    const clientId = 'YOUR_NOTION_CLIENT_ID';
    const scope = 'page:write page:read';

    const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&owner=user&scope=${scope}`;

    chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
    }, async function(redirectUrl) {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
        }

        if (!redirectUrl) {
            console.error('No redirect URL received');
            return;
        }

        const url = new URL(redirectUrl);
        const code = url.searchParams.get('code');

        if (code) {
            try {
                // Exchange code for access token
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

                const data = await response.json();

                if (data.access_token) {
                    chrome.storage.sync.set({
                        notionToken: data.access_token,
                        notionWorkspaceId: data.workspace_id,
                        notionBotId: data.bot_id
                    }, function() {
                        userState.isConnectedToNotion = true;
                        showConnectedUI();
                        fetchNotionPages();
                    });
                }
            } catch (error) {
                console.error('Failed to exchange token:', error);
            }
        }
    });
}

async function fetchNotionPages() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getNotionPages'
        });

        if (response.success) {
            const notionPageSelect = document.getElementById('notionPage');
            notionPageSelect.innerHTML = '<option value="">Select a page</option>';

            response.pages.forEach(page => {
                const option = document.createElement('option');
                option.value = page.id;
                option.textContent = page.title;
                notionPageSelect.appendChild(option);
            });

            // Set selected page if exists
            chrome.storage.sync.get(['notionPageId'], function(result) {
                if (result.notionPageId) {
                    notionPageSelect.value = result.notionPageId;
                }
            });
        }
    } catch (error) {
        console.error('Failed to fetch Notion pages:', error);
    }
}

function updateNotionPage() {
    const pageId = document.getElementById('notionPage').value;
    chrome.storage.sync.set({ notionPageId: pageId });
}

function updateSettings() {
    const settings = {
        autoSummarize: document.getElementById('autoSummarize').checked
    };

    chrome.storage.sync.set({ settings }, function() {
        const message = document.createElement('div');
        message.className = 'success-message';
        message.textContent = 'Settings saved!';
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 2000);
    });
}