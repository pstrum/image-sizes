const breakpointData = document.getElementById('breakpointData');
const addBreakpoint = document.getElementById('addBreakpoint');
const clearBreakpoints = document.getElementById('clearBreakpoints');
const adjustWindowSize = document.getElementById('adjustWindowSize');
const imageDataSection = document.getElementById('imageData');
let breakpoints = null;
let currentWindowSize = null;
let imageData = null;

chrome.storage.sync.get('breakpoints', function(data) {
  const nobreakpoints = Object.entries(data).length === 0 && data.constructor === Object;
  if (nobreakpoints) {
    breakpointData.innerHTML = '<p style="font-style: italic;">no breakpoints</p>';
  } else {
    breakpointData.innerHTML = arrayToHtml(data.breakpoints);
    breakpoints = data.breakpoints;
  }
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
  getImages();
  chrome.windows.getCurrent(function(win) {
    if (!currentWindowSize) {
      currentWindowSize = win.width;
    }

    // if (breakpoints.length) {
    //   updateWindow(win, breakpoints);
    // }
  });
}

const getImageData = function(info) {
  imageData = info.images;
  imageDataSection.innerHTML = `<code>${imageData}</code>`;
};

function updateWindow(win, breakpoints, current = 0) {
  chrome.windows.update(win.id, {width: Number(breakpoints[current])}, function(win) {
    const next = current + 1;
    if (breakpoints[next]) {
      updateWindow(win, breakpoints, next);
    } else {
      chrome.windows.update(win.id, {width: currentWindowSize});
    }
  });
}

function getImages() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.executeScript(
      tabs[0].id,
      {file: 'content.js'},
      function() {
        const breakpointNumbers = breakpoints.map(function(breakpoint) {
          return Number(breakpoint);
        });
        chrome.tabs.sendMessage(
          tabs[0].id,
          {from: 'popup', subject: 'imageData', breakpoints: breakpointNumbers},
          getImageData
        );
      }
    );
  });

  // assign the listener function to a variable so we can remove it later
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
        "from a content script:" + sender.tab.url :
        "from the extension"
      );
      if (request.greeting == "hello") {
        sendResponse({farewell: "goodbye"});
      }
    }
  );
}

function arrayToHtml(arr) {
  let html = '<ul>';
  arr.map(function(item) {
    html += '<li>' + item + 'px</li>';
  });
  html += '</ul>';

  return html;
}
