document.getElementById('loginBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'login' }, (response) => {
    const status = document.getElementById('status');
    if (response && response.success) {
      status.textContent = `✅ Logged in as: ${response.user.email}`;
    } else {
      status.textContent = `❌ Login failed`;
    }
  });
});
