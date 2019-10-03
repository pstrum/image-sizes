const breakpointData = document.getElementById('breakpointData');
const addBreakpoint = document.getElementById('addBreakpoint');
const clearBreakpoints = document.getElementById('clearBreakpoints');
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
    chrome.storage.sync.set({breakpoints: breakpoints}, function() {});
  }
};

clearBreakpoints.onclick = function(element) {
  chrome.storage.sync.clear();
  breakpoints = null;
  breakpointData.innerHTML = '<p>no breakpoints</p>';
}

function arrayToHtml(arr) {
  let html = '<ul>';
  arr.map(function(item) {
    html += '<li>' + item + 'px</li>';
  });
  html += '</ul>';

  return html;
}


// IMAGE WIDTHS STUFF //
// ================== //

chrome.webNavigation.onCompleted.addListener(function(details) {
  if (details.url == currentUrl && details.frameId == 0) {
    injectScript(currentWindow);
  }
});

chrome.runtime.onConnect.addListener(function(connection) {
  port = connection;
  connection.onMessage.addListener(function(msg) {
    if (msg.imageData) {
      updateImageData(msg.images);
    }
    if (msg.imagesLoaded) {
      console.log('images loaded!');
      imageData = [];
      chrome.windows.get(currentWindow.id, {windowTypes: ['popup']}, function(win) {
        currentWindow = win;
        if (breakpoints.length) {
          updateWindow();
        }
      });
    }
  });
});

// Open a popup and inject the content script
adjustWindowSize.onclick = element => {
  chrome.tabs.query({active: true, currentWindow: true}, openPopup);
}

const openPopup = tabs => {
  windowId = tabs[0].windowId;
  currentUrl = tabs[0].url;
  chrome.windows.create({url: currentUrl, top: 0, left: 0, focused: false, type: 'popup', width: Number(breakpoints[0])}, win => currentWindow = win);
};

const injectScript = win => {
  chrome.tabs.executeScript(
    win.tabs[0].id,
    {file: 'content.js', runAt: 'document_end'},
    function() {
      console.log('script injected');
      console.log('now inject imagesLoaded');
      injectImagesLoaded(win.tabs[0].id);
    }
  );
}

const injectImagesLoaded = tab => {
  chrome.tabs.executeScript(
    tab,
    {file: 'imagesLoadedPkg.js', runAt: 'document_end'},
    function() {
      console.log('imagesLoaded injected');
      console.log('now check for imagesLoaded...');
      port.postMessage({from: 'popup', subject: 'check images'});
    }
  );
};

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
    updateWindow();
  } else {
    currentBreak = 0;
    getImageData();
  }
}

const getImageData = function() {
  let dataHtml = '<ul class="results">';
  imageData.forEach(image => {
    const sizes = getImageSizes(image.width);
    const srcset = whittleDown(image.width);
    dataHtml += `<li>
                   <img src="${image.src}">
                   <dl>
                     <dt>srcset value</dt>
                     <dd><code>${srcset}</code></dd>
                     <dt>sizes value</dt>
                     <dd>${sizes}</dd>
                   </dl>
                 </li>`;
  });
  dataHtml += '</ul>';
  imageDataSection.innerHTML = dataHtml;
};

const getImageSizes = function(widths) {
  let returnString = '';
  widths.forEach((width, index) => {
    const breakpoint = Number(breakpoints[index]);
    const em = breakpoint / 16;
    const vw = Math.round((width / breakpoint) * 100);
    const comma = index == widths.length - 1 ? '' : ', ';
    returnString += `(max-width: ${em}em) ${vw}${comma}`;
  });
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
