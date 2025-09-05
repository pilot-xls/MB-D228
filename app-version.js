// Versão da app (manual)
const APP_VERSION = 'v906';

document.addEventListener("DOMContentLoaded", () => {
  const footerVersion = document.getElementById("versaoApp");
  if (footerVersion) {
    footerVersion.textContent = APP_VERSION;
  }
});