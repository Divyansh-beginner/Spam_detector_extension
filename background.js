import { mockFetch } from "./mockApi.js";
(() => {
  // Toggle between real API and mock API.
  const USE_MOCK_API = true;
  const API_ENDPOINT = USE_MOCK_API 
    ? "https://mock-spam-api.com" 
    : "https://api-inference.huggingface.co/models/vennify/t5-base-grammar-correction";
  const API_KEY = USE_MOCK_API 
    ? "mock-key-123" 
    : "here write the hugging face's real key , written in a file";
  
  // For development: limit processing count.
  const DEBUG_LIMIT = 100;
  let debugCount = 0;
  
  // Batch size for sending results to content script.
  const BATCH_SIZE = 5;
  
  // Global accumulator for processed email results.
  let processedBatch = [];
  
  // Listen for messages from the content script to store emails.
  chrome.runtime.onMessage.addListener((request , sender) => {
    if (request.action === 'storeEmails') {
      const tabId = sender.tab.id;
      chrome.storage.local.set({ pendingEmails: request.emails , tabId: tabId  }, () => {
        console.log("Emails stored. Starting processing...");
        processEmailsOneByOne();
      });
    }
  });
  
  function sendUpdateToTab(batch) {
    chrome.storage.local.get("tabId", (data) => {
      if (data.tabId) {
        // Send directly to the tab that triggered the scan
        chrome.tabs.sendMessage(data.tabId, {
          action: 'updateEmailUI',
          batch: batch
        });
      }
    });
  }

  function processEmailsOneByOne() {
    if (debugCount >= DEBUG_LIMIT) {
      console.log(`Debug limit of ${DEBUG_LIMIT} reached. Halting further processing.`);
      return;
    }
    
    chrome.storage.local.get("pendingEmails", (data) => {
      const pending = data.pendingEmails || [];
      if (pending.length === 0) {
        // If no emails remain, send any leftover results.
        if (processedBatch.length > 0) {
          sendUpdateToTab(processedBatch); 
          console.log(processedBatch);
          processedBatch = [];
        }
        console.log("No emails to process.");
        return;
      }
      
      // Process one email at a time.
      const email = pending.shift();
      debugCount++;
      
      // Update storage with the remaining emails.
      chrome.storage.local.set({ pendingEmails: pending }, () => {
        (USE_MOCK_API ? mockFetch : fetch)(API_ENDPOINT, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json"
          },
          // Sending only the snippet as input. Adjust payload as needed.
          body: JSON.stringify({ inputs: email.snippet })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
          }
          return response.json();
        })
        .then(result => {
          // Determine spam status from API response.
          const spamResult = result.find(item => item.label === "LABEL_1");
          email.isSpam = !!spamResult;
          email.confidence = spamResult ? spamResult.score : 0;
          // Flag as not having an error.
          email.error = false;
          // Add the processed email to the batch.
          processedBatch.push(email);
          // If we've accumulated a full batch, send it.
          if (processedBatch.length >= BATCH_SIZE) {
            sendUpdateToTab(processedBatch); 
            console.log(processedBatch);
            processedBatch = [];
          }
          // Process the next email after a 1-second delay.
          setTimeout(processEmailsOneByOne, 1000);
        })
        .catch(error => {
          console.error("API Error for email:", email.subject, error);
          // On error, flag email and mark it as not spam with 0 confidence.
          email.isSpam = false;
          email.confidence = 0;
          email.error = true;  // This is the flag.
          processedBatch.push(email);
          if (processedBatch.length >= BATCH_SIZE) {
            sendUpdateToTab(processedBatch); 
            console.log(processedBatch);
            processedBatch = [];
          }
          setTimeout(processEmailsOneByOne, 1000);
        });
      });
    });
  }
})();
