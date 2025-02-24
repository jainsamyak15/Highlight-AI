const API_BASE_URL = 'http://localhost:8000';

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize') {
        handleSummarize(request.text)
            .then(sendResponse)
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response
    }

    if (request.action === 'save') {
        handleSave(request)
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

async function handleSave(request) {
    try {
        // Get Notion token from storage
        const settings = await chrome.storage.sync.get(['notionToken']);

        const response = await fetch(`${API_BASE_URL}/api/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                highlight: {
                    text: request.text,
                    url: request.url,
                    created_at: new Date().toISOString()
                },
                notion_token: settings.notionToken || null
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

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default settings
        chrome.storage.sync.set({
            autoSummarize: true
        });
    }
});