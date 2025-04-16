chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "explainText") {
    console.log("teste");
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "quickcontext",
    title: "Explain with AI",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "quickcontext" && info.selectionText) {
    chrome.storage.sync.get("openaiKey", async (data) => {
      if (!data.openaiKey) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => alert("Please set your OpenAI API key in the extension options."),
        });
        return;
      }

      // Inject spinner first
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const existing = document.getElementById("quickcontext-bubble");
          if (existing) existing.remove();

          const bubble = document.createElement("div");
          bubble.id = "quickcontext-bubble";
          bubble.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 38 38" stroke="#4F46E5">
                <g fill="none" fill-rule="evenodd">
                  <g transform="translate(1 1)" stroke-width="2">
                    <circle stroke-opacity=".3" cx="18" cy="18" r="18"/>
                    <path d="M36 18c0-9.94-8.06-18-18-18">
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 18 18"
                        to="360 18 18"
                        dur="0.9s"
                        repeatCount="indefinite"/>
                    </path>
                  </g>
                </g>
              </svg>
              <span style="font-size: 14px; color: #4B5563;">Thinking...</span>
            </div>
          `;
          Object.assign(bubble.style, {
            position: "absolute",
            zIndex: 9999,
            maxWidth: "300px",
            background: "white",
            borderRadius: "12px",
            padding: "12px 16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            fontSize: "14px",
            opacity: "0"
          });

          const selection = window.getSelection();
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          bubble.style.top = `${rect.bottom + window.scrollY + 10}px`;
          bubble.style.left = `${rect.left + window.scrollX}px`;

          document.body.appendChild(bubble);
          requestAnimationFrame(() => {
            bubble.style.opacity = "1";
          });
        }
      });

      // Make API call
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.openaiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful assistant that explains content simply." },
            { role: "user", content: `Explain this: ${info.selectionText}` }
          ]
        })
      });

      const result = await response.json();
      const explanation = result.choices?.[0]?.message?.content || "Sorry, I couldn’t explain that.";

      // Replace spinner with explanation
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text, themePref) => {
          const bubble = document.getElementById("quickcontext-bubble");
          if (bubble) bubble.remove();
      
          const isDarkSystem = window.matchMedia("(prefers-color-scheme: dark)").matches;
          const isDark = themePref === "dark" || (themePref === "auto" && isDarkSystem);
      
          const bubbleEl = document.createElement("div");
          bubbleEl.id = "quickcontext-bubble";
          Object.assign(bubbleEl.style, {
            position: "absolute",
            zIndex: 9999,
            maxWidth: "300px",
            background: isDark ? "#1F2937" : "white",
            color: isDark ? "#F3F4F6" : "#111827",
            border: `1px solid ${isDark ? "#374151" : "#ccc"}`,
            borderRadius: "12px",
            padding: "16px",
            fontSize: "14px",
            lineHeight: "1.5",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            transition: "opacity 0.3s",
          });
      
          const selection = window.getSelection();
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
      
          bubbleEl.style.top = `${rect.bottom + window.scrollY + 8}px`;
          bubbleEl.style.left = `${rect.left + window.scrollX}px`;
      
          bubbleEl.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: start;">
    <div id="quickcontext-content" style="flex: 1; padding-right: 10px;">${text}</div>
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <button id="quickcontext-copy" title="Copy" style="
        background: none;
        border: none;
        color: ${isDark ? "#D1D5DB" : "#4B5563"};
        font-size: 14px;
        cursor: pointer;
        font-weight: bold;
        padding: 0;
      ">📋</button>
      <button id="quickcontext-close" title="Close" style="
        background: none;
        border: none;
        color: ${isDark ? "#9CA3AF" : "#9CA3AF"};
        font-size: 16px;
        cursor: pointer;
        font-weight: bold;
        line-height: 1;
        padding: 0;
      ">&times;</button>
      <button id="quickcontext-settings" title="Settings" style="
        background: none;
        border: none;
        color: ${isDark ? "#9CA3AF" : "#6B7280"};
        font-size: 16px;
        cursor: pointer;
        padding: 0;
      ">⚙️</button>
    </div>
  </div>
`;
      
          document.body.appendChild(bubbleEl);
      
          document.getElementById("quickcontext-close").onclick = () => bubbleEl.remove();
          document.getElementById("quickcontext-copy").onclick = () => {
            const content = document.getElementById("quickcontext-content").innerText;
            navigator.clipboard.writeText(content).then(() => {
              const copyBtn = document.getElementById("quickcontext-copy");
              copyBtn.textContent = "✅";
              setTimeout(() => (copyBtn.textContent = "📋"), 1500);
            });
          };

          document.getElementById("quickcontext-settings").onclick = () => {
            chrome.runtime.sendMessage({ openOptions: true });
          };
      
          setTimeout(() => {
            if (document.body.contains(bubbleEl)) {
              bubbleEl.style.opacity = "0";
              setTimeout(() => bubbleEl.remove(), 300);
            }
          }, 10000);
        },
        args: [explanation, await new Promise(resolve => {
          chrome.storage.sync.get("theme", (data) => resolve(data.theme || "auto"));
        })]
      });
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.openOptions) {
    chrome.runtime.openOptionsPage();
  }
});
