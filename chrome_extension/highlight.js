// ---- Core logic (unchanged, just scoped) ----
function highlightTextMultiple(phrases) {
    if (!Array.isArray(phrases) || phrases.length === 0) return;
  
    const normalize = (text) =>
      text.toLowerCase().replace(/\s+/g, ' ').trim();
  
    const normalizedTargets = phrases.map(normalize);
  
    const escaped = phrases.map(p =>
      p.trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\s+/g, '\\s+')
    );
  
    const testRegex = new RegExp(escaped.join('|'), 'i');
    const splitRegex = new RegExp(`(${escaped.join('|')})`, 'gi');
  
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.parentElement) return NodeFilter.FILTER_REJECT;
          const tag = node.parentElement.tagName;
          if (["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT"].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentElement.classList.contains('docs-highlight')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
  
    const nodes = [];
    let node;
  
    while ((node = walker.nextNode())) {
      if (testRegex.test(node.nodeValue)) {
        nodes.push(node);
      }
    }
  
    nodes.forEach(textNode => {
      const parts = textNode.nodeValue.split(splitRegex);
      const fragment = document.createDocumentFragment();
  
      parts.forEach(part => {
        if (normalizedTargets.includes(normalize(part))) {
          const span = document.createElement('span');
          span.className = 'docs-highlight';
          span.textContent = part;
          span.style.cssText = `
            background: rgba(255, 255, 0, 0.6);
            color: black;
            font-weight: bold;
            padding: 2px 4px;
            border-radius: 4px;
          `;
          fragment.appendChild(span);
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
      });
  
      textNode.parentNode.replaceChild(fragment, textNode);
    });
  }
  
  // ---- Cleanup helper ----
  function clearHighlights() {
    document.querySelectorAll('.docs-highlight').forEach(span => {
      span.replaceWith(document.createTextNode(span.textContent));
    });
    document.body.normalize();
  }
  
  // ---- Message bridge (THIS is the key) ----
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "HIGHLIGHT_PHRASES") {
      try {
        highlightTextMultiple(message.phrases);
        sendResponse({ status: "ok" });
      } catch (error) {
        console.error('Error in highlightTextMultiple:', error);
        sendResponse({ status: "error", error: error.message });
      }
      return true; // Keep channel open for response
    }
  
    if (message.type === "CLEAR_HIGHLIGHTS") {
      try {
        clearHighlights();
        sendResponse({ status: "cleared" });
      } catch (error) {
        console.error('Error in clearHighlights:', error);
        sendResponse({ status: "error", error: error.message });
      }
      return true; // Keep channel open for response
    }
    
    // Return false if message type not handled (closes channel)
    return false;
  });
  