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
}

function showDisconnectedUI() {
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('contentContainer').style.display = 'none';
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
                return;
            }

            if (!redirectUrl) {
                console.error('No redirect URL received');
                return;
            }

            console.log("Redirect URL received:", redirectUrl);
            const url = new URL(redirectUrl);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            if (error) {
                console.error("OAuth error:", error);
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
                        });
                    } else {
                        console.error("No access token in response:", data);
                    }
                } catch (error) {
                    console.error('Failed to exchange token:', error);
                }
            }
        });
    } catch (error) {
        console.error("Error in handleNotionConnect:", error);
    }
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
    chrome.storage.sync.set({ notionPageId: pageId });
}

function updateSettings() {
    const settings = {
        autoSummarize: document.getElementById('autoSummarize').checked
    };

    console.log("Updating settings:", settings);
    chrome.storage.sync.set({ settings }, function() {
        const message = document.createElement('div');
        message.className = 'success-message';
        message.textContent = 'Settings saved!';
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 2000);
    });
}