const port = chrome.runtime.connect();
const images = document.querySelectorAll('img');
const imageSizes = calculateImageData(images);
port.postMessage({connectionSuccessful: true});
port.onMessage.addListener(msg => {
  const images = document.querySelectorAll('img');
  if (msg.from == 'popup') {
    switch(msg.subject) {
      case 'getImageData':
        const imageData = calculateImageData(images);
        console.log(imageData);
        port.postMessage({imageData: true, images: imageData});
    }
  }
});

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
