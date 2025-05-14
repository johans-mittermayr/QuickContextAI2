chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'quickcontext',
    title: 'Explain with AI',
    contexts: ['selection'],
  });
});

let lastRequest = 0;
const debounceDelay = 500; // ms
const API_URL = 'https://explain-function-548793624670.us-central1.run.app/explain';

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'quickcontext' || !info.selectionText) return;

  const now = Date.now();
  if (now - lastRequest < debounceDelay) return;
  lastRequest = now;

  handleExplanation(info.selectionText, tab.id);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'explainText' && msg.text) {
    const now = Date.now();
    if (now - lastRequest < debounceDelay) {
      sendResponse({ error: 'Please wait before requesting another explanation.' });
      return true;
    }
    lastRequest = now;

    handleExplanation(msg.text, sender.tab.id, sendResponse);
    return true; // Keep message channel open for async response
  } else if (msg.action === 'showError' && msg.error && msg.rect) {
    injectErrorBubble(sender.tab.id, msg.error, msg.rect, msg.theme || 'auto');
  } else if (msg.openOptions) {
    chrome.runtime.openOptionsPage();
  }
});

function injectBubbleScript(tabId, args) {
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['bubble.js'],
  }, () => {
    chrome.scripting.executeScript({
      target: { tabId },
      func: (args) => {
        window.renderBubble(args); // function is globally defined in bubble.js
      },
      args: [args],
    });
  });
}



async function handleExplanation(text, tabId, sendResponse = () => { }) {
  chrome.storage.sync.get(['theme', 'autoClose'], async (data) => {

    // Check cache
    const cacheKey = `explanation_${text.toLowerCase().trim()}`;
    const cached = await new Promise((resolve) => chrome.storage.local.get(cacheKey, resolve));
    if (cached[cacheKey]) {
      injectExplanation(tabId, cached[cacheKey], data.theme || 'auto', data.autoClose !== undefined ? data.autoClose : 10000);
      if (sendResponse) sendResponse({ explanation: cached[cacheKey] });
      return;
    }

    // Inject spinner
    chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ['styles.css'] });
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const existing = document.getElementById('quickcontext-bubble');
        if (existing) existing.remove();
        const bubble = document.createElement('div');
        bubble.id = 'quickcontext-bubble';
        bubble.className = 'quickcontext-spinner';
        bubble.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 38 38" stroke="#4F46E5">
            <g fill="none" fill-rule="evenodd">
              <g transform="translate(1 1)" stroke-width="2">
                <circle stroke-opacity=".3" cx="18" cy="18" r="18"/>
                <path d="M36 18c0-9.94-8.06-18-18-18">
                  <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.9s" repeatCount="indefinite"/>
                </path>
              </g>
            </g>
          </svg>
          <span>Thinking...</span>
        `;
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        bubble.style.top = `${rect.bottom + window.scrollY + 8}px`;
        bubble.style.left = `${rect.left + window.scrollX}px`;
        document.body.appendChild(bubble);
        requestAnimationFrame(() => (bubble.style.opacity = '1'));
      },
    });

    // API call
    let explanation;

    try {
      explanation = await callExplainAPI(text);
      chrome.storage.local.set({ [cacheKey]: explanation });

    } catch (error) {
      explanation = `Error: ${error.message || 'Failed to fetch explanation.'}`;
      if (sendResponse) {
        sendResponse({ error: explanation });
      }
      injectErrorBubble(tabId, explanation, null, data.theme || 'auto');
      return;
    }
    console.log("AutoCloses: " + data.autoClose);
    // Inject explanation
    injectExplanation(tabId, explanation, data.theme || 'auto', data.autoClose !== undefined ? data.autoClose : 10000);
    if (sendResponse) sendResponse({ explanation });
  });
}

async function callExplainAPI(text) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    const data = await response.json();
    return data.explanation || 'No explanation received.';
  } catch (error) {
    console.error('API error:', error);
    return 'Error contacting explanation service.';
  }
}

function injectExplanation(tabId, explanation, themePref, autoClose) {
  injectBubbleScript(tabId, {
    text: explanation,
    theme: themePref,
    autoClose,
    error: false,
  });
}

function injectErrorBubble(tabId, errorMsg, rect, themePref) {
  injectBubbleScript(tabId, {
    text: errorMsg,
    theme: themePref,
    error: true,
  });
}

function signInWithGoogle(callback) {
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError || !token) {
      console.error("Auth error:", chrome.runtime.lastError);
      return callback(null);
    }

    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(user => {
        console.log("✅ User info:", user);
        chrome.storage.sync.set({ userEmail: user.email, userId: user.sub, userPic: user.picture });
        callback(user);
      })
      .catch(err => {
        console.error("User info fetch failed:", err);
        callback(null);
      });
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'login') {
    signInWithGoogle(user => {
      if (user) sendResponse({ success: true, user });
      else sendResponse({ success: false });
    });
    return true; // Keeps the message channel open
  }
});