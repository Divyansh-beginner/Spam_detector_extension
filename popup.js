// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');
  const scanButton = document.getElementById('scanButton');
  const getTitleButton = document.getElementById('get_title');
  const titleElement = document.getElementById('title');

  // Scan Emails Handler
  scanButton.addEventListener('click', function() {
      statusElement.textContent = 'SCANNING...';
      statusElement.classList.remove('status-active', 'status-inactive');
      statusElement.classList.add('status-scanning');

      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (!tabs[0].url.includes("mail.google.com")) {
              statusElement.textContent = 'ERROR';
              statusElement.classList.remove('status-scanning');
              statusElement.classList.add('status-error');
              titleElement.textContent = 'Must be on Gmail page';
              return;
          }

          chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['emailcontent.js']
          }, () => {
              statusElement.textContent = 'ACTIVE';
              statusElement.classList.remove('status-scanning');
              statusElement.classList.add('status-active');
              titleElement.textContent = 'Scan complete!';
          });
      });
  });

  // Get Title Handler
  getTitleButton.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          titleElement.textContent = tabs[0].title || 'No title found';
          titleElement.classList.add('title-updated');
          setTimeout(() => titleElement.classList.remove('title-updated'), 1000);
      });
  });
});