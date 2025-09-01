// auto-update.js
// Mostra banner quando o service worker deteta nova versão

navigator.serviceWorker.addEventListener('message', event => {
  if (event.data && event.data.type === 'NEW_VERSION') {
    const banner = document.getElementById("update-banner");
    if (banner) {
      banner.style.display = "block";

      const button = banner.querySelector("button");
      if (button) {
        button.addEventListener("click", () => {
          window.location.reload();
        });
      }
    }
  }
});
