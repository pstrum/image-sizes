const breakpointData = document.getElementById('breakpointData');
const addBreakpoint = document.getElementById('addBreakpoint');
const clearBreakpoints = document.getElementById('clearBreakpoints');
const clearPreviousResults = document.getElementById('clearResults');
const adjustWindowSize = document.getElementById('adjustWindowSize');
const imageDataSection = document.getElementById('imageData');
let port = null;
let currentUrl = null;
let breakpoints = null;
let imageData = [];
let currentBreak = 0;
let currentWindow = null;
let windowId = null;

// BREAKPOINTS STUFF //
// ================= //
chrome.storage.sync.get('breakpoints', function(data) {
  const nobreakpoints = Object.entries(data).length === 0 && data.constructor === Object;
  if (nobreakpoints) {
    breakpointData.innerHTML = '<p style="font-style: italic;">no breakpoints</p>';
  } else {
    breakpointData.innerHTML = arrayToHtml(data.breakpoints);

    // Set stored breakpoints to variable
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
    chrome.storage.sync.set({breakpoints: breakpoints});
  }
}

clearBreakpoints.onclick = function(element) {
  chrome.storage.sync.remove('breakpoints');
  breakpoints = null;
  breakpointData.innerHTML = '<p>no breakpoints</p>';
}

clearPreviousResults.onclick = function(element) {
  chrome.storage.sync.remove('results');
  imageData = null;
  imageDataSection.innerHTML = '<p>no previous data</p>';
}

function arrayToHtml(arr) {
  let html = '<ul>';
  arr.map(item => html += '<li>' + item + 'px</li>');
  html += '</ul>';
  return html;
}


// IMAGE WIDTHS STUFF //
// ================== //

// Get previously calculated values, if there are any
chrome.storage.sync.get('results', function(data) {
  const noPreviousResults = Object.entries(data).length === 0 && data.constructor === Object;
  if (!noPreviousResults) {
    imageData = data.results;
    getImageData();
  }
});

// Open a popup and inject the content script
adjustWindowSize.onclick = element => {
  chrome.tabs.query({active: true, currentWindow: true}, openPopup);
}

// After the popup is created, inject content script with port to message with
chrome.webNavigation.onCompleted.addListener(function(details) {
  if (details.url == currentUrl && details.frameId == 0) {
    creatPortListener(currentWindow);
  }
});

// Watch for messages from the popup; if user continues start getting image data
chrome.runtime.onConnect.addListener(function(connection) {
  port = connection;
  connection.onMessage.addListener(function(msg) {
    if (msg.mainScriptInjected) {
      showPopupInstructions(currentWindow);
    }
    if (msg.imageData) {
      updateImageData(msg.images);
    }
    if (msg.userContinued) {
      imageData = [];
      if (breakpoints.length) {
        updateWindow();
      }
    }
  });
});

function openPopup(tabs) {
  windowId = tabs[0].windowId;
  currentUrl = tabs[0].url;
  chrome.windows.create({
    url: currentUrl,
    top: 0,
    left: 0,
    focused: false,
    type: 'popup',
    width: Number(breakpoints[0])
  }, win => currentWindow = win);
}

function creatPortListener(win) {
  chrome.tabs.executeScript(
    win.tabs[0].id,
    {file: 'content.js', runAt: 'document_end'}
  );
}

function showPopupInstructions(win) {
  chrome.tabs.executeScript(
    win.tabs[0].id,
    {file: 'popup-instructions.js', runAt: 'document_end'},
    () => port.postMessage({from: 'popup', subject: 'monitorIfUserContinued'})
  );
}

function updateImageData(newImages) {
  if (!imageData.length) {
    newImages.forEach(newImage => {
      imageData.push(newImage);
    });
  } else {
    newImages.forEach((newImage, index) => {
      imageData[index].width.push(newImage.width[0]);
    });
  }

  currentBreak += 1;
  if (breakpoints[currentBreak]) {
    updateWindow();
  } else {
    currentBreak = 0;
    getImageData();
  }
}

function getImageData() {
  let dataHtml = '<ul class="results">';
  const filteredImageData = imageData.filter(image => image.src != '');
  filteredImageData.forEach(image => {
    const sizes = getImageSizes(image.width);
    const srcset = whittleDown(image.width);
    let srcsetPresent = '<p>[</p>';
    srcset.map((src, index) => {
      const comma = index !== srcset.length - 1 ? ',' : '';
      return srcsetPresent += `<p>&nbsp;&nbsp;{ width: ${src} }${comma}</p>`;
    });
    srcsetPresent += '<p>]</p>';
    dataHtml += `<li>
                   <img src="${image.src}">
                   <dl>
                     <dt>srcset value</dt>
                     <dd><code>${srcsetPresent}</code></dd>
                     <dt>sizes value</dt>
                     <dd>${sizes}</dd>
                   </dl>
                 </li>`;
  });
  dataHtml += '</ul>';
  imageDataSection.innerHTML = dataHtml;
  const imgs = document.querySelectorAll('.results img');
  imgs.forEach(img => {
    img.addEventListener('mouseenter', toggleBiggerImage);
    img.addEventListener('mouseleave', toggleBiggerImage);
  });

  chrome.storage.sync.set({results: imageData}, function() {});
}

function toggleBiggerImage(event) {
  const src = event.currentTarget.src;
  const parent = event.currentTarget.parentNode;
  if (event.type == 'mouseenter') {
    const bigImage = document.createElement('img');
    bigImage.src = src;
    bigImage.classList.add('bigger-result');
    parent.classList.add('bigger-visible');
    parent.appendChild(bigImage);
  } else if (event.type == 'mouseleave') {
    if (parent.classList.contains('bigger-visible')) {
      parent.classList.remove('bigger-visible');
    }
    const bigImages = document.querySelectorAll('.bigger-result');
    bigImages.forEach(image => image.remove());
  }
}

function getImageSizes(widths) {
  let returnString = '';
  widths.forEach((width, index) => {
    const breakpoint = Number(breakpoints[index]);
    const em = breakpoint / 16;
    const vw = Math.round((width / breakpoint) * 100);
    returnString += `(max-width: ${em}em) ${vw}vw, `;
  });
  returnString += `${widths[0]}px`;
  return returnString;
}

function updateWindow() {
  chrome.windows.update(currentWindow.id, {width: Number(breakpoints[currentBreak])}, function(win) {
    port.postMessage({from: 'popup', subject: 'getImageData'});
  });
}

function whittleDown(imageWidths) {
  const sizeGap = 50;
  let addRetina = [];
  imageWidths.forEach(imageWidth => {
    addRetina.push(imageWidth);
    addRetina.push(imageWidth * 2);
  });
  const sortedImageSizes = addRetina.sort((a, b) => b - a);
  const lastSortedImageIndex = sortedImageSizes.length - 1;
  let lastFilteredSize = sortedImageSizes[0];

  return sortedImageSizes.filter((current, index) => {
    if (index == 0) {
      return current;
    } else if (Math.abs(current - lastFilteredSize) > sizeGap) {
      lastFilteredSize = current;
      return current;
    } else if (index == lastSortedImageIndex && Math.abs(current - lastFilteredSize) > 20) {
      return current;
    }
  });
}
