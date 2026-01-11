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
    // Call original console first (for service worker DevTools)
    originalConsole[level](...args);
    
    // Forward to active tab's console via content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'CONSOLE_LOG',
          level: level,
          source: 'Background',
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

// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  // Extension installed - no API key setup needed as it's hardcoded
  console.log("AI Summary extension installed");
});

// Handle messages to open side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "OPEN_SIDE_PANEL") {
    chrome.sidePanel.open({ windowId: request.windowId })
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error opening side panel:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for async sendResponse
  }
});

// Handle YouTube transcript fetching (to avoid CORS issues)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_YOUTUBE_TRANSCRIPT") {
    const videoId = request.videoId;
    
    fetch("https://www.youtube-transcript.io/api/transcripts", {
      method: "POST",
      headers: {
        "Authorization": "Basic 696363e1b123a9631fd90e62",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ids: [videoId]
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`API request failed with status ${response.status}: ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log('Background: Full API Response:', JSON.stringify(data, null, 2));
      console.log('Background: Response type:', typeof data);
      console.log('Background: Is array:', Array.isArray(data));
      console.log('Background: Response keys:', data && typeof data === 'object' ? Object.keys(data) : 'N/A');
      
      // Parse transcript from response
      let transcriptText = '';
      
      if (!data || (typeof data !== 'object' && !Array.isArray(data))) {
        console.warn('Background: Invalid response format');
        sendResponse({ 
          success: false, 
          error: 'Invalid API response format',
          debug: { responseType: typeof data, response: data }
        });
        return;
      }
      
      // Helper function to extract text from various segment formats
      const extractTextFromSegment = (segment) => {
        if (typeof segment === 'string') {
          return segment;
        }
        if (segment && typeof segment === 'object') {
          // Try common property names
          return segment.text || segment.content || segment.transcript || 
                 segment.snippet || segment.caption || segment.value ||
                 segment.textContent || segment.innerText ||
                 (segment.start !== undefined && segment.dur !== undefined ? segment.text : null) ||
                 JSON.stringify(segment);
        }
        return '';
      };
      
      // Format 1: { [videoId]: { transcript: [...] } } or { [videoId]: [...] }
      if (data[videoId]) {
        const transcriptData = data[videoId];
        console.log('Background: Found data for videoId:', videoId, transcriptData);
        
        // Check if transcriptData is an array directly
        if (Array.isArray(transcriptData)) {
          transcriptData.forEach(segment => {
            const text = extractTextFromSegment(segment);
            if (text) transcriptText += text + ' ';
          });
        }
        // Check if transcriptData has transcript property
        else if (transcriptData.transcript) {
          if (Array.isArray(transcriptData.transcript)) {
            transcriptData.transcript.forEach(segment => {
              const text = extractTextFromSegment(segment);
              if (text) transcriptText += text + ' ';
            });
          } else if (typeof transcriptData.transcript === 'string') {
            transcriptText = transcriptData.transcript;
          }
        }
        // Check for other common properties
        else if (transcriptData.text) {
          transcriptText = transcriptData.text;
        } else if (transcriptData.content) {
          transcriptText = transcriptData.content;
        } else if (transcriptData.data) {
          // Nested data property
          if (Array.isArray(transcriptData.data)) {
            transcriptData.data.forEach(segment => {
              const text = extractTextFromSegment(segment);
              if (text) transcriptText += text + ' ';
            });
          }
        }
        // Try to extract from all string/number values
        else {
          Object.values(transcriptData).forEach(value => {
            if (typeof value === 'string' && value.length > 10) {
              transcriptText += value + ' ';
            } else if (Array.isArray(value)) {
              value.forEach(item => {
                const text = extractTextFromSegment(item);
                if (text) transcriptText += text + ' ';
              });
            }
          });
        }
      }
      
      // Format 2: Direct transcript property at root level
      if (!transcriptText && data.transcript) {
        console.log('Background: Found transcript at root level');
        if (Array.isArray(data.transcript)) {
          data.transcript.forEach(segment => {
            const text = extractTextFromSegment(segment);
            if (text) transcriptText += text + ' ';
          });
        } else if (typeof data.transcript === 'string') {
          transcriptText = data.transcript;
        }
      }
      
      // Format 3: Array of transcript objects
      if (!transcriptText && Array.isArray(data)) {
        console.log('Background: Response is an array, searching for videoId:', videoId);
        data.forEach(item => {
          if (item && (item.videoId === videoId || item.id === videoId)) {
            if (item.transcript) {
              if (Array.isArray(item.transcript)) {
                item.transcript.forEach(segment => {
                  const text = extractTextFromSegment(segment);
                  if (text) transcriptText += text + ' ';
                });
              } else if (typeof item.transcript === 'string') {
                transcriptText = item.transcript;
              }
            } else if (item.text) {
              transcriptText = item.text;
            } else if (Array.isArray(item)) {
              item.forEach(segment => {
                const text = extractTextFromSegment(segment);
                if (text) transcriptText += text + ' ';
              });
            }
          }
        });
      }
      
      // Format 4: Check for text or content directly at root
      if (!transcriptText && data.text) {
        transcriptText = data.text;
      } else if (!transcriptText && data.content) {
        transcriptText = data.content;
      }
      
      // Format 5: Check for nested structures like data.transcript, result.transcript, etc.
      if (!transcriptText) {
        const nestedPaths = ['data.transcript', 'result.transcript', 'response.transcript', 'body.transcript'];
        nestedPaths.forEach(path => {
          const parts = path.split('.');
          let current = data;
          for (const part of parts) {
            if (current && current[part]) {
              current = current[part];
            } else {
              current = null;
              break;
            }
          }
          if (current) {
            if (Array.isArray(current)) {
              current.forEach(segment => {
                const text = extractTextFromSegment(segment);
                if (text) transcriptText += text + ' ';
              });
            } else if (typeof current === 'string') {
              transcriptText = current;
            }
          }
        });
      }
      
      transcriptText = transcriptText.trim();
      
      if (transcriptText && transcriptText.length > 0) {
        console.log('Background: Successfully extracted transcript, length:', transcriptText.length);
        console.log('Background: Transcript preview:', transcriptText.substring(0, 100));
        sendResponse({ 
          success: true, 
          transcript: transcriptText 
        });
      } else {
        console.warn('Background: Could not extract transcript from response');
        console.warn('Background: Response structure:', JSON.stringify(data, null, 2));
        sendResponse({ 
          success: false, 
          error: 'Transcript not found in API response',
          debug: {
            responseKeys: data && typeof data === 'object' ? Object.keys(data) : [],
            hasVideoIdKey: data && typeof data === 'object' ? (videoId in data) : false,
            responseType: typeof data,
            responsePreview: JSON.stringify(data).substring(0, 500)
          }
        });
      }
    })
    .catch(error => {
      console.error('Background: Error fetching transcript:', error);
      sendResponse({ 
        success: false, 
        error: error.message || 'Failed to fetch transcript' 
      });
    });
    
    return true; // Required for async sendResponse
  }
});