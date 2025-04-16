document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  // Remove previous button
  const oldBtn = document.getElementById("qc-explain-btn");
  if (oldBtn) oldBtn.remove();

  if (text.length > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const button = document.createElement("button");
    button.id = "qc-explain-btn";
    button.textContent = "💡 Explain";

    Object.assign(button.style, {
      position: "absolute",
      top: `${rect.bottom + window.scrollY + 5}px`,
      left: `${rect.left + window.scrollX}px`,
      padding: "6px 10px",
      border: "none",
      borderRadius: "6px",
      background: "#4f46e5",
      color: "#fff",
      cursor: "pointer",
      zIndex: 10000,
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
    });

    document.body.appendChild(button);

    button.onclick = async () => {
      button.textContent = "⏳ Explaining...";
      button.disabled = true;

      chrome.storage.sync.get("openaiKey", async (data) => {
        if (!data.openaiKey) {
          alert("Please set your OpenAI API key in the extension options.");
          return;
        }

        try {
          const explanation = await fetchExplanation(text, data.openaiKey);
          showPopup(explanation, rect);
        } catch (err) {
          showPopup("⚠️ Error: " + err.message, rect);
        } finally {
          button.remove();
        }
      });
    };
  }
});

// 🧠 Local fetchExplanation function
async function fetchExplanation(prompt, apiKey) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that explains content simply." },
        { role: "user", content: `Explain this: ${prompt}` }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "API request failed.");
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

// 💬 Popup that avoids eval/innerHTML
function showPopup(text, rect) {
  const bubble = document.createElement("div");
  bubble.id = "qc-popup";

  Object.assign(bubble.style, {
    position: "fixed",
    top: `${rect.bottom + window.scrollY + 10}px`,
    left: `${rect.left + window.scrollX}px`,
    background: "white",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "12px 16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    maxWidth: "300px",
    fontSize: "14px",
    lineHeight: "1.5",
    zIndex: "10001"
  });

  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  });

  const title = document.createElement("strong");
  title.textContent = "Explanation";
  title.style.fontSize = "15px";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  Object.assign(closeBtn.style, {
    background: "none",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
    color: "#999"
  });
  closeBtn.onclick = () => bubble.remove();

  const body = document.createElement("div");
  body.textContent = text;
  body.style.marginTop = "8px";

  header.appendChild(title);
  header.appendChild(closeBtn);
  bubble.appendChild(header);
  bubble.appendChild(body);

  document.body.appendChild(bubble);
}
