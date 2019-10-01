chrome.devtools.panels.elements.createSidebarPane("Responsive Images",
  function(sidebar) {

    function getPanelContents() {
      return {
        "element" : {
          tag: $0.tagName,
          width: $0.offsetWidth
        }
      }
    }

    function updateContent() {
      sidebar.setExpression("(" + getPanelContents.toString() + ")()", "Element Details", function() {

      });
    }

    updateContent();

    chrome.devtools.panels
      .elements
      .onSelectionChanged
      .addListener(updateContent);
  }
);
