const port = chrome.runtime.connect();
const images = document.querySelectorAll('img');
const imageSizes = calculateImageData(images);

// imagesLoaded(document.querySelectorAll('img'), () => port.postMessage({imagesLoaded: true}));

port.onMessage.addListener(msg => {
  const images = document.querySelectorAll('img');
  if (msg.from == 'popup') {
    switch(msg.subject) {
      case 'getImageData':
        const imageData = calculateImageData(images);
        console.log(imageData);
        setTimeout(() => {
          port.postMessage({imageData: true, images: imageData});
        }, 500);
        break;
      case 'check images':
        ready(() => {
          const images = document.querySelectorAll('img');
          console.log(images);
          imagesLoaded(images, () => {
            console.log('all images loaded!')
            port.postMessage({imagesLoaded: true});
          });
        });
        break;
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

function ready(fn) {
  document.addEventListener('DOMContentLoaded', fn);
  if (document.readyState == 'interactive' || document.readyState == 'complete' ) {
    fn();
  }
}
