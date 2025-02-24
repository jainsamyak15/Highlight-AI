// Global variables for menu management
let selectedText = '';
let floatingMenu = null;

// Add scoped styles to document
const style = document.createElement('style');
style.textContent = `
  .highlight-ai-menu {
    position: fixed;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    padding: 8px;
    z-index: 2147483647;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    width: auto;
    height: auto;
    margin: 0;
    box-sizing: border-box;
  }

  .highlight-ai-button-group {
    display: flex;
    gap: 8px;
    margin: 0;
    padding: 0;
    width: auto;
    height: auto;
  }

  .highlight-ai-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    background: #f3f4f6;
    cursor: pointer;
    font-size: 14px;
    color: #374151;
    transition: background 0.2s;
    margin: 0;
    width: auto;
    height: auto;
    min-width: auto;
    line-height: normal;
  }

  .highlight-ai-button:hover {
    background: #e5e7eb;
  }

  .highlight-ai-button svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .highlight-ai-notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    padding: 16px;
    z-index: 2147483647;
    max-width: 300px;
    font-family: system-ui, -apple-system, sans-serif;
    box-sizing: border-box;
  }

  .highlight-ai-notification h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #374151;
    font-weight: 500;
    line-height: normal;
  }

  .highlight-ai-notification p {
    margin: 0;
    font-size: 14px;
    color: #6b7280;
    line-height: normal;
  }
`;
document.head.appendChild(style);
// Create floating menu element
function createFloatingMenu(x, y) {
    const menu = document.createElement('div');
    menu.className = 'highlight-ai-menu';
    menu.innerHTML = `
        <div class="highlight-ai-button-group">
            <button class="highlight-ai-button summarize">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M4 6h16M4 12h16M4 18h10" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Summarize
            </button>
            <button class="highlight-ai-button save-notion">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-width="2"/>
                </svg>
                Save to Notion
            </button>
        </div>
    `;

    // Position the menu
    menu.style.position = 'fixed';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    return menu;
}

// Handle text selection
document.addEventListener('mouseup', (e) => {
    // Ignore if target is within our menu
    if (floatingMenu && floatingMenu.contains(e.target)) {
        return;
    }

    // Remove existing menu
    if (floatingMenu) {
        floatingMenu.remove();
        floatingMenu = null;
    }

    const selection = window.getSelection();
    selectedText = selection.toString().trim();

    // Show menu only if text is selected
    if (selectedText && selectedText.length > 0) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        floatingMenu = createFloatingMenu(
            e.clientX,
            rect.top + window.scrollY - 50
        );

        document.body.appendChild(floatingMenu);
        attachMenuListeners(floatingMenu);
    }
});

// Handle clicks outside the menu
document.addEventListener('mousedown', (e) => {
    if (floatingMenu && !floatingMenu.contains(e.target)) {
        floatingMenu.remove();
        floatingMenu = null;
    }
});

// Handle menu button clicks
function attachMenuListeners(menu) {
    const summarizeBtn = menu.querySelector('.summarize');
    const notionBtn = menu.querySelector('.save-notion');

    summarizeBtn.addEventListener('click', async () => {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'summarize',
                text: selectedText
            });

            if (response.success) {
                showNotification('Summary generated!', response.summary);
            }
        } catch (error) {
            showNotification('Error', 'Failed to generate summary');
        }
    });

    notionBtn.addEventListener('click', async () => {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'save',
                text: selectedText,
                url: window.location.href
            });

            if (response.success) {
                showNotification('Success', 'Saved to Notion!');
            }
        } catch (error) {
            showNotification('Error', 'Failed to save to Notion');
        }
    });
}

// Show notification
function showNotification(title, message) {
    const notification = document.createElement('div');
    notification.className = 'highlight-ai-notification';
    notification.innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}