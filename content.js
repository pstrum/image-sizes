const port = chrome.runtime.connect();

port.postMessage({mainScriptInjected: true});

port.onMessage.addListener(msg => {
  if (msg.from == 'popup') {
    switch(msg.subject) {
      case 'getImageData':
        const images = document.querySelectorAll('img');
        const imageData = calculateImageData(images);
        setTimeout(() => port.postMessage({imageData: true, images: imageData}), 500);
        break;
      case 'monitorIfUserContinued':
        monitorIfUserContinued();
    }
  }
});

function monitorIfUserContinued() {
  const instructions = document.getElementById('extInstructions');
  const continueBtn = document.getElementById('continueBtn');
  continueBtn.addEventListener('click', (event) => {
    document.body.removeChild(instructions);
    port.postMessage({userContinued: true});
  });
}

function calculateImageData(images) {
  let imageSrcAndWidths = [];
  images.forEach(image => {
    imageSrcAndWidths.push({
      src: image.src,
      width: [image.offsetWidth]
    });
  });
  return imageSrcAndWidths;
}
