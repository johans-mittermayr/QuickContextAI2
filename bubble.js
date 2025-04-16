// bubble.js

function renderBubble({ text, error = false, theme = 'auto', autoClose = 10000 }) {
    const existing = document.getElementById('quickcontext-bubble');
    if (existing) existing.remove();
  
    const isDarkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'auto' && isDarkSystem);
  
    const bubble = document.createElement('div');
    bubble.id = 'quickcontext-bubble';
    bubble.className = `quickcontext-bubble ${isDark ? 'dark' : 'light'}`;
    bubble.setAttribute('role', 'dialog');
    bubble.setAttribute('aria-labelledby', 'quickcontext-content');
    bubble.setAttribute('tabindex', '-1');
  
    bubble.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div id="quickcontext-content" style="flex: 1; padding-right: 10px; color: ${error ? 'red' : 'inherit'}">${text}</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${!error ? `<button id="quickcontext-copy" title="Copy">📋</button>` : ''}
          <button id="quickcontext-close" title="Close">×</button>
          ${!error ? `<button id="quickcontext-settings" title="Settings">⚙️</button>` : ''}
        </div>
      </div>
    `;
  
    const selection = window.getSelection();
    let left = 100, top = 100;
    if (selection.rangeCount > 0) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      left = rect.left + window.scrollX;
      top = rect.bottom + window.scrollY + 8;
      const viewportWidth = window.innerWidth;
      if (left + 300 > viewportWidth) left = viewportWidth - 310;
    }
  
    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;
  
    document.body.appendChild(bubble);
    bubble.focus();
  
    document.getElementById('quickcontext-close').onclick = () => bubble.remove();
  
    if (!error) {
      document.getElementById('quickcontext-copy').onclick = () => {
        const content = document.getElementById('quickcontext-content').innerText;
        navigator.clipboard.writeText(content).then(() => {
          const copyBtn = document.getElementById('quickcontext-copy');
          copyBtn.textContent = '✅';
          setTimeout(() => (copyBtn.textContent = '📋'), 1500);
        });
      };
      document.getElementById('quickcontext-settings').onclick = () => {
        chrome.runtime.sendMessage({ openOptions: true });
      };
    }
  
    if (autoClose > 0) {
      setTimeout(() => {
        if (document.body.contains(bubble)) {
          bubble.style.opacity = '0';
          setTimeout(() => bubble.remove(), 300);
        }
      }, autoClose);
    }
  }
  