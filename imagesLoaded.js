ready(function() {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/imagesloaded@4/imagesloaded.pkgd.js'
  script.onload = function() {
    console.log('imagesLoaded library...loaded :)');
  };
  document.body.appendChild(script);
});

function ready(fn) {
  if (document.readyState != 'loading'){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}
