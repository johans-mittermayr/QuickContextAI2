const apiKeyInput = document.getElementById("apiKey");
const themeSelect = document.getElementById("themeToggle");
const bubblePreview = document.getElementById("bubblePreview");
const themeButtons = document.querySelectorAll(".switch-group button");

function applyTheme(theme) {
  document.body.classList.remove("light", "dark");
  if (theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.body.classList.add("dark");
  }
}

function updateThemeButtons(selected) {
    themeButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.theme === selected);
    });
    applyTheme(selected);
    chrome.storage.sync.set({ theme: selected });
  }

  document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.sync.get(["openaiKey", "theme"], (data) => {
      if (data.openaiKey) apiKeyInput.value = data.openaiKey;
      const storedTheme = data.theme || "auto";
      updateThemeButtons(storedTheme);
    });
  
    themeButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        updateThemeButtons(btn.dataset.theme);
      });
    });
  
    document.getElementById("saveBtn").addEventListener("click", () => {
      const key = apiKeyInput.value.trim();
      chrome.storage.sync.set({ openaiKey: key });
      alert("Settings saved!");
    });
  });
