# Jumpbot: AI access for any website!

A Chrome extension that provides AI-powered summarization, Q&A, and content analysis for any webpage using OpenRouter's AI models.

## Features

- **Brief Summary**: Quick 2-3 sentence summaries
- **Detailed Summary**: Comprehensive summaries with enhanced content extraction
- **YouTube Transcript**: Fetch and analyze YouTube video transcripts
- **Docs Handler**: Interactive Q&A about page content with phrase highlighting
- **Chat Interface**: Ask questions about summaries/transcripts
- **Text Highlighting**: Highlight relevant phrases on the page
- **Side Panel**: Full-height interface for extended use

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the project directory

## Configuration

### API Key

The extension uses OpenRouter API with `google/gemma-3-27b-it:free` model. The API key is currently hardcoded in `popup.js` (line 2). To use your own key:

1. Get an API key from [OpenRouter](https://openrouter.ai/)
2. Replace the `apiKey` constant in `popup.js`

### Web Scraper Service (Optional)

For "Detailed Summary" feature, deploy the web scraper service:

1. See `tools/README.md` for deployment instructions
2. Deploy to Render (or any Docker host)
3. Update `tools/scrape.js` with your service URL

## Usage

1. Navigate to any webpage
2. Click the extension icon
3. Select a summary type:
   - **Brief Summary**: Quick overview
   - **Detailed Summary**: Full analysis (requires scraper service)
   - **YouTube Transcript**: Extract video transcripts
   - **Docs Handler**: Interactive Q&A about page content
4. Click "Summarize This Page"
5. Use the chat interface to ask follow-up questions
6. Click "Highlight on Page" (Docs Handler) to highlight relevant phrases


## API Integration

The extension uses:
- **OpenRouter API**: `https://openrouter.ai/api/v1/chat/completions`
- **Model**: `google/gemma-3-27b-it:free`
- **YouTube Transcript API**: `youtube-transcript.io` (via background script)

## Permissions

- `scripting`: Inject content scripts
- `activeTab`: Access current tab content
- `storage`: Store user preferences
- `sidePanel`: Open side panel interface
- `tabs`: Monitor tab changes
- `host_permissions`: Access all URLs for content extraction

## License
MIT

