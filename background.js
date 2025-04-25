chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'quickcontext',
    title: 'Explain with AI',
    contexts: ['selection'],
  });
});

let lastRequest = 0;
const debounceDelay = 500; // ms

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

async function handleExplanation(text, tabId, sendResponse = () => {}) {
  chrome.storage.sync.get(['openaiKey', 'theme', 'autoClose'], async (data) => {
    if (!data.openaiKey || typeof data.openaiKey !== 'string' || data.openaiKey.trim() === '') {
      if (sendResponse) {
        sendResponse({ error: 'Invalid or missing OpenAI API key. Please set it in the options.' });
      } else {
        injectErrorBubble(tabId, 'Invalid or missing OpenAI API key. Please set it in the options.', null);
      }
      return;
    }

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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that explains content simply.' },
            { role: 'user', content: `Explain this: ${text}` },
          ],
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
      }
      const result = await response.json();
      explanation = result.choices?.[0]?.message?.content || 'Sorry, I couldn’t explain that.';
      chrome.storage.local.set({ [cacheKey]: explanation });
    } catch (error) {
      explanation = `Error: ${error.message || 'Failed to fetch explanation.'}`;
      if (sendResponse) {
        sendResponse({ error: explanation });
      }
      injectErrorBubble(tabId, explanation, null, data.theme || 'auto');
      return;
    }
    console.log("AutoCloses: "+ data.autoClose);
    // Inject explanation
    injectExplanation(tabId, explanation, data.theme || 'auto', data.autoClose !== undefined ? data.autoClose : 10000);
    if (sendResponse) sendResponse({ explanation });
  });
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