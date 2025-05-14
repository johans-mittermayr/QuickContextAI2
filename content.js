let debounceTimeout;
let autoCloseTimer = null;
document.addEventListener('mouseup', async (event) => {
  // Skip restricted pages
  if (!window.location.protocol.startsWith('http')) {
    console.log('Skipping content script on non-http/https page:', window.location.href);
    return;
  }

   // 👇 Prevent triggering when clicking inside the bubble
   if (event.target.closest('#quickcontext-bubble')) {
    return;
  }

  // Ignore mouseup from button clicks
  if (event.target.id === 'qc-explain-btn') {
    console.log('Ignoring mouseup from Explain button click');
    return;
  }

  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();


    // Get bounding rect of the selected text
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const rect = range ? range.getBoundingClientRect() : null;

    if (!rect || (rect.width === 0 && rect.height === 0)) return;

    // Get all inputs and textareas on the page
    const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
    let intersectsEditable = false;

    inputs.forEach(el => {
      const elRect = el.getBoundingClientRect();
      const overlap = !(rect.right < elRect.left ||
        rect.left > elRect.right ||
        rect.bottom < elRect.top ||
        rect.top > elRect.bottom);
      if (overlap) {
        intersectsEditable = true;
      }
    });


    if (!text || intersectsEditable) {
      return; // skip showing the bubble
    }

    const oldBtn = document.getElementById('qc-explain-btn');
    if (oldBtn) oldBtn.remove();

    if (text.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const button = document.createElement('button');
      button.id = 'qc-explain-btn';
      button.className = 'qc-button';
      button.textContent = '💡 Explain';
      button.setAttribute('aria-label', 'Explain selected text');
      button.setAttribute('role', 'button');
      button.setAttribute('tabindex', '0');
      document.body.appendChild(button);

      let left = rect.left + window.scrollX;
      let top = rect.bottom + window.scrollY + 5;
      const viewportWidth = window.innerWidth;
      if (left + button.offsetWidth > viewportWidth) left = viewportWidth - button.offsetWidth - 10;
      button.style.top = `${top}px`;
      button.style.left = `${left}px`;

      button.focus();

      button.onclick = (clickEvent) => {
        clickEvent.stopPropagation(); // Prevent click from triggering mouseup
        if (!chrome.runtime.id) {
          console.error('Extension context invalidated, cannot send message.');
          button.remove();
          return;
        }
        console.log('Explain button clicked, sending explainText:', text);
        button.textContent = '⏳ Explaining...';
        button.disabled = true;

        // Remove button after 5s if no response
        const removeTimeout = setTimeout(() => {
          console.log('Timeout: Removing button due to no response.');
          button.remove();
        }, 5000);

        chrome.runtime.sendMessage(
          {
            action: 'explainText',
            text: text,
            rect: {
              top: rect.top,
              left: rect.left,
              bottom: rect.bottom,
              right: rect.right,
              width: rect.width,
              height: rect.height,
            },
          },
          (response) => {
            clearTimeout(removeTimeout);
            console.log('Received response:', response);
            if (!chrome.runtime.id) {
              console.error('Extension context invalidated in callback.');
              return;
            }
            button.remove();
            //window.getSelection().removeAllRanges(); // Clear selection
            if (response && response.error) {
              console.log('Error received, expecting error bubble from background.js:', response.error);
            } else {
              console.log('No error, expecting explanation bubble from background.js');
            }
          }
        );
      };

      button.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // Prevent default to avoid page scrolling
          button.click();
        }
      };
    }
  }, 200); // 200ms debounce
});

document.addEventListener("mousedown", (e) => {
  const bubble = document.getElementById("qc-explain-btn");

  const selection = window.getSelection();
  const text = selection.toString().trim();

  const clickedInsideBubble = bubble && bubble.contains(e.target);

  const isEditable = e.target.closest("input, textarea") || e.target.isContentEditable;

  if (
    bubble &&
    (!text || isEditable || !clickedInsideBubble)
  ) {
    bubble.remove();
  }
});