// Content script (injected into Gmail)
(() => {
  const emails = [];
  // Target email elements (Gmail uses specific classes like .zA for email rows)
  document.querySelectorAll('.zA').forEach((emailElement) => {
    const subject = emailElement.querySelector('.bog')?.textContent?.trim();
    const sender = emailElement.querySelector('.zF')?.getAttribute('email') || emailElement.querySelector('.zF')?.textContent?.trim();
    const snippet = emailElement.querySelector('.y2')?.textContent?.trim(); // Short preview
    emails.push({ subject, sender, snippet });
  });

  console.log("emails content in emailcontent script ");

  // Send data to background script
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'updateEmailUI') {
      // Update UI with spam results
      request.batch.forEach(email => {
        if (email.isSpam) {
          // Example: Find matching email element and add "SPAM" badge
         if(parseFloat(email.confidence.trim())>0.75){
          const emailElement = [...document.querySelectorAll('.zA')].find(el => 
            el.querySelector('.bog')?.textContent?.trim() === email.subject
          );
          if (emailElement) {
            emailElement.style.backgroundColor = '#ffe6e6'; // Highlight spam
            const spamBadge = document.createElement('span');
            spamBadge.textContent = 'SPAM 🔴';
            spamBadge.style.marginLeft = '10px';
            emailElement.querySelector('.bog')?.appendChild(spamBadge);
          }
        }
      }});
    }
  });
  chrome.runtime.sendMessage({ action: 'storeEmails', emails });
})();
