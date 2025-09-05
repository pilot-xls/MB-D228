// Versão da app (manual)
const APP_VERSION = 'v907';

document.addEventListener("DOMContentLoaded", () => {
  const footerVersion = document.getElementById("versaoApp");
  if (footerVersion) {
    footerVersion.textContent = APP_VERSION;
  }
});