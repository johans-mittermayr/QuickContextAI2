const autoCloseSelect = document.getElementById("autoClose");
const bubblePreview = document.getElementById("bubblePreview");
const themeButtons = document.querySelectorAll(".switch-group button");
const loginStatus = document.getElementById("loginStatus");

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
  chrome.storage.sync.get(["theme", "autoClose", "userEmail"], (data) => {
    const storedTheme = data.theme || "auto";
    updateThemeButtons(storedTheme);

    if (data.autoClose !== undefined) {
      autoCloseSelect.value = data.autoClose.toString();
    }

    if (data.userEmail) {
      loginStatus.innerHTML = `✅ Logged in as <strong>${data.userEmail}</strong> <button id="logoutBtn" class="qc-button" style="margin-left: 10px;">Logout</button>`;
    } else {
      loginStatus.textContent = `🔐 Not signed in`;
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        chrome.identity.getAuthToken({ interactive: false }, function (token) {
          if (token) {
            chrome.identity.removeCachedAuthToken({ token }, () => {
              chrome.storage.sync.remove(["userEmail", "userId"], () => {
                location.reload();
              });
            });
          }
        });
      });
    }
  });

  themeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      updateThemeButtons(btn.dataset.theme);
    });
  });

  document.getElementById("saveBtn").addEventListener("click", () => {
    const autoCloseValue = parseInt(autoCloseSelect.value, 10);
    chrome.storage.sync.set({ autoClose: autoCloseValue });
    alert("Settings saved!");
  });
});
