const API_BASE_URL = 'http://localhost:8000';
let notionPageCache = null;

// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'highlight-ai',
        title: 'Highlight.ai',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        id: 'highlight-ai-summarize',
        parentId: 'highlight-ai',
        title: 'Summarize',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        id: 'highlight-ai-explain',
        parentId: 'highlight-ai',
        title: 'Explain',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        id: 'highlight-ai-save',
        parentId: 'highlight-ai',
        title: 'Save to Notion',
        contexts: ['selection']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    const text = info.selectionText;

    switch (info.menuItemId) {
        case 'highlight-ai-summarize':
            handleSummarize(text)
                .then(response => sendResponseToTab(tab.id, response))
                .catch(error => sendResponseToTab(tab.id, { success: false, error: error.message }));
            break;
        case 'highlight-ai-explain':
            handleExplain(text)
                .then(response => sendResponseToTab(tab.id, response))
                .catch(error => sendResponseToTab(tab.id, { success: false, error: error.message }));
            break;
        case 'highlight-ai-save':
            handleSave({ text, url: tab.url, title: tab.title })
                .then(response => sendResponseToTab(tab.id, response))
                .catch(error => sendResponseToTab(tab.id, { success: false, error: error.message }));
            break;
    }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'summarize':
            handleSummarize(request.text)
                .then(sendResponse)
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'explain':
            handleExplain(request.text)
                .then(sendResponse)
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'save':
            handleSave(request)
                .then(sendResponse)
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'getNotionPages':
            getNotionPages()
                .then(sendResponse)
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
    }
});

async function handleSummarize(text) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/summarize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                max_length: 200
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate summary');
        }

        const data = await response.json();
        return {
            success: true,
            summary: data.summary
        };
    } catch (error) {
        console.error('Summarization failed:', error);
        throw error;
    }
}

async function handleExplain(text) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/explain`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate explanation');
        }

        const data = await response.json();
        return {
            success: true,
            explanation: data.explanation
        };
    } catch (error) {
        console.error('Explanation failed:', error);
        throw error;
    }
}

async function handleSave(request) {
    try {
        // Get Notion token from storage
        const settings = await chrome.storage.sync.get(['notionToken', 'notionPageId']);

        if (!settings.notionToken) {
            return { success: false, error: 'no_token' };
        }

        const response = await fetch(`${API_BASE_URL}/api/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                highlight: {
                    text: request.text,
                    url: request.url,
                    title: request.title,
                    created_at: new Date().toISOString()
                },
                notion_token: settings.notionToken,
                notion_page_id: settings.notionPageId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save highlight');
        }

        const data = await response.json();
        return {
            success: true,
            highlight: data.highlight,
            notion_status: data.notion_status
        };
    } catch (error) {
        console.error('Save failed:', error);
        throw error;
    }
}

async function getNotionPages() {
    try {
        if (notionPageCache) {
            return { success: true, pages: notionPageCache };
        }

        const settings = await chrome.storage.sync.get(['notionToken']);

        if (!settings.notionToken) {
            return { success: false, error: 'no_token' };
        }

        const response = await fetch(`${API_BASE_URL}/api/notion/pages`, {
            headers: {
                'Authorization': `Bearer ${settings.notionToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch Notion pages');
        }

        const data = await response.json();
        notionPageCache = data.pages;

        return {
            success: true,
            pages: data.pages
        };
    } catch (error) {
        console.error('Failed to fetch Notion pages:', error);
        throw error;
    }
}

function sendResponseToTab(tabId, response) {
    chrome.tabs.sendMessage(tabId, {
        type: 'highlight-ai-response',
        ...response
    });
}

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default settings
        chrome.storage.sync.set({
            autoSummarize: true,
            notionToken: null,
            notionPageId: null
        });
    }
});