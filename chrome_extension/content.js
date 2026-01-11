// Extract page signals including detected file tokens
function getPageSignals() {
  const pageSignals = {
    url: location.href,
    title: document.title,
    visibleTextSample: document.body.innerText.slice(0, 4000),
    detectedTokens: []
  };

  // Detect file-like tokens
  const fileRegex = /\b[\w.-]+\.(json|js|ts|py|md|html|yaml|yml|toml)\b/gi;
  const matches = document.body.innerText.match(fileRegex) || [];
  pageSignals.detectedTokens = [...new Set(matches)];

  return pageSignals;
}

// Main function to extract text with improved handling of dynamic content
async function getArticleText() {
  // Wait a moment for JavaScript-loaded content
  await new Promise(resolve => setTimeout(resolve, 500));

  // Try to find main content elements first (in order of importance)
  const mainContentSelectors = [
    "article",
    "main",
    "[role='main']",
    "#main-content",
    ".main-content",
    ".content",
    "#content",
    // SPA and JS-framework specific selectors
    "[data-testid='centerColumn']", // Twitter/X
    ".tweetText",                   // Twitter/X tweet text
    "[data-testid='tweetText']",    // Twitter/X tweet text
    "[data-hook='content']",        // Many modern sites
    ".post-content",                // Blogs
    ".story-content",               // News sites
    ".story-body",                  // BBC and similar
    ".entry-content",               // WordPress
    ".post-body",                   // Blogger
    "[itemprop='articleBody']",     // Schema.org article markup
    ".js-content",                  // JavaScript-loaded content
  ];
  
  // Check for specific cases like YouTube
  if (window.location.hostname.includes('youtube.com')) {
    return extractYouTubeContent();
  }
  
  // Try all main content selectors
  for (const selector of mainContentSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      let combinedText = '';
      elements.forEach(el => {
        // Only include elements with substantial text
        if (el.innerText && el.innerText.trim().length > 100) {
          combinedText += el.innerText + '\n\n';
        }
      });

      if (combinedText.trim().length > 200) {
        return cleanText(combinedText);
      }
    }
  }
  
  // Check for iframes that might contain content (if same-origin)
  try {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc) {
          const iframeText = extractAllPageContent(iframeDoc);
          if (iframeText.length > 200) {
            return iframeText;
          }
        }
      } catch (e) {
        // Cross-origin iframe, can't access content - just continue
      }
    }
  } catch (e) {
    // Ignore iframe errors
  }
  
  // If no main content found, get all visible text from the page
  const allContent = extractAllPageContent(document);
  if (allContent.trim().length > 100) {
    return allContent;
  }
  
  // Last resort: Get absolutely all text from the document body
  return document.body.innerText.length > 100 ? 
    cleanText(document.body.innerText) : 
    "No meaningful content could be extracted from this page.";
}

// Extract YouTube-specific content
function extractYouTubeContent() {
  let content = '';
  
  // Get video title
  const title = document.querySelector('h1.title');
  if (title) {
    content += `[VIDEO TITLE] ${title.textContent.trim()}\n\n`;
  }
  
  // Get description
  const description = document.querySelector('#description-text');
  if (description) {
    content += `[DESCRIPTION]\n${description.textContent.trim()}\n\n`;
  }
  
  // Get comments if any
  const comments = document.querySelectorAll('#content-text');
  if (comments.length > 0) {
    content += `[TOP COMMENTS]\n`;
    Array.from(comments).slice(0, 5).forEach(comment => {
      content += `- ${comment.textContent.trim()}\n`;
    });
  }
  
  return content.trim().length > 0 ? cleanText(content) : extractAllPageContent(document);
}

// Extract all readable content from the page, document parameter allows iframe support
function extractAllPageContent(doc = document) {
  // Exclude elements that typically don't contain main content
  const ignoreSelectors = [
    "header", "footer", "nav", "[role='navigation']",
    "aside", ".sidebar", "#sidebar", 
    ".ad", ".ads", ".advertisement",
    ".menu", ".comments", "#comments", 
    "script", "style", "noscript", "svg",
    "iframe[src*='ads']", "iframe[src*='advertisement']",
    "iframe[src*='tracker']", "iframe[src*='pixel']"
  ].join(", ");
  
  const nodesToIgnore = Array.from(doc.querySelectorAll(ignoreSelectors));
  
  // Get all text nodes from the page, excluding nav, header, footer, etc.
  let textContent = '';
  
  // Get all visible elements with text content
  const visibleTextElements = Array.from(doc.body.querySelectorAll('*'))
    .filter(el => {
      // Check if element or its ancestor is in the ignore list
      if (nodesToIgnore.some(node => node.contains(el))) {
        return false;
      }
      
      // Check if element has meaningful text
      const text = el.innerText || '';
      if (text.trim().length < 20) {
        return false;
      }
      
      // Check if element is visible
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0' &&
             el.offsetWidth > 0 &&
             el.offsetHeight > 0;
    });
  
  // Group elements by their tag names for better organization
  const headings = visibleTextElements.filter(el => /^h[1-6]$/.test(el.tagName.toLowerCase()));
  const paragraphs = visibleTextElements.filter(el => el.tagName.toLowerCase() === 'p');
  const listItems = visibleTextElements.filter(el => el.tagName.toLowerCase() === 'li');
  const divs = visibleTextElements.filter(el => el.tagName.toLowerCase() === 'div' && 
                                               !headings.includes(el) && 
                                               !paragraphs.includes(el) && 
                                               !listItems.includes(el));
  
  // Process headings first
  headings.forEach(element => {
    const tagName = element.tagName.toLowerCase();
    textContent += `\n[${tagName.toUpperCase()}] ${element.innerText.trim()}\n`;
  });
  
  // Process paragraphs and other block elements
  [...paragraphs, ...divs].forEach(element => {
    // Skip if this element's content is already included in our text (as a child of another element)
    const text = element.innerText.trim();
    if (text.length >= 30 && !textContent.includes(text)) {
      textContent += `${text}\n\n`;
    }
  });
  
  // Process list items
  const listsProcessed = new Set();
  listItems.forEach(element => {
    // Check if we've already processed this list
    const parentList = element.closest('ul, ol');
    if (parentList && !listsProcessed.has(parentList)) {
      listsProcessed.add(parentList);
      
      // Get all items from this list
      const items = Array.from(parentList.querySelectorAll('li'))
        .filter(li => li.innerText.trim().length > 0)
        .map(li => `- ${li.innerText.trim()}`);
      
      if (items.length > 0) {
        textContent += items.join('\n') + '\n\n';
      }
    }
  });
  
  return cleanText(textContent);
}

function cleanText(text) {
  // Remove excessive whitespace and normalize line breaks
  return text.trim()
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/\t/g, ' ');
}

// Extract video ID from YouTube URL
function getYouTubeVideoId(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  if (!match) return null;
  return match[1];
}

// Fetch YouTube transcript - delegates to background script to avoid CORS
async function getYouTubeTranscript() {
  try {
    // Get video ID from URL
    const videoId = getYouTubeVideoId(window.location.href);
    if (!videoId) {
      console.error('Could not extract video ID from URL:', window.location.href);
      return null;
    }

    console.log('Content: Requesting transcript for video ID:', videoId);

    // Get video title
    const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title');
    const videoTitle = titleElement ? titleElement.textContent.trim() : '';

    // Send message to background script to fetch transcript (avoids CORS)
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "FETCH_YOUTUBE_TRANSCRIPT", videoId: videoId },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Content: Error sending message to background:', chrome.runtime.lastError);
            resolve({
              error: chrome.runtime.lastError.message || 'Failed to communicate with background script',
              videoTitle: videoTitle
            });
            return;
          }
          
          if (response && response.success) {
            console.log('Content: Successfully received transcript');
            resolve({
              transcript: response.transcript,
              videoTitle: videoTitle
            });
          } else {
            console.error('Content: Failed to fetch transcript:', response?.error);
            resolve({
              error: response?.error || 'Failed to fetch transcript',
              videoTitle: videoTitle
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Content: Error in getYouTubeTranscript:', error);
    return null;
  }
}

// Get full page content for docs handler
async function getFullPageContent() {
  await new Promise(resolve => setTimeout(resolve, 500)); // Wait for dynamic content
  const fullText = cleanText(document.body.innerText);
  return {
    fullText: fullText,
    pageSignals: getPageSignals()
  };
}

// Unified Console - Forward extension logs to page console
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  // Handle console log forwarding from popup/background
  if (req.type === "CONSOLE_LOG") {
    const level = req.level || 'log';
    const args = req.args || [];
    
    // Output to page console with prefix to identify source
    const prefix = req.source ? `[${req.source}]` : '[Extension]';
    const consoleMethod = console[level] || console.log;
    
    consoleMethod(prefix, ...args.map(arg => {
      // Try to parse JSON strings back to objects for better display
      try {
        return JSON.parse(arg);
      } catch {
        return arg;
      }
    }));
    
    sendResponse({ success: true });
    return false;
  }
  
  if (req.type === "GET_ARTICLE_TEXT") {
    // Need to return true for async response
    getArticleText().then(text => {
      // Get page signals including detected tokens
      const pageSignals = getPageSignals();
      sendResponse({ 
        text,
        pageSignals: pageSignals
      });
    }).catch(error => {
      console.error("Error extracting text:", error);
      // Fall back to basic extraction on error
      const basicText = document.body.innerText;
      const pageSignals = getPageSignals();
      sendResponse({ 
        text: basicText.length > 100 ? basicText : "Could not extract content from this page.",
        pageSignals: pageSignals
      });
    });
    return true; // Required for async sendResponse
  }
  
  if (req.type === "GET_YOUTUBE_TRANSCRIPT") {
    // Need to return true for async response
    getYouTubeTranscript().then(result => {
      sendResponse(result || { transcript: null });
    }).catch(error => {
      console.error("Error fetching YouTube transcript:", error);
      sendResponse({ transcript: null });
    });
    return true; // Required for async sendResponse
  }
  
  if (req.type === "GET_FULL_PAGE_CONTENT") {
    // Need to return true for async response
    getFullPageContent().then(content => {
      sendResponse(content);
    }).catch(error => {
      console.error("Error extracting full page content:", error);
      sendResponse({ fullText: null, pageSignals: getPageSignals() });
    });
    return true; // Required for async sendResponse
  }
  
});