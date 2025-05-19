// Verifica se o browser suporta Service Workers
if ('serviceWorker' in navigator) {

  // Regista o service worker
  navigator.serviceWorker.register('service-worker.js').then(reg => {

    // Quando é encontrada uma nova versão do service worker
    reg.onupdatefound = () => {
      const newWorker = reg.installing;

      // Acompanha a mudança de estado do novo service worker
      newWorker.onstatechange = () => {

        // Quando a nova versão está instalada e já há um SW ativo
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Mostra o banner de atualização
          mostrarBannerDeAtualizacao();
        }
      };
    };

    // ⚠️ Verifica atualizações a cada 1 hora (3600000 ms)
    setInterval(() => {
      reg.update(); // Força o browser a verificar se há nova versão do SW
    }, 3600000);
  });
}

// Função para mostrar o banner de nova versão disponível
function mostrarBannerDeAtualizacao() {
  const banner = document.createElement('div');
  banner.innerHTML = '⚠️ Nova versão disponível. <button>Atualizar</button>';

  // Estilo do banner (posição fixa, centro inferior com animação)
  banner.style.position = 'fixed';
  banner.style.bottom = '-100px'; // Começa escondido
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

  // Estilo do botão dentro do banner
  const btn = banner.querySelector('button');
  btn.style.marginLeft = '15px';
  btn.style.background = '#000';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.padding = '6px 20px';
  btn.style.borderRadius = '4px';
  btn.style.cursor = 'pointer';

  // Quando se clica no botão, a página recarrega e aplica a nova versão
  btn.onclick = () => window.location.reload(true);

  // Adiciona o banner ao body
  document.body.appendChild(banner);

  // Passado um pequeno delay, o banner desliza para cima e aparece
  setTimeout(() => {
    banner.style.bottom = '20px';
  }, 200);
}
