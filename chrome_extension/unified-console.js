// Unified Console - Forward extension logs to page console
// This allows all extension logs to appear in the website's DevTools console

(function() {
  'use strict';
  
  // Store original console methods
  const originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
  };
  
  // Override console methods to forward to page console
  function forwardToPageConsole(level, args) {
    // Call original console first
    originalConsole[level](...args);
    
    // Try to forward to content script (if we're in popup/background)
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage({
          type: 'CONSOLE_LOG',
          level: level,
          args: args.map(arg => {
            // Serialize arguments
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
      } catch (e) {
        // Ignore errors
      }
    }
  }
  
  // Override console methods
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

