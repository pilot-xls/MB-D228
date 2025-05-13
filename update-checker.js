if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then(reg => {
    reg.onupdatefound = () => {
      const newWorker = reg.installing;
      newWorker.onstatechange = () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          mostrarBannerDeAtualizacao();
        }
      };
    };
  });
}

function mostrarBannerDeAtualizacao() {
  const banner = document.createElement('div');
  banner.innerHTML = '⚠️ Nova versão disponível. <button>Atualizar</button>';

  banner.style.position = 'fixed';
  banner.style.bottom = '-100px';
  banner.style.left = '50%';
  banner.style.transform = 'translateX(-50%)';
  banner.style.background = '#ffcc00';
  banner.style.color = '#000';
  banner.style.padding = '12px 20px';
  banner.style.boxShadow = '0 0 10px rgba(0,0,0,0.25)';
  banner.style.borderRadius = '10px';
  banner.style.zIndex = '9999';
  banner.style.fontWeight = 'bold';
  banner.style.transition = 'bottom 0.5s ease';

  const btn = banner.querySelector('button');
  btn.style.marginLeft = '15px';
  btn.style.background = '#000';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.padding = '6px 12px';
  btn.style.borderRadius = '4px';
  btn.style.cursor = 'pointer';

  btn.onclick = () => window.location.reload(true);

  document.body.appendChild(banner);
  setTimeout(() => {
    banner.style.bottom = '20px';
  }, 200);
}
