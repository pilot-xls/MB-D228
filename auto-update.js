// auto-update.js
// Faz verificação automática de atualizações de hora a hora e mostra um banner para atualizar

let newWorker;

// Mostra banner quando há nova versão
function showUpdateBanner() {
  const banner = document.createElement('div');
  banner.id = 'updateBanner';
  banner.innerHTML = `
    <div style="position: fixed; bottom: 0; width: 100%; background: #333; color: #fff; padding: 10px; text-align: center; z-index: 9999; font-size: 14px;">
      ⚠️ Nova versão disponível!
      <button id="refreshBtn" style="margin-left: 20px; padding: 6px 12px; font-size: 14px; cursor: pointer; background: #fff; color: #333; border: none; border-radius: 4px; font-weight: bold;">Atualizar agora</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('refreshBtn').addEventListener('click', () => {
    newWorker.postMessage({ action: 'skipWaiting' });
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then(reg => {
    
    // Verificar por nova versão a cada 1h
    setInterval(() => {
      reg.update();
    }, 60 * 1000); // 1h

    reg.addEventListener('updatefound', () => {
      newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner();
        }
      });
    });

    // Atualiza página automaticamente quando novo SW ativa
    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      window.location.reload();
      refreshing = true;
    });
  });
}
