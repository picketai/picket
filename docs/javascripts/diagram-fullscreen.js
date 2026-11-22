(function () {
  var ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline>' +
    '<line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';

  function toggle(diagram) {
    if (document.fullscreenElement) document.exitFullscreen();
    else diagram.requestFullscreen();
  }

  function addButton(diagram) {
    if (diagram.dataset.fullscreenReady) return;
    diagram.dataset.fullscreenReady = "1";
    var button = document.createElement("button");
    button.type = "button";
    button.className = "diagram-fullscreen";
    button.title = "Enlarge the diagram";
    button.setAttribute("aria-label", "Enlarge the diagram");
    button.innerHTML = ICON;
    button.addEventListener("click", function () {
      toggle(diagram);
    });
    diagram.addEventListener("click", function () {
      if (document.fullscreenElement === diagram) document.exitFullscreen();
    });
    diagram.parentNode.insertBefore(button, diagram);
  }

  function scan() {
    document.querySelectorAll("div.mermaid").forEach(addButton);
  }

  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
})();
