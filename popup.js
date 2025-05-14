document.addEventListener('DOMContentLoaded', () => {
  const emailSpan = document.getElementById('popupUserEmail');
  const picImg = document.getElementById('popupUserPic');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginBtn = document.getElementById('loginBtn');
  const optionsBtn = document.getElementById('optionsBtn');

  chrome.storage.sync.get(['userEmail', 'userPic'], (data) => {
    if (data.userEmail) {
      emailSpan.textContent = `✅ ${data.userEmail}`;
      logoutBtn.style.display = 'inline-block';
      loginBtn.style.display = 'none';

      if (data.userPic) {
        picImg.src = data.userPic;
        picImg.style.display = 'inline-block';
      }
    } else {
      emailSpan.textContent = '🔐 Not signed in';
      loginBtn.style.display = 'inline-block';
      logoutBtn.style.display = 'none';
      picImg.style.display = 'none';
    }
  });

  logoutBtn.addEventListener('click', () => {
    chrome.identity.getAuthToken({ interactive: false }, function (token) {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          chrome.storage.sync.remove(['userEmail', 'userPic'], () => {
            window.location.reload();
          });
        });
      }
    });
  });

  loginBtn.addEventListener('click', () => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        console.error('Login failed:', chrome.runtime.lastError);
        return;
      }

      fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: 'Bearer ' + token },
      })
        .then(res => res.json())
        .then(user => {
          chrome.storage.sync.set({
            userEmail: user.email,
            userPic: user.picture
          }, () => {
            window.location.reload();
          });
        })
        .catch(err => {
          console.error('User info fetch failed:', err);
        });
    });
  });

  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});

document.getElementById('donateBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://buymeacoffee.com/johans.mittermayr' });
});