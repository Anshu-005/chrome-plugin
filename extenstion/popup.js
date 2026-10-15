document.getElementById('summarizeBtn').addEventListener('click', async () => {
  const resultDiv = document.getElementById('result');
  const loader = document.getElementById('loader');

  resultDiv.innerText = '';
  loader.style.display = 'block';

  try {
    // 1. Get the active browser tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 2. Extract text from the active webpage using chrome.scripting
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText // Grab all visible text on the page
    });

    const pageText = results[0].result;

    // 3. Send the text to your LangChain backend server
    const response = await fetch('http://localhost:3000/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: pageText })
    });

    const data = await response.json();
    loader.style.display = 'none';

    if (data.summary) {
      resultDiv.innerText = data.summary;
    } else {
      resultDiv.innerText = 'Error: ' + (data.error || 'Failed to summarize.');
    }

  } catch (error) {
    loader.style.display = 'none';
    resultDiv.innerText = 'Error: Could not connect to the backend server. Make sure your server is running.';
    console.error(error);
  }
});