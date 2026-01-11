// OpenRouter API key (hardcoded)
const apiKey = "";

// Unified Console - Forward popup logs to active tab's console
(function() {
  'use strict';
  
  const originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
  };
  
  function forwardToPageConsole(level, args) {
    // Call original console first (for popup DevTools)
    originalConsole[level](...args);
    
    // Forward to active tab's console via content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'CONSOLE_LOG',
          level: level,
          source: 'Popup',
          args: args.map(arg => {
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg, null, 2);
              } catch (e) {
                return String(arg);
              }
            }
            return String(arg);
          })
        }).catch(() => {
          // Ignore errors if content script isn't available
        });
      }
    });
  }
  
  console.log = function(...args) {
    forwardToPageConsole('log', args);
  };
  
  console.error = function(...args) {
    forwardToPageConsole('error', args);
  };
  
  console.warn = function(...args) {
    forwardToPageConsole('warn', args);
  };
  
  console.info = function(...args) {
    forwardToPageConsole('info', args);
  };
  
  console.debug = function(...args) {
    forwardToPageConsole('debug', args);
  };
})();

// Update page info display
function updatePageInfo(tab) {
      const titleEl = document.getElementById('page-title');
      const urlEl = document.getElementById('page-url');
      
  if (titleEl && tab) titleEl.textContent = tab.title || 'Unknown Page';
  if (urlEl && tab) urlEl.textContent = tab.url || '';
      
      // Store the tab info to use later when copying
  if (tab) {
      window.currentTabInfo = {
        title: tab.title,
        url: tab.url
      };
  }
}

// Check if we're in side panel
function isSidePanel() {
  // Check if sidepanel.html is loaded
  return window.location.pathname.includes('sidepanel') || 
         window.location.href.includes('sidepanel.html') ||
         document.querySelector('body')?.getAttribute('data-sidepanel') !== null;
}

// Display current tab info when popup/sidepanel opens
document.addEventListener('DOMContentLoaded', () => {
  // Initial load - get current tab
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) {
      updatePageInfo(tab);
    }
  });

  // Add side panel button handler if it exists (only in popup)
  const openSidePanelBtn = document.getElementById('open-sidepanel-btn');
  if (openSidePanelBtn) {
    openSidePanelBtn.addEventListener('click', async () => {
      try {
        const currentWindow = await chrome.windows.getCurrent();
        await chrome.sidePanel.open({ windowId: currentWindow.id });
        // Popup will close automatically when it loses focus
      } catch (error) {
        console.error('Error opening side panel:', error);
        // Fallback: try sending message to background
        try {
          const currentWindow = await chrome.windows.getCurrent();
          chrome.runtime.sendMessage({
            type: "OPEN_SIDE_PANEL",
            windowId: currentWindow.id
          });
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
    });
  }

  // Initialize chat functionality
  initChat();

  // For side panel: Listen for tab changes to update page info dynamically
  if (isSidePanel()) {
    // Listen for tab activation (when user switches tabs)
    chrome.tabs.onActivated.addListener((activeInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab && !chrome.runtime.lastError) {
          updatePageInfo(tab);
          // Clear previous summary when tab changes
          const resultDiv = document.getElementById('result');
          if (resultDiv) {
            resultDiv.innerHTML = 'Tab changed. Select a summary type and click \'Summarize This Page\' to generate a summary for the new page.';
          }
          // Hide chat section
          const chatSection = document.getElementById('chat-section');
          if (chatSection) {
            chatSection.style.display = 'none';
          }
          // Clear chat history
          window.currentSummary = null;
          window.chatHistory = [];
    }
  });
});

    // Listen for tab updates (when page loads/changes)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.active) {
        chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
          if (activeTab && activeTab.id === tabId) {
            updatePageInfo(activeTab);
            // Optionally clear summary on page change
            if (changeInfo.url) {
              const resultDiv = document.getElementById('result');
              if (resultDiv) {
                resultDiv.innerHTML = 'Page changed. Select a summary type and click \'Summarize This Page\' to generate a summary for the new page.';
              }
              // Hide chat section
              const chatSection = document.getElementById('chat-section');
              if (chatSection) {
                chatSection.style.display = 'none';
              }
              // Clear chat history
              window.currentSummary = null;
              window.chatHistory = [];
            }
          }
        });
      }
    });

    // Periodically check for tab changes (fallback)
    setInterval(() => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab && (!window.currentTabInfo || window.currentTabInfo.url !== tab.url)) {
          updatePageInfo(tab);
          // Clear summary if URL changed
          const resultDiv = document.getElementById('result');
          if (resultDiv && window.currentTabInfo && window.currentTabInfo.url !== tab.url) {
            resultDiv.innerHTML = 'Tab changed. Select a summary type and click \'Summarize This Page\' to generate a summary for the new page.';
          }
          // Hide chat section
          const chatSection = document.getElementById('chat-section');
          if (chatSection) {
            chatSection.style.display = 'none';
          }
          // Clear chat history
          window.currentSummary = null;
          window.chatHistory = [];
        }
      });
    }, 1000); // Check every second
  }
});

// Scrape website using local API (for detailed summaries)
async function scrapeWebsite(url) {
  try {
    const res = await fetch("http://localhost:8000/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    return await res.json();
  } catch (error) {
    console.error('Error scraping website:', error);
    throw error;
  }
}

document.getElementById("summarize").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = '<div class="loading"><div class="loader"></div></div>';

  const summaryType = document.getElementById("summary-type").value;

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (!tab) {
      resultDiv.innerHTML = "Error: Could not access the current tab.";
        return;
      }

      // Check if this is a special page (like chrome://, chrome-extension://, etc.)
      const isSpecialPage = tab.url.startsWith('chrome://') || 
                           tab.url.startsWith('chrome-extension://') ||
                           tab.url.startsWith('about:') ||
                           tab.url.startsWith('file:') ||
                           tab.url.startsWith('data:') ||
                           tab.url.startsWith('view-source:');
      
      if (isSpecialPage) {
      resultDiv.innerHTML = "This extension cannot access browser special pages (chrome://, chrome-extension://, about:, etc.)";
      return;
    }

    // Handle Docs Handler option
    if (summaryType === "docs-handler") {
      // Show docs handler interface
      resultDiv.innerHTML = `
        <div style="padding: 20px;">
          <h3 style="margin-bottom: 15px; color: #333;">Documentation Handler</h3>
          <p style="color: #666; margin-bottom: 20px;">
            Ask questions about this page. The AI will answer based on the full page content.
          </p>
          <div id="docs-chat-messages" style="height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 15px; margin-bottom: 15px; background-color: #f9f9f9; max-height: 400px;">
            <div style="color: #666; font-style: italic; text-align: center; padding: 20px;">
              Loading page context... This may take a moment.
            </div>
          </div>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="docs-chat-input" placeholder="Ask a question about this page..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;" />
            <button id="docs-chat-send-btn" style="padding: 10px 20px; background-color: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Ask</button>
          </div>
        </div>
      `;
      
      // Initialize docs handler
      initDocsHandler(tab.id);
      
      // Hide the regular chat section for docs handler
      const chatSection = document.getElementById('chat-section');
      if (chatSection) {
        chatSection.style.display = 'none';
      }
      
      return;
    }

    // Handle YouTube transcript option
    if (summaryType === "youtube-transcript") {
      const isYouTube = tab.url && (tab.url.includes('youtube.com/watch') || tab.url.includes('youtu.be/'));
      
      if (!isYouTube) {
        resultDiv.innerHTML = "YouTube Transcript option is only available on YouTube video pages.";
        return;
      }
      
      // Set a timeout
      const timeoutId = setTimeout(() => {
        resultDiv.innerHTML = 
          "The transcript is taking too long to load. This could be because:<br>" +
          "1. The video doesn't have captions/transcripts available<br>" +
          "2. The page is still loading<br>" +
          "3. YouTube's transcript API is not accessible";
      }, 20000); // 20 second timeout for transcript

      try {
        // Send message to content script to fetch transcript
        chrome.tabs.sendMessage(
          tab.id,
          { type: "GET_YOUTUBE_TRANSCRIPT" },
          (res) => {
            clearTimeout(timeoutId);
            
            if (chrome.runtime.lastError) {
              resultDiv.innerHTML = 
                "Could not access YouTube page. This may happen if:<br>" +
                "1. The page is still loading<br>" +
                "2. The extension was recently installed (try refreshing the page)<br>" +
                "3. The site blocks content scripts<br><br>" +
                "Try refreshing the page and try again.";
              return;
            }
            
            if (!res) {
              resultDiv.innerHTML =
                "Could not fetch transcript. This might happen if:<br>" +
                "1. The video doesn't have captions/transcripts available<br>" +
                "2. The captions are disabled for this video<br>" +
                "3. The video is private or restricted<br>" +
                "4. The API service is temporarily unavailable<br><br>" +
                "Note: Only videos with available captions can have their transcripts extracted.";
              return;
            }
            
            // Check for error in response
            if (res.error) {
              resultDiv.innerHTML = 
                `Error fetching transcript: ${res.error}<br><br>` +
                "This might happen if:<br>" +
                "1. The video doesn't have captions/transcripts available<br>" +
                "2. The API service is temporarily unavailable<br>" +
                "3. The video ID is invalid";
              return;
            }
            
            if (!res.transcript || res.transcript.trim().length === 0) {
              resultDiv.innerHTML =
                "Could not fetch transcript. This might happen if:<br>" +
                "1. The video doesn't have captions/transcripts available<br>" +
                "2. The captions are disabled for this video<br>" +
                "3. The video is private or restricted<br><br>" +
                "Note: Only videos with available captions can have their transcripts extracted.";
              return;
            }

            // Display the transcript with markdown formatting
            const formattedTranscript = formatTranscript(res.transcript, res.videoTitle);
            resultDiv.innerHTML = renderMarkdown(formattedTranscript);
            
            // Store transcript for chat and show chat section
            window.currentSummary = res.transcript;
            showChatSection();
          }
        );
      } catch (error) {
        clearTimeout(timeoutId);
        resultDiv.innerHTML = `Error: ${error.message || "Failed to fetch transcript."}`;
      }
        return;
      }
      
      // Set a timeout to handle cases where the content script doesn't respond
      const timeoutId = setTimeout(() => {
      resultDiv.innerHTML = 
        "The page is taking too long to respond. This could be because:<br>" +
        "1. The page has complex content that's taking time to process<br>" +
        "2. The extension doesn't have permission to access this site<br>" +
          "3. The page uses a security framework that blocks content scripts";
      }, 15000); // 15 second timeout
      
      // Send message to content script
      chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_ARTICLE_TEXT" },
        async (res) => {
          // Clear the timeout since we got a response
          clearTimeout(timeoutId);
          
          if (chrome.runtime.lastError) {
          resultDiv.innerHTML = 
            "Could not access page content. This may happen if:<br>" +
            "1. The page is still loading<br>" +
            "2. The extension was recently installed (try refreshing the page)<br>" +
            "3. The site blocks content scripts<br><br>" +
              "Try refreshing the page and try again.";
            return;
          }
          
          if (!res || !res.text || res.text.trim().length < 50) {
          resultDiv.innerHTML =
            "Could not extract enough meaningful content from this page. This might happen if:<br>" +
            "1. The page content is loaded dynamically with JavaScript<br>" +
            "2. The page has restricted access to its content<br>" +
              "3. The page might not have much text content";
            return;
          }

          try {
          let textToSummarize = res.text;
          let pageInfo = {
              title: tab.title || '',
            url: tab.url || '',
            pageSignals: res.pageSignals || null
          };
          
          // For detailed summaries, use scrape.js if available
          if (summaryType === "detailed") {
            try {
              resultDiv.innerHTML = '<div class="loading"><div class="loader"></div><div style="margin-top: 10px; text-align: center;">Scraping page with enhanced extraction...</div></div>';
              
              const scrapedData = await scrapeWebsite(tab.url);
              
              // Use scraped data
              textToSummarize = scrapedData.text || res.text;
              pageInfo = {
                title: scrapedData.title || tab.title || '',
                url: scrapedData.url || tab.url || '',
                pageSignals: {
                  ...pageInfo.pageSignals,
                  mentioned_files: scrapedData.mentioned_files || []
                }
              };
              
              // Update result div to show scraping was successful
              resultDiv.innerHTML = '<div class="loading"><div class="loader"></div><div style="margin-top: 10px; text-align: center;">Generating detailed summary...</div></div>';
            } catch (scrapeError) {
              console.warn('Scraping failed, using regular extraction:', scrapeError);
              // Fall back to regular extraction if scraping fails
              // Continue with existing res.text and pageInfo
            }
          }
          
          const summary = await getOpenRouterSummary(
            textToSummarize,
              summaryType,
            apiKey,
              pageInfo
            );
          resultDiv.innerHTML = renderMarkdown(summary);
          
          // Store summary for chat and show chat section
          window.currentSummary = summary;
          showChatSection();
          } catch (error) {
          resultDiv.innerHTML = `Error: ${
              error.message || "Failed to generate summary."
            }`;
          }
        }
      );
    });
  });

// Format transcript for display
function formatTranscript(transcript, videoTitle = '') {
  let formatted = '';
  if (videoTitle) {
    formatted += `# ${videoTitle}\n\n`;
  }
  formatted += '## Transcript\n\n';
  formatted += transcript;
  return formatted;
}

document.getElementById("copy-btn").addEventListener("click", () => {
  // Get the raw markdown text from the result div's text content
  const summaryText = document.getElementById("result").innerText;

  if (summaryText && summaryText.trim() !== "" && summaryText !== "Select a summary type and click 'Summarize This Page' to generate a summary.") {
    // Include page title and URL in the copied text
    const pageInfo = window.currentTabInfo || {};
    const titleText = pageInfo.title ? `Title: ${pageInfo.title}\n` : '';
    const urlText = pageInfo.url ? `URL: ${pageInfo.url}\n\n` : '';
    
    const textToCopy = `${titleText}${urlText}${summaryText}`;
    
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        const copyBtn = document.getElementById("copy-btn");
        const originalText = copyBtn.innerText;

        copyBtn.innerText = "Copied!";
        setTimeout(() => {
          copyBtn.innerText = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  }
});

// Simple markdown renderer
function renderMarkdown(text) {
  if (!text) return '';
  
  let html = text;
  
  // Escape HTML first to prevent XSS (but preserve code blocks)
  // First, protect code blocks
  const codeBlocks = [];
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const id = `__CODEBLOCK_${codeBlocks.length}__`;
    codeBlocks.push(match);
    return id;
  });
  
  // Escape HTML
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(`__CODEBLOCK_${i}__`, block);
  });
  
  // Process code blocks
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    // Escape HTML in code
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre><code>${escapedCode}</code></pre>`;
  });
  
  // Split into lines for processing
  const lines = html.split('\n');
  const processedLines = [];
  let inList = false;
  let listType = null; // 'ul' or 'ol'
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Headers
    if (trimmed.match(/^###\s+(.+)$/)) {
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      processedLines.push(`<h3>${trimmed.replace(/^###\s+/, '')}</h3>`);
      continue;
    }
    if (trimmed.match(/^##\s+(.+)$/)) {
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      processedLines.push(`<h2>${trimmed.replace(/^##\s+/, '')}</h2>`);
      continue;
    }
    if (trimmed.match(/^#\s+(.+)$/)) {
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      processedLines.push(`<h1>${trimmed.replace(/^#\s+/, '')}</h1>`);
      continue;
    }
    
    // Unordered list items
    if (trimmed.match(/^[\*\-\+]\s+(.+)$/)) {
      if (!inList || listType !== 'ul') {
        if (inList && listType === 'ol') {
          processedLines.push('</ol>');
        }
        processedLines.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      const content = trimmed.replace(/^[\*\-\+]\s+/, '');
      processedLines.push(`<li>${content}</li>`);
      continue;
    }
    
    // Ordered list items
    if (trimmed.match(/^\d+\.\s+(.+)$/)) {
      if (!inList || listType !== 'ol') {
        if (inList && listType === 'ul') {
          processedLines.push('</ul>');
        }
        processedLines.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      const content = trimmed.replace(/^\d+\.\s+/, '');
      processedLines.push(`<li>${content}</li>`);
      continue;
    }
    
    // Empty line - close list if open
    if (trimmed === '') {
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      processedLines.push('');
      continue;
    }
    
    // Regular line
    if (inList) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }
    processedLines.push(line);
  }
  
  // Close any open list
  if (inList) {
    processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
  }
  
  html = processedLines.join('\n');
  
  // Inline formatting (apply after line processing)
  // Inline code (`code`) - but not in code blocks
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold (**text** or __text__) - process first
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic (*text* or _text_) - process after bold, using word boundaries
  // Match single asterisk/underscore that's not part of a double
  html = html.replace(/(^|[^*])\*([^*]+?)\*([^*]|$)/g, '$1<em>$2</em>$3');
  html = html.replace(/(^|[^_])_([^_]+?)_([^_]|$)/g, '$1<em>$2</em>$3');
  
  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Paragraphs (group consecutive non-empty lines)
  const paragraphs = html.split('\n\n');
  html = paragraphs.map(para => {
    para = para.trim();
    if (!para) return '';
    // Don't wrap if it's already a block element
    if (para.match(/^<(h[1-6]|ul|ol|pre|p)/)) {
      return para;
    }
    return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
  }).join('');
  
  return html;
}

// Show chat section after summary/transcript is generated
function showChatSection() {
  // Don't show chat section if docs handler is active
  const summaryType = document.getElementById('summary-type');
  if (summaryType && summaryType.value === 'docs-handler') {
    return;
  }
  
  const chatSection = document.getElementById('chat-section');
  if (chatSection) {
    chatSection.style.display = 'block';
    // Clear previous chat messages
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = '<div style="color: #666; font-style: italic;">Chat started. Ask questions about the summary or transcript above.</div>';
    }
  }
}

// Initialize chat functionality
function initChat() {
  const chatSendBtn = document.getElementById('chat-send-btn');
  const chatInput = document.getElementById('chat-input');
  const chatClearBtn = document.getElementById('chat-clear-btn');
  const chatMessages = document.getElementById('chat-messages');
  
  if (!chatSendBtn || !chatInput || !chatClearBtn || !chatMessages) return;
  
  // Send message on button click
  chatSendBtn.addEventListener('click', async () => {
    await sendChatMessage();
  });
  
  // Send message on Enter key
  chatInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      await sendChatMessage();
    }
  });
  
  // Clear chat
  chatClearBtn.addEventListener('click', () => {
    chatMessages.innerHTML = '<div style="color: #666; font-style: italic;">Chat cleared.</div>';
    window.chatHistory = [];
  });
}

// Send chat message
async function sendChatMessage() {
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const chatSendBtn = document.getElementById('chat-send-btn');
  
  if (!chatInput || !chatMessages || !window.currentSummary) {
    return;
  }
  
  const message = chatInput.value.trim();
  if (!message) return;
  
  // Disable input and button
  chatInput.disabled = true;
  chatSendBtn.disabled = true;
  chatSendBtn.textContent = 'Sending...';
  
  // Add user message to chat
  const userMessageDiv = document.createElement('div');
  userMessageDiv.style.marginBottom = '10px';
  userMessageDiv.innerHTML = `
    <div style="background-color: #4285f4; color: white; padding: 8px 12px; border-radius: 8px; display: inline-block; max-width: 80%;">
      <strong>You:</strong> ${escapeHtml(message)}
    </div>
  `;
  chatMessages.appendChild(userMessageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Clear input
  chatInput.value = '';
  
  // Add loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'chat-loading';
  loadingDiv.style.marginBottom = '10px';
  loadingDiv.innerHTML = `
    <div style="background-color: #f0f0f0; padding: 8px 12px; border-radius: 8px; display: inline-block;">
      <div class="loader" style="width: 20px; height: 20px; border-width: 2px; display: inline-block; margin-right: 8px;"></div>
      <span style="color: #666;">Loading...</span>
    </div>
  `;
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  try {
    // Build conversation context
    const systemPrompt = `You are a helpful assistant. The user is asking questions about a summary or transcript of a web page or YouTube video. Use the following context to answer their questions accurately and helpfully.

Context (Summary/Transcript):
${window.currentSummary}

Answer the user's question based on this context. If the question cannot be answered from the context, politely say so.`;
    
    // Get chat history
    if (!window.chatHistory) {
      window.chatHistory = [];
    }
    
    // Add user message to history
    window.chatHistory.push({
      role: "user",
      content: message
    });
    
    // Call OpenRouter API
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "google/gemma-3-27b-it:free",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            ...window.chatHistory
          ],
          temperature: 0.7,
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "API request failed");
    }
    
    const data = await response.json();
    const aiResponse = data?.choices?.[0]?.message?.content || "No response available.";
    
    // Add AI response to history
    window.chatHistory.push({
      role: "assistant",
      content: aiResponse
    });
    
    // Remove loading indicator
    const loadingEl = document.getElementById('chat-loading');
    if (loadingEl) {
      loadingEl.remove();
    }
    
    // Add AI response to chat
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.style.marginBottom = '10px';
    aiMessageDiv.innerHTML = `
      <div style="background-color: #e8f0fe; padding: 8px 12px; border-radius: 8px; display: inline-block; max-width: 80%;">
        <strong>AI:</strong> ${renderMarkdown(aiResponse)}
      </div>
    `;
    chatMessages.appendChild(aiMessageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
  } catch (error) {
    console.error('Error in chat:', error);
    
    // Remove loading indicator
    const loadingEl = document.getElementById('chat-loading');
    if (loadingEl) {
      loadingEl.remove();
    }
    
    // Show error message
    const errorDiv = document.createElement('div');
    errorDiv.style.marginBottom = '10px';
    errorDiv.innerHTML = `
      <div style="background-color: #fce8e6; color: #d93025; padding: 8px 12px; border-radius: 8px; display: inline-block;">
        <strong>Error:</strong> ${escapeHtml(error.message || "Failed to get response")}
      </div>
    `;
    chatMessages.appendChild(errorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } finally {
    // Re-enable input and button
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatSendBtn.textContent = 'Send';
    chatInput.focus();
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize Docs Handler
async function initDocsHandler(tabId) {
  const docsChatInput = document.getElementById('docs-chat-input');
  const docsChatSendBtn = document.getElementById('docs-chat-send-btn');
  const docsChatMessages = document.getElementById('docs-chat-messages');
  
  if (!docsChatInput || !docsChatSendBtn || !docsChatMessages) return;
  
  // Get full page content (optimized - only get text, not HTML)
  try {
    docsChatMessages.innerHTML = '<div style="color: #666; font-style: italic; text-align: center; padding: 20px;">Extracting page content... This may take a moment for large pages.</div>';
    
    // First, ensure content script is injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      // Wait a bit for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (injectError) {
      // Content script might already be injected, or page might not allow it
      // Continue anyway and try to send message
      console.log('Content script injection result:', injectError);
    }
    
    // Function to try sending message with retry
    const trySendMessage = (retries = 3) => {
      chrome.tabs.sendMessage(tabId, { type: "GET_FULL_PAGE_CONTENT" }, async (res) => {
        if (chrome.runtime.lastError) {
          if (retries > 0) {
            // Retry after a short delay
            setTimeout(() => trySendMessage(retries - 1), 500);
            return;
          }
          docsChatMessages.innerHTML = `<div style="color: #d93025; padding: 15px;">Error: Could not access page content. ${chrome.runtime.lastError.message}<br><br>Try refreshing the page and try again.</div>`;
          return;
        }
        
        if (!res || !res.fullText) {
          docsChatMessages.innerHTML = '<div style="color: #d93025; padding: 15px;">Error: Could not extract page content.</div>';
          return;
        }
        
        // Store full page content (limit to 50K chars for performance)
        const maxContentLength = 50000;
        window.docsPageText = res.fullText.length > maxContentLength 
          ? res.fullText.substring(0, maxContentLength) + "... [Content truncated for performance]"
          : res.fullText;
        window.docsTabId = tabId;
        
        // Show welcome message with content stats
        const contentLength = res.fullText.length;
        const contentSize = contentLength > 1000 ? `${(contentLength / 1000).toFixed(1)}K` : `${contentLength}`;
        docsChatMessages.innerHTML = `
          <div style="background-color: #e8f0fe; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
            <strong>AI:</strong> I've loaded the page content (${contentSize} characters). Ask me anything about this page and I'll answer based on the content.
          </div>
        `;
        
        // Send message handler
        docsChatSendBtn.addEventListener('click', async () => {
          await sendDocsQuestion();
        });
        
        // Enter key handler
        docsChatInput.addEventListener('keypress', async (e) => {
          if (e.key === 'Enter') {
            await sendDocsQuestion();
          }
        });
        
      });
    };
    
    // Start the message sending process
    trySendMessage();
  } catch (error) {
      docsChatMessages.innerHTML = `<div style="color: #d93025; padding: 15px;">Error: ${error.message}</div>`;
    }
  }

// Send question to AI for docs handler
async function sendDocsQuestion() {
  const docsChatInput = document.getElementById('docs-chat-input');
  const docsChatSendBtn = document.getElementById('docs-chat-send-btn');
  const docsChatMessages = document.getElementById('docs-chat-messages');
  
  if (!docsChatInput || !docsChatSendBtn || !docsChatMessages || !window.docsPageText) {
    return;
  }
  
  const question = docsChatInput.value.trim();
  if (!question) return;
  
  // Disable input
  docsChatInput.disabled = true;
  docsChatSendBtn.disabled = true;
  docsChatSendBtn.textContent = 'Thinking...';
  
  // Add user message
  const userMessageDiv = document.createElement('div');
  userMessageDiv.style.marginBottom = '10px';
  userMessageDiv.innerHTML = `
    <div style="background-color: #4285f4; color: white; padding: 10px 15px; border-radius: 8px; display: inline-block; max-width: 85%; float: right; clear: both;">
      <strong>You:</strong> ${escapeHtml(question)}
    </div>
  `;
  docsChatMessages.appendChild(userMessageDiv);
  docsChatMessages.scrollTop = docsChatMessages.scrollHeight;
  
  // Clear input
  docsChatInput.value = '';
  
  // Add loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'docs-loading';
  loadingDiv.style.marginBottom = '10px';
  loadingDiv.innerHTML = `
    <div style="background-color: #f0f0f0; padding: 10px 15px; border-radius: 8px; display: inline-block;">
      <div class="loader" style="width: 20px; height: 20px; border-width: 2px; display: inline-block; margin-right: 8px;"></div>
      <span style="color: #666;">AI is analyzing the page...</span>
    </div>
  `;
  docsChatMessages.appendChild(loadingDiv);
  docsChatMessages.scrollTop = docsChatMessages.scrollHeight;
  
  try {
    const systemPrompt = `You are a helpful AI assistant helping developers understand documentation and web pages. The user is asking questions about a webpage. Answer their questions based ONLY on the provided page content. Be specific and cite relevant information. Also, identify 3-10 common phrases or terms from the webpage that are directly related to your answer. These should be exact phrases or terms that appear in the page content.`;
    
    const userPrompt = `Page Content:\n${window.docsPageText}\n\nQuestion: ${question}\n\nPlease answer the question based on the page content above. Also, identify 3-10 common phrases or terms from the webpage that are directly related to your answer. Format your response as:\n\n[ANSWER]\nYour answer here...\n\n[PHRASES]\nPhrase 1\nPhrase 2\nPhrase 3\n...`;
    
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "google/gemma-3-27b-it:free",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ],
          temperature: 0.3,
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "API request failed");
    }
    
    const data = await response.json();
    const aiResponse = data?.choices?.[0]?.message?.content || "No response available.";
    
    // Parse response to extract answer and phrases
    const answerMatch = aiResponse.match(/\[ANSWER\]([\s\S]*?)(?=\[PHRASES\]|$)/);
    const phrasesMatch = aiResponse.match(/\[PHRASES\]([\s\S]*?)$/);
    
    const answer = answerMatch ? answerMatch[1].trim() : aiResponse.trim();
    let phrasesText = phrasesMatch ? phrasesMatch[1].trim() : '';
    
    // Also try to extract from "Related Phrases:" section in the answer (if not found in [PHRASES])
    if (!phrasesText) {
      const relatedPhrasesMatch = answer.match(/Related Phrases:?\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
      if (relatedPhrasesMatch) {
        phrasesText = relatedPhrasesMatch[1].trim();
      }
    }
    
    // Parse phrases - extract them into an array
    let phrases = [];
    if (phrasesText) {
      phrases = phrasesText
        .split('\n')
        .map(p => p.trim())
        .filter(p => {
          // Remove empty lines, but keep list markers for now
          return p.length > 0 && p.length >= 2; // Minimum 2 characters
        })
        .map(p => {
          // Remove list markers (dash, bullet, asterisk, numbers)
          let cleaned = p
            .replace(/^[-•*]\s+/, '') // Remove leading dash/bullet/asterisk
            .replace(/^\d+\.\s+/, '') // Remove numbered list
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove **bold**
            .replace(/\*([^*]+)\*/g, '$1') // Remove *italic*
            .replace(/`([^`]+)`/g, '$1') // Remove `code`
            .replace(/__([^_]+)__/g, '$1') // Remove __bold__
            .replace(/_([^_]+)_/g, '$1') // Remove _italic_
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove [link](url) -> link
            .replace(/^["']+|["']+$/g, '') // Remove surrounding quotes
            .trim();
          
          return cleaned;
        })
        .filter(p => p.length >= 2) // Filter again after cleaning
        .slice(0, 10); // Limit to 10 phrases
    }
    
    // Remove loading indicator
    const loadingEl = document.getElementById('docs-loading');
    if (loadingEl) {
      loadingEl.remove();
    }
    
    // Add AI response
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.style.marginBottom = '10px';
    aiMessageDiv.style.clear = 'both';
    
    // Format phrases as JSON array string
    const phrasesJson = JSON.stringify(phrases);
    
    aiMessageDiv.innerHTML = `
      <div style="background-color: #e8f0fe; padding: 12px 15px; border-radius: 8px; display: inline-block; max-width: 85%;">
        <strong>AI:</strong> ${renderMarkdown(answer)}
      </div>
      ${phrases.length > 0 ? `
        <div style="margin-top: 8px; margin-left: 0;">
          <button class="highlight-on-page-btn" data-phrases='${escapeHtml(phrasesJson)}' style="
            padding: 8px 16px;
            background-color: #34a853;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
          ">Reload the page & Highlight!</button>
        </div>
      ` : ''}
    `;
    docsChatMessages.appendChild(aiMessageDiv);
    
    // Add click handler for "Highlight on Page" button
    const highlightBtn = aiMessageDiv.querySelector('.highlight-on-page-btn');
    if (highlightBtn) {
      highlightBtn.addEventListener('click', async () => {
        try {
          const phrasesData = JSON.parse(highlightBtn.getAttribute('data-phrases'));
          
          // Get the currently active tab
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab || !tab.id) {
            console.error('Could not get active tab');
            return;
          }
          
          // Check if this is a special page where content scripts can't run
          const isSpecialPage = tab.url.startsWith('chrome://') || 
                               tab.url.startsWith('chrome-extension://') ||
                               tab.url.startsWith('about:') ||
                               tab.url.startsWith('file:') ||
                               tab.url.startsWith('data:') ||
                               tab.url.startsWith('view-source:');
          
          if (isSpecialPage) {
            alert('Highlighting is not available on this type of page.');
            return;
          }
          
          // Disable button and show loading state
          highlightBtn.disabled = true;
          highlightBtn.textContent = 'Highlighting...';
          
          // Send message to content script
          // Use a promise-based approach for better error handling
          const sendMessagePromise = new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, {
              type: "HIGHLIGHT_PHRASES",
              phrases: phrasesData
            }, (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            });
          });
          
          try {
            const response = await sendMessagePromise;
            if (response && response.status === 'ok') {
              console.log('Phrases highlighted successfully');
            } else if (response && response.status === 'error') {
              console.error('Highlight error:', response.error);
            }
          } catch (error) {
            // Handle port closed error gracefully
            if (error.message.includes('port closed') || error.message.includes('Receiving end does not exist')) {
              console.warn('Content script may not be loaded. The highlight may still work if the page reloads.');
              // Don't show error to user - highlighting might still work
            } else {
              console.error('Error highlighting:', error);
            }
          } finally {
            // Re-enable button
            highlightBtn.disabled = false;
            highlightBtn.textContent = 'Highlight on Page';
          }
        } catch (error) {
          console.error('Error in highlight button handler:', error);
          highlightBtn.disabled = false;
          highlightBtn.textContent = 'Highlight on Page';
        }
      });
    }
    
    docsChatMessages.scrollTop = docsChatMessages.scrollHeight;
    
  } catch (error) {
    console.error('Error in docs handler:', error);
    
    // Remove loading indicator
    const loadingEl = document.getElementById('docs-loading');
    if (loadingEl) {
      loadingEl.remove();
    }
    
    // Show error
    const errorDiv = document.createElement('div');
    errorDiv.style.marginBottom = '10px';
    errorDiv.innerHTML = `
      <div style="background-color: #fce8e6; color: #d93025; padding: 10px 15px; border-radius: 8px; display: inline-block;">
        <strong>Error:</strong> ${escapeHtml(error.message || "Failed to get response")}
      </div>
    `;
    docsChatMessages.appendChild(errorDiv);
    docsChatMessages.scrollTop = docsChatMessages.scrollHeight;
  } finally {
    // Re-enable input
    docsChatInput.disabled = false;
    docsChatSendBtn.disabled = false;
    docsChatSendBtn.textContent = 'Ask';
    docsChatInput.focus();
  }
}

async function getOpenRouterSummary(text, summaryType, apiKey, pageInfo = {}) {
  // Truncate very long texts to avoid API limits (typically around 30K tokens)
  const maxLength = 30000;
  const truncatedText =
    text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    
  // Add page metadata for context
  let pageContext = '';
  if (pageInfo.title || pageInfo.url) {
    pageContext = `Page Title: ${pageInfo.title || 'Unknown'}\nURL: ${pageInfo.url || 'Unknown'}\n`;
  }
  
  // Add detected file tokens if available
  if (pageInfo.pageSignals) {
    const tokens = pageInfo.pageSignals.detectedTokens || [];
    const mentionedFiles = pageInfo.pageSignals.mentioned_files || [];
    const allFiles = [...new Set([...tokens, ...mentionedFiles])];
    
    if (allFiles.length > 0) {
      pageContext += `Detected file references: ${allFiles.join(', ')}\n`;
    }
  }
  
  if (pageContext) {
    pageContext += '\n';
  }

  // Analysis guidelines to add to all prompts
  const analysisGuidelines = `\n\nIMPORTANT ANALYSIS GUIDELINES:\nYou are analyzing a webpage.\n\nYou may ONLY make claims based on:\n- What is explicitly visible in the provided signals\n- Widely accepted conventions about technology or files\n- The page URL and title\n\nIf something is visible (e.g. a filename), you may say that the page CONTAINS or MENTIONS it.\nYou MUST NOT assume the contents of files or hidden data.\n\nIf information is not visible, say so clearly.\n`;

  let prompt;
  switch (summaryType) {
    case "brief":
      prompt = `You are a helpful AI that specializes in summarizing web content. Please provide a brief summary of the following web page in 2-3 sentences. Use markdown formatting for better readability (you can use **bold** for emphasis, *italic* for subtle emphasis, and proper paragraph breaks). Focus on the main points and ignore any navigation elements, ads, or sidebar content that may have been captured.\n\n${pageContext}Content:\n${truncatedText}${analysisGuidelines}`;
      break;
    case "detailed":
      prompt = `You are a helpful AI that specializes in summarizing web content. Please provide a detailed summary of the following web page, covering all main points and key details. Use markdown formatting for better structure (use ## for section headers, **bold** for key terms, *italic* for emphasis, and proper paragraph breaks). Focus on the actual content and ignore any navigation elements, ads, or sidebar content that may have been captured.\n\n${pageContext}Content:\n${truncatedText}${analysisGuidelines}`;
      break;
    case "bullets":
      prompt = `You are a helpful AI that specializes in summarizing web content. Summarize the following web page in 5-7 key points using markdown format. Format each point as a markdown list item starting with "- " (dash followed by a space). You can use **bold** within list items for emphasis. Keep each point concise and focused on a single key insight from the content. Ignore any navigation elements, ads, or sidebar content that may have been captured.\n\n${pageContext}Content:\n${truncatedText}${analysisGuidelines}`;
      break;
    default:
      prompt = `You are a helpful AI that specializes in summarizing web content. Please summarize the following web page content using markdown formatting for better readability. Use **bold** for emphasis, *italic* for subtle emphasis, and proper paragraph breaks. Focus on the actual content and ignoring any navigation elements, ads, or sidebar content that may have been captured.\n\n${pageContext}Content:\n${truncatedText}${analysisGuidelines}`;
  }

  try {
    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "google/gemma-3-27b-it:free",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
            temperature: 0.2,
        }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "API request failed");
    }

    const data = await res.json();
    return (
      data?.choices?.[0]?.message?.content ||
      "No summary available."
    );
  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    throw new Error("Failed to generate summary. Please try again later.");
  }
}


