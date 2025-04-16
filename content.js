/*

document.addEventListener("mouseup", () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
  
    // Remove previous button
    /*const oldBtn = document.getElementById("qc-explain-btn");
    if (oldBtn) oldBtn.remove();
  
    if (text.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
  
      const button = document.createElement("button");
      button.id = "qc-explain-btn";
      button.textContent = "💡 Explain";
      button.style.position = "absolute";
      button.style.top = `${rect.bottom + window.scrollY + 5}px`;
      button.style.left = `${rect.left + window.scrollX}px`;
      button.style.padding = "6px 10px";
      button.style.border = "none";
      button.style.borderRadius = "6px";
      button.style.background = "#4f46e5";
      button.style.color = "#fff";
      button.style.cursor = "pointer";
      button.style.zIndex = 10000;
      button.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  
      document.body.appendChild(button);
  
      button.onclick = () => {
        chrome.runtime.sendMessage({
          action: "explainText",
          text: text
        });
        button.remove();
      };
    }
      
  });
  
  */