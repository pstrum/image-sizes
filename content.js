chrome.runtime.sendMessage({greeting: "hello"}, function(response) {
  console.log(response.farewell);
});

chrome.runtime.onMessage.addListener((msg, sender, response) => {
  if ((msg.from == 'popup') && (msg.subject == 'imageData')) {
    const imageData = calculateImageData(msg.breakpoints);
    response(imageData);
  }
});

function calculateImageData(breakpoints) {
  const height = window.innerHeight;
  let images = [];

  breakpoints.forEach(function(breakpoint) {
    window.resizeTo(breakpoint, height);
    let htmlImgs = document.querySelectorAll('img');
    htmlImgs.forEach(function(htmlImg) {
      images.forEach(function(img) {
        if (img.src == htmlImg.src) {
          img.width.push(htmlImg.offsetWidth);
        } else if (images.length == 0) {
          images.push({
            src: img.src,
            width: [img.offsetWidth]
          });
        }
      });
    });
  });

  console.log(images);
  return images;
}