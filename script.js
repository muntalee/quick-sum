document.getElementById("sum").onclick = fetchHTML;
const config = require('./config');

// step 1: get current tab url
async function getCurrentTabUrl() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        const currentTab = tabs[0];
        const currentTabUrl = currentTab.url;
        resolve(currentTabUrl);
      }
    });
  });
}

// step 2: get the html from said url
async function fetchHTML() {
  const url = await getCurrentTabUrl();
  fetch(url)
    .then(response => response.text())
    .then(data => {
      // remove the script tags from webpage
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, 'text/html');
      const scriptElements = doc.querySelectorAll('script');
      scriptElements.forEach((script) => script.remove());

      const noJSHtml = doc.documentElement.outerHTML;
      htmlToPlainText(noJSHtml);
    })
    .catch(error => {
      console.error(error);
    });
}

// step 3: turn html into plain text
function htmlToPlainText(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function getTextContent(element) {
    let text = '';

    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        text += getTextContent(node);
      }
    }
    text = text.replace(/^\s*[\r\n]/gm, '');
    return text;
  }

  let plainText = getTextContent(doc.body)
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[\t\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/["']/g, ' ')

  // step 5: get summarization and display on screen
  summarizeText(plainText);
  loadingAPIAnimation().cancel();
  document.getElementById("input").placeholder = "Finish!";
}

// step 4: summarize using API, and display to screen
async function summarizeText(plainText, callback) {
  loadingAPIAnimation();
  const url = 'https://textgears-textgears-v1.p.rapidapi.com/summarize';
  const options = {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'X-RapidAPI-Key': 'INSERT-API-KEY-HERE',
      'X-RapidAPI-Host': 'textgears-textgears-v1.p.rapidapi.com'
    },
    body: new URLSearchParams({
      text: plainText,
      max_sentences: '3'
    })
  };

  try {
    const response = await fetch(url, options);
    const result = await response.text();
    console.log(JSON.parse(result));
    let resultString = JSON.parse(result).response.summary.join(" ");
    console.log(resultString);
    document.getElementById("input").value = resultString;
  } catch (error) {
    console.error(error);
  }
}

// animation for loading api
function loadingAPIAnimation() {
  const textarea = document.getElementById("input");

  const placeholderTexts = [
    'Getting API Response',
    'Getting API Response.',
    'Getting API Response..',
    'Getting API Response...'
  ];

  let currentPlaceholderIndex = 0;

  function updatePlaceholder() {
    textarea.placeholder = placeholderTexts[currentPlaceholderIndex];
    currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholderTexts.length;
  }

  const intervalId = setInterval(updatePlaceholder, 500); // Change every half-second (500 milliseconds)

  function cancelPlaceholderAnimation() {
    clearInterval(intervalId);
  }

  return {
    cancel: cancelPlaceholderAnimation
  };
}
