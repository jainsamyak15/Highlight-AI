# Highlight.ai - Smart Reading Assistant

Highlight.ai is a Chrome extension that enhances your reading experience with AI-powered features like summarization, explanation, and seamless Notion integration.

## Features

- Text Summarization: Quickly summarize selected text to get the key points
- Text Explanation: Get simplified explanations of complex content
- Notion Integration: Save highlights directly to your Notion workspace
- Dictionary Lookup: Look up definitions for selected words
- Offline Support: Save highlights even when offline

## Deployment

### Backend (Render)

The backend API is deployed on Render using the following configuration:

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the following settings:
   - Build Command: pip install -r backend/requirements.txt
   - Start Command: cd backend && python main.py
   - Environment Variables:
     - SUPABASE_URL: Your Supabase URL
     - SUPABASE_KEY: Your Supabase API key
     - TOGETHER_API_KEY: Your Together AI API key
     - NOTION_CLIENT_ID: Your Notion OAuth client ID
     - NOTION_CLIENT_SECRET: Your Notion OAuth client secret
     - NOTION_REDIRECT_URI: Your Notion OAuth redirect URI

### Chrome Extension

To publish the Chrome extension to the Chrome Web Store:

1. Zip the contents of the chrome-extension directory
2. Create a developer account on the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
3. Pay the one-time developer registration fee ($5)
4. Create a new item and upload the zip file
5. Fill in the required information:
   - Description
   - Screenshots
   - Icon
   - Privacy policy
6. Submit for review

## Development

### Backend

1. Install dependencies:
   ```
   pip install -r backend/requirements.txt
   ```
2. Set up environment variables in a .env file:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   TOGETHER_API_KEY=your_together_api_key
   NOTION_CLIENT_ID=your_notion_client_id
   NOTION_CLIENT_SECRET=your_notion_client_secret
   NOTION_REDIRECT_URI=your_notion_redirect_uri
   ```
3. Run the backend:
   ```
   cd backend
   python main.py
   ```
   
### Chrome Extension

1. Open Chrome and navigate to chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked" and select the chrome-extension directory
4. The extension should now be installed for local testing
