// Set to your deployed backend URL when ready (e.g. 'https://web-summarizer-api.onrender.com')
const CONFIG = {
  BACKEND_URL: 'https://chrome-plugin.onrender.com'
};

function init() {
  const summarizeBtn = document.getElementById('summarizeBtn');
  const resultDiv = document.getElementById('result');
  const loader = document.getElementById('loader');

  if (!summarizeBtn) return;

  summarizeBtn.addEventListener('click', async () => {
    resultDiv.style.display = 'none';
    resultDiv.innerText = '';
    loader.style.display = 'block';
    summarizeBtn.disabled = true;

    try {
      // 1. Get the active browser tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        throw new Error('No active browser tab found.');
      }

      // Check for browser internal URLs
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://'))) {
        throw new Error('Cannot summarize browser internal pages. Please open a regular webpage.');
      }

      // 2. Extract text from the active webpage
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body ? document.body.innerText : ''
      });

      const pageText = results?.[0]?.result?.trim();

      if (!pageText) {
        throw new Error('No readable text found on this page.');
      }

      // 3. Send text to backend server
      const response = await fetch(`${CONFIG.BACKEND_URL}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: pageText })
      });

      const data = await response.json();

      if (data.summary) {
        resultDiv.innerText = data.summary;
      } else {
        resultDiv.innerText = 'Error: ' + (data.error || 'Failed to summarize.');
      }
      resultDiv.style.display = 'block';

    } catch (error) {
      console.error(error);
      resultDiv.innerText = 'Error: ' + (error.message || `Could not connect to backend server at ${CONFIG.BACKEND_URL}.`);
      resultDiv.style.display = 'block';
    } finally {
      loader.style.display = 'none';
      summarizeBtn.disabled = false;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
