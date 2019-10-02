const breakpointData = document.getElementById('breakpointData');
const addBreakpoint = document.getElementById('addBreakpoint');
const clearBreakpoints = document.getElementById('clearBreakpoints');
const adjustWindowSize = document.getElementById('adjustWindowSize');
const imageDataSection = document.getElementById('imageData');
let port = null;
let currentUrl = null;
let breakpoints = null;
let currentWindowSize = null;
let imageData = [];
let currentBreak = 0;
let currentWindow = null;

chrome.storage.sync.get('breakpoints', function(data) {
  const nobreakpoints = Object.entries(data).length === 0 && data.constructor === Object;
  if (nobreakpoints) {
    breakpointData.innerHTML = '<p style="font-style: italic;">no breakpoints</p>';
  } else {
    breakpointData.innerHTML = arrayToHtml(data.breakpoints);
    breakpoints = data.breakpoints;
  }
});

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  chrome.tabs.executeScript(
    tabs[0].id,
    {file: 'content.js', runAt: 'document_end'},
    function() { console.log('script injected'); }
  );
});

chrome.runtime.onConnect.addListener(function(connection) {
  port = connection;
  connection.onMessage.addListener(function(msg) {
    if (msg.imageData) {
      updateImageData(msg.images);
    }
  });
});

addBreakpoint.onclick = function(element) {
  const newValue = document.getElementById('breakpoints').value;
  if (newValue) {
    if (!breakpoints) {
      breakpoints = [newValue];
    } else {
      breakpoints.push(newValue);
    }
    breakpointData.innerHTML = arrayToHtml(breakpoints);
    chrome.storage.sync.set({breakpoints: breakpoints}, function() {});
  }
};

clearBreakpoints.onclick = function(element) {
  chrome.storage.sync.clear();
  breakpoints = null;
  breakpointData.innerHTML = '<p>no breakpoints</p>';
}

adjustWindowSize.onclick = function(element) {
  imageData = [];
  chrome.windows.getCurrent(function(win) {
    currentWindow = win;
    if (!currentWindowSize) {
      currentWindowSize = win.width;
    }

    if (breakpoints.length) {
      updateWindow();
    }
  });
}

const updateImageData = function(images) {
  if (!imageData.length) {
    images.forEach(image => {
      if (image.src != '') {
        imageData.push(image);
      }
    })
  } else {
    images.forEach(newImage => {
      imageData.forEach(image => {
        if (newImage.src != '') {
          if (newImage.src == image.src) {
            image.width.push(newImage.width[0]);
          }
        }
      });
    });
  }

  currentBreak += 1;
  if (breakpoints[currentBreak]) {
    console.log('updating window');
    updateWindow();
  } else {
    chrome.windows.update(currentWindow.id, {width: currentWindowSize});
    currentBreak = 0;
    getImageData();
  }
}

const getImageData = function() {
  let dataHtml = '<ul>';
  imageData.forEach(image => {
    dataHtml += `<li style="display: flex; align-items: center;"><img src="${image.src}" style="max-width: 50px; margin-right: 10px;"><code>${image.width}</code></li>`;
  });
  dataHtml += '</ul>';
  imageDataSection.innerHTML = dataHtml;
};

function openNewWindow() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    currentUrl = tabs[0].url;
    chrome.windows.create({url: currentUrl, focused: true}, function(win) {
      getImages(win);
    });
  });
}

function updateWindow() {
  chrome.windows.update(currentWindow.id, {width: Number(breakpoints[currentBreak])}, function(win) {
    port.postMessage({from: 'popup', subject: 'getImageData'});
  });
}

function getNewImages() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(
      tabs[0].id,
      {from: 'popup', subject: 'getImageData'}
    );
  });
}

function getImages() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.executeScript(
      tabs[0].id,
      {file: 'content.js', runAt: 'document_end'},
      function() {
      }
    );
  });
}

function arrayToHtml(arr) {
  let html = '<ul>';
  arr.map(function(item) {
    html += '<li>' + item + 'px</li>';
  });
  html += '</ul>';

  return html;
}
