const breakpointData = document.getElementById('breakpointData');
const addBreakpoint = document.getElementById('addBreakpoint');
const clearBreakpoints = document.getElementById('clearBreakpoints');
const clearPreviousResults = document.getElementById('clearResults');
const adjustWindowSize = document.getElementById('adjustWindowSize');
const imageDataSection = document.getElementById('imageData');
const breakpointWidth = document.getElementById('breakpointWidth');
let port = null;
let currentUrl = null;
let breakpoints = [];
let imageData = [];
let currentBreak = 0;
let currentWindow = null;
let windowId = null;

// BREAKPOINTS STUFF //
// ================= //
chrome.storage.sync.get('breakpoints', function(data) {
  const nobreakpoints = Object.entries(data).length === 0 && data.constructor === Object;
  if (nobreakpoints) {
    addOneBreakpoint();
  } else {
    data.breakpoints.forEach(breakpoint => {
      const input = addBreakpointInput(breakpoint)
      breakpointData.appendChild(input);
    });
    breakpoints = data.breakpoints;
  }
});

clearBreakpoints.onclick = function(element) {
  chrome.storage.sync.remove('breakpoints');
  breakpoints = null;
  breakpointData.innerHTML = null;
  addOneBreakpoint();
}

clearPreviousResults.onclick = function(element) {
  chrome.storage.sync.remove('results');
  imageData = null;
  imageDataSection.innerHTML = '<p>no previous data</p>';
}

function updateBreakpointStorage() {
  const breaks = breakpointData.querySelectorAll('input');
  breakpoints = [];
  breaks.forEach(breakpoint => breakpoints.push(breakpoint.value));
  chrome.storage.sync.set({breakpoints: breakpoints});
}

function addBreakpointInput(breakpoint) {
  const wrapper = document.createElement('div');
  const input = document.createElement('input');
  const inputPx = document.createElement('span');
  inputPx.innerText = 'px';
  inputPx.style.display = 'none';
  inputPx.style.marginLeft = '-22px';
  input.type = 'number';
  input.placeholder = 'add a breakpoint';
  input.style.width = '128px';
  addInputListener(input, inputPx);

  if (breakpoint) {
    input.value = breakpoint;
    updateInputStyling(input, inputPx);
  }

  wrapper.appendChild(input);
  wrapper.appendChild(inputPx);
  wrapper.appendChild(createDeleteButton());
  return wrapper;
}

function createDeleteButton() {
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.classList.add('delete-btn');
  deleteBtn.innerText = 'remove';
  deleteBtn.addEventListener('click', event => {
    const thisNode = event.currentTarget.parentNode;
    const grandParent = thisNode.parentNode;
    grandParent.removeChild(thisNode);
    updateBreakpointStorage();
  });
  return deleteBtn;
}

function updateInputStyling(input, px) {
  input.style.paddingRight = '22px';
  breakpointWidth.innerText = input.value;
  input.style.width = breakpointWidth.clientWidth + 3 + 'px';
  px.style.display = 'inline-block';
}

function addInputListener(input, px) {
  input.addEventListener('input', event => {
    updateBreakpointStorage();
    const nextSibling = event.currentTarget.parentNode.nextSibling;
    if (event.currentTarget.value) {
      updateInputStyling(event.currentTarget, px);

      if (!nextSibling) {
        const nextBreakpoint = addBreakpointInput();
        breakpointData.appendChild(nextBreakpoint);
      }
    } else {
      px.style.display = 'none';
      input.style.width = '128px';
      input.style.paddingRight = '0px';

      if (nextSibling) {
        const nextSiblingInput = nextSibling.querySelector('input');
        if (!nextSiblingInput.value) {
          const grandParent = event.currentTarget.parentNode.parentNode;
          grandParent.removeChild(grandParent.lastChild);
        }
      }
    }
  });

  px.addEventListener('click', event => firstInput.focus());
}

function addOneBreakpoint() {
  const firstInput = addBreakpointInput();
  breakpointData.appendChild(firstInput);
  firstInput.querySelector('input').focus();
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
  let dataHtml = '<div class="hint"><b>Hint:</b> Hover over images to enlarge them.</div><ul class="results">';
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
