let selectedText = '';
let floatingMenu = null;
let dictionaryCache = new Map();

const container = document.createElement('div');
container.id = 'highlight-ai-container';
document.body.appendChild(container);

const style = document.createElement('style');
style.textContent = `
  #highlight-ai-container {
    all: initial;
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 2147483647;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }

  .highlight-ai-menu {
    all: initial;
    position: fixed;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    padding: 10px;
    z-index: 2147483647;
    pointer-events: auto;
    border: 1px solid rgba(229, 231, 235, 0.8);
    backdrop-filter: blur(8px);
    transition: all 0.2s ease;
    animation: fadeIn 0.2s ease;
  }

  .highlight-ai-menu * {
    all: revert;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }

  .highlight-ai-button-group {
    display: flex;
    gap: 8px;
    margin: 0;
    padding: 0;
  }

  .highlight-ai-button {
    all: initial;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 14px;
    border: none;
    border-radius: 8px;
    background: #f3f4f6;
    cursor: pointer;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #4b5563;
    transition: all 0.2s ease;
    pointer-events: auto;
  }

  .highlight-ai-button:hover {
    background: #e5e7eb;
    color: #111827;
    transform: translateY(-1px);
  }

  .highlight-ai-button svg {
    width: 16px;
    height: 16px;
  }

  // .highlight-ai-notification {
  //   all: initial;
  //   position: fixed;
  //   bottom: 20px;
  //   right: 20px;
  //   background: white;
  //   border-radius: 12px;
  //   box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  //   padding: 16px;
  //   z-index: 2147483647;
  //   max-width: 320px;
  //   pointer-events: auto;
  //   font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  //   border-left: 4px solid #7c3aed;
  //   animation: slideInRight 0.3s ease;
  // }

  @keyframes slideInRight {
    from { transform: translateX(30px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  // .highlight-ai-notification * {
  //   all: revert;
  //   font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  // }
  //
  // .highlight-ai-notification h4 {
  //   margin: 0 0 10px 0;
  //   font-size: 16px;
  //   color: #111827;
  //   font-weight: 600;
  //   display: flex;
  //   align-items: center;
  //   gap: 6px;
  // }
  //
  // .highlight-ai-notification h4 svg {
  //   width: 18px;
  //   height: 18px;
  //   color: #7c3aed;
  // }
  //
  // .highlight-ai-notification p {
  //   margin: 0;
  //   font-size: 14px;
  //   color: #4b5563;
  //   line-height: 1.6;
  // }
  //
  // .highlight-ai-definition {
  //   all: initial;
  //   background: white;
  //   border-radius: 12px;
  //   box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  //   padding: 16px;
  //   margin-top: 10px;
  //   font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  //   font-size: 14px;
  //   color: #374151;
  //   max-width: 320px;
  //   pointer-events: auto;
  //   border-left: 4px solid #7c3aed;
  // }
  //
  // .highlight-ai-definition * {
  //   all: revert;
  //   font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  // }
  //
  // .highlight-ai-definition h5 {
  //   margin: 0 0 10px 0;
  //   font-size: 18px;
  //   color: #111827;
  //   font-weight: 600;
  // }
  //
  // .highlight-ai-definition p {
  //   margin: 0 0 10px 0;
  //   line-height: 1.5;
  // }
  //
  // .highlight-ai-definition .pos {
  //   color: #7c3aed;
  //   font-weight: 500;
  //   font-style: normal;
  // }

  .highlight-ai-loading {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .highlight-ai-loading .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(124, 58, 237, 0.3);
    border-radius: 50%;
    border-top-color: #7c3aed;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

document.head.appendChild(style);

function createFloatingMenu(x, y) {
    const menu = document.createElement('div');
    menu.className = 'highlight-ai-menu';
    menu.innerHTML = `
        <div class="highlight-ai-button-group">
            <button class="highlight-ai-button summarize">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M4 6h16M4 12h16M4 18h10" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Summarize
            </button>
            <button class="highlight-ai-button define">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke-width="2"/>
                </svg>
                Define
            </button>
            <button class="highlight-ai-button explain">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Explain
            </button>
            <button class="highlight-ai-button save-notion">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-width="2"/>
                </svg>
                Save
            </button>
        </div>
    `;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    return menu;
}

document.addEventListener('mouseup', (e) => {
    if (floatingMenu && floatingMenu.contains(e.target)) {
        return;
    }

    if (floatingMenu) {
        floatingMenu.remove();
        floatingMenu = null;
    }

    const selection = window.getSelection();
    selectedText = selection.toString().trim();

    if (selectedText && selectedText.length > 0) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        floatingMenu = createFloatingMenu(
            e.clientX,
            rect.top + window.scrollY - 50
        );

        container.appendChild(floatingMenu);
        attachMenuListeners(floatingMenu);
    }
});

document.addEventListener('mousedown', (e) => {
    if (floatingMenu && !floatingMenu.contains(e.target)) {
        floatingMenu.remove();
        floatingMenu = null;
    }
});

async function fetchDefinition(word) {
    if (dictionaryCache.has(word)) {
        return dictionaryCache.get(word);
    }

    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error('Word not found');
        }

        const definitions = data[0].meanings.map(meaning => ({
            partOfSpeech: meaning.partOfSpeech,
            definition: meaning.definitions[0].definition
        }));

        dictionaryCache.set(word, definitions);
        return definitions;
    } catch (error) {
        console.error('Failed to fetch definition:', error);
        return null;
    }
}

function attachMenuListeners(menu) {
    const summarizeBtn = menu.querySelector('.summarize');
    const defineBtn = menu.querySelector('.define');
    const explainBtn = menu.querySelector('.explain');
    const notionBtn = menu.querySelector('.save-notion');

    summarizeBtn.addEventListener('click', async () => {
        try {
            const originalContent = summarizeBtn.innerHTML;
            summarizeBtn.innerHTML = `
                <div class="highlight-ai-loading">
                    <div class="spinner"></div>
                    Summarizing...
                </div>
            `;

            const response = await chrome.runtime.sendMessage({
                action: 'summarize',
                text: selectedText
            });

            summarizeBtn.innerHTML = originalContent;

            if (response.success) {
                showNotification('Summary', response.summary, 12000);
            }
        } catch (error) {
            summarizeBtn.innerHTML = originalContent;
            showNotification('Error', 'Failed to generate summary', 5000);
        }
    });

    defineBtn.addEventListener('click', async () => {
        try {

            const originalContent = defineBtn.innerHTML;
            defineBtn.innerHTML = `
                <div class="highlight-ai-loading">
                    <div class="spinner"></div>
                    Defining...
                </div>
            `;

            const word = selectedText.split(/\s+/)[0].toLowerCase();
            const definitions = await fetchDefinition(word);

            defineBtn.innerHTML = originalContent;

            if (definitions) {
                let definitionHtml = `<div class="highlight-ai-definition">
                    <h5>${word}</h5>`;

                definitions.forEach(def => {
                    definitionHtml += `
                        <p><span class="pos">${def.partOfSpeech}</span><br>
                        ${def.definition}</p>`;
                });

                definitionHtml += '</div>';

                showNotification('Definition', definitionHtml, 15000);
            } else {
                showNotification('Error', 'Definition not found', 5000);
            }
        } catch (error) {
            defineBtn.innerHTML = originalContent;
            showNotification('Error', 'Failed to fetch definition', 5000);
        }
    });

    explainBtn.addEventListener('click', async () => {
        try {
            const originalContent = explainBtn.innerHTML;
            explainBtn.innerHTML = `
                <div class="highlight-ai-loading">
                    <div class="spinner"></div>
                    Explaining...
                </div>
            `;

            const response = await chrome.runtime.sendMessage({
                action: 'explain',
                text: selectedText
            });

            explainBtn.innerHTML = originalContent;

            if (response.success) {
                showNotification('Explanation', response.explanation, 15000);
            }
        } catch (error) {
            explainBtn.innerHTML = originalContent;
            showNotification('Error', 'Failed to generate explanation', 5000);
        }
    });

    notionBtn.addEventListener('click', async () => {
        try {
            const originalContent = notionBtn.innerHTML;
            notionBtn.innerHTML = `
                <div class="highlight-ai-loading">
                    <div class="spinner"></div>
                    Saving...
                </div>
            `;

            chrome.storage.sync.get(['settings'], async (result) => {
                const autoSummarize = result.settings && result.settings.autoSummarize;
                let summary = null;

                if (autoSummarize) {
                    try {
                        showNotification('Processing', 'Generating summary before saving...', 3000);
                        const summaryResponse = await chrome.runtime.sendMessage({
                            action: 'summarize',
                            text: selectedText
                        });

                        if (summaryResponse.success) {
                            summary = summaryResponse.summary;
                        }
                    } catch (error) {
                        console.error('Failed to auto-summarize:', error);
                    }
                }

                const response = await chrome.runtime.sendMessage({
                    action: 'save',
                    text: selectedText,
                    summary: summary,
                    url: window.location.href,
                    title: document.title
                });

                notionBtn.innerHTML = originalContent;

                if (response.success) {
                    showNotification('Success', `
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <span style="color: #10b981; font-weight: 600;">Saved to Notion!</span>
                        </div>
                        <p>Your highlight has been successfully saved to your Notion workspace.</p>
                    `, 3000);

                    saveHighlightLocally(selectedText, summary, window.location.href, document.title);
                } else if (response.error === 'no_token') {
                    showNotification('Error', `
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span style="color: #ef4444; font-weight: 600;">Not Connected</span>
                        </div>
                        <p>Please set up Notion integration in the extension settings first.</p>
                    `, 5000);
                }
            });
        } catch (error) {
            notionBtn.innerHTML = originalContent;
            showNotification('Error', 'Failed to save to Notion', 5000);
        }
    });
}

function showNotification(title, message, duration = 3000) {
    const existingNotifications = document.querySelectorAll('.highlight-ai-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = 'highlight-ai-notification';

    let icon = '';
    if (title === 'Summary') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="21" y1="10" x2="3" y2="10"></line>
                    <line x1="21" y1="6" x2="3" y2="6"></line>
                    <line x1="21" y1="14" x2="3" y2="14"></line>
                    <line x1="21" y1="18" x2="7" y2="18"></line>
                </svg>`;
    } else if (title === 'Definition') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>`;
    } else if (title === 'Explanation') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>`;
    } else if (title === 'Success') {
        // Icon is included in the message
    } else if (title === 'Error') {
        // Icon is included in the message
    } else if (title === 'Processing') {
        icon = `<div class="spinner" style="width: 16px; height: 16px; border: 2px solid rgba(124, 58, 237, 0.3); border-radius: 50%; border-top-color: #7c3aed; animation: spin 1s linear infinite;"></div>`;
    }

    notification.innerHTML = `
        <h4>${icon} ${title}</h4>
        ${typeof message === 'string' ? `<p>${message}</p>` : message}
    `;

    container.appendChild(notification);
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 20px;
        color: #9CA3AF;
        cursor: pointer;
        padding: 0 5px;
        transition: color 0.2s;
    `;
    closeButton.addEventListener('click', () => notification.remove());
    closeButton.addEventListener('mouseover', () => closeButton.style.color = '#4B5563');
    closeButton.addEventListener('mouseout', () => closeButton.style.color = '#9CA3AF');
    notification.appendChild(closeButton);

    const timeoutId = setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);

    closeButton.addEventListener('click', () => clearTimeout(timeoutId));
}

function saveHighlightLocally(text, summary, url, title) {
    chrome.storage.local.get(['highlights'], function(result) {
        const highlights = result.highlights || [];
        highlights.push({
            text,
            summary,
            url,
            title,
            timestamp: new Date().toISOString(),
            synced: true
        });

        chrome.storage.local.set({ highlights });
    });
}

const offlineStorage = {
    async saveHighlight(highlight) {
        const highlights = await this.getHighlights();
        highlights.push({
            ...highlight,
            timestamp: new Date().toISOString(),
            synced: false
        });
        await chrome.storage.local.set({ highlights });
    },

    async getHighlights() {
        const data = await chrome.storage.local.get('highlights');
        return data.highlights || [];
    },

    async syncHighlights() {
        const highlights = await this.getHighlights();
        const unsynced = highlights.filter(h => !h.synced);

        for (const highlight of unsynced) {
            try {
                await chrome.runtime.sendMessage({
                    action: 'save',
                    text: highlight.text,
                    url: highlight.url,
                    title: highlight.title
                });

                highlight.synced = true;
            } catch (error) {
                console.error('Failed to sync highlight:', error);
            }
        }

        await chrome.storage.local.set({ highlights });
    }
};

window.addEventListener('online', () => {
    offlineStorage.syncHighlights();
});

document.addEventListener('keydown', (e) => {
    // Alt+S for summarize
    if (e.altKey && e.key === 's' && selectedText) {
        e.preventDefault();
        chrome.runtime.sendMessage({
            action: 'summarize',
            text: selectedText
        }).then(response => {
            if (response.success) {
                showNotification('Summary', response.summary, 15000);
            }
        });
    }

    if (e.altKey && e.key === 'e' && selectedText) {
        e.preventDefault();
        chrome.runtime.sendMessage({
            action: 'explain',
            text: selectedText
        }).then(response => {
            if (response.success) {
                showNotification('Explanation', response.explanation, 15000);
            }
        });
    }

    if (e.altKey && e.key === 'n' && selectedText) {
        e.preventDefault();
        chrome.storage.sync.get(['settings'], async (result) => {
            const autoSummarize = result.settings && result.settings.autoSummarize;
            let summary = null;

            if (autoSummarize) {
                try {
                    showNotification('Processing', 'Generating summary before saving...', 3000);
                    const summaryResponse = await chrome.runtime.sendMessage({
                        action: 'summarize',
                        text: selectedText
                    });

                    if (summaryResponse.success) {
                        summary = summaryResponse.summary;
                    }
                } catch (error) {
                    console.error('Failed to auto-summarize:', error);
                }
            }

            chrome.runtime.sendMessage({
                action: 'save',
                text: selectedText,
                summary: summary,
                url: window.location.href,
                title: document.title
            }).then(response => {
                if (response.success) {
                    showNotification('Success', `
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <span style="color: #10b981; font-weight: 600;">Saved to Notion!</span>
                        </div>
                        <p>Your highlight has been successfully saved to your Notion workspace.</p>
                    `, 3000);

                    saveHighlightLocally(selectedText, summary, window.location.href, document.title);
                }
            });
        });
    }
});