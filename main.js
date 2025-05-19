// main.js - Lógica principal da app Mass & Balance

// Obtem as definições guardadas no localStorage
function getDefs() {
  return JSON.parse(localStorage.getItem('definicoesMB')) || {};
}

// Preenche o dropdown com os aviões guardados
function preencherDropdown() {
  const defs = getDefs();
  const select = document.getElementById("aviaoSelecionado");
  if (!select) return;

  const avioes = defs.avioes || [];
  const ultimaSelecao = parseInt(localStorage.getItem('aviaoSelecionadoIndex')) || 0;

  select.innerHTML = "";
  avioes.forEach((aviao, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.text = `${aviao.nome} (${aviao.peso} kg)`;
    if (index === ultimaSelecao) opt.selected = true;
    select.appendChild(opt);
  });
}

// Função principal de cálculo do Mass & Balance
function calculate() {
  const defs = getDefs();
  const pesoHomem = defs.pesoHomem || 86;
  const pesoMulher = defs.pesoMulher || 68;
  const pesoCrianca = defs.pesoCrianca || 35;
  const pesoBagagem = defs.pesoBagagem || 10;

  document.getElementById("labelHomens").innerText = `Homens (${pesoHomem}kg)`;
  document.getElementById("labelMulheres").innerText = `Mulheres (${pesoMulher}kg)`;
  document.getElementById("labelCriancas").innerText = `Crianças (${pesoCrianca}kg)`;
  document.getElementById("labelBagagem").innerText = `Bagagem extra (${pesoBagagem}kg)`;

  const avioes = defs.avioes || [];
  const select = document.getElementById("aviaoSelecionado");
  const selectedIndex = select ? select.selectedIndex : 0;
  const aviao = avioes[selectedIndex];
  if (!aviao) return;

  localStorage.setItem('aviaoSelecionadoIndex', selectedIndex);

  const men = parseInt(document.getElementById('men').value) || 0;
  const women = parseInt(document.getElementById('women').value) || 0;
  const children = parseInt(document.getElementById('children').value) || 0;
  const extraBag = parseFloat(document.getElementById('extraBag').value) || 0;
  const pilots = parseFloat(document.getElementById('pilots').value) || 0;
  const manualPayload = parseFloat(document.getElementById('manualPayload').value) || 0;
  const fuel = parseFloat(document.getElementById('fuel').value) || 0;
  const fuelTaxi = parseFloat(document.getElementById('fuelTaxi').value) || 0;
  const fuelDest = parseFloat(document.getElementById('fuelDest').value) || 0;

  const payload = men * pesoHomem + women * pesoMulher + children * pesoCrianca + extraBag;
  document.getElementById('menWeight').innerText = men * pesoHomem;
  document.getElementById('womenWeight').innerText = women * pesoMulher;
  document.getElementById('childrenWeight').innerText = children * pesoCrianca;
  document.getElementById('totalPayload').innerText = payload + men * pesoBagagem + women * pesoBagagem;

  const momentPilots = pilots * 4.21;
  const momentPayload = manualPayload * 8.7;
  const momentFuel = fuel * 7.936;
  const momentTaxi = fuelTaxi * 7.936;
  const momentDest = fuelDest * 7.936;

  const zfw = aviao.peso + pilots + manualPayload;
  const momentZfw = aviao.momento + momentPilots + momentPayload;
  const rampWeight = zfw + fuel;
  const momentRamp = momentZfw + momentFuel;
  const takeoffWeight = rampWeight - fuelTaxi;
  const momentTakeoff = momentRamp - momentTaxi;
  const landingWeight = takeoffWeight - fuelDest;
  const momentLanding = momentTakeoff - momentDest;

  const macTakeoff = ((momentTakeoff / takeoffWeight - 7.26) / 2.042) * 100;
  const macLanding = ((momentLanding / landingWeight - 7.26) / 2.042) * 100;

  document.getElementById("basicWeight").innerText = aviao.peso;
  document.getElementById("basicMoment").innerText = aviao.momento;
  document.getElementById('momentPilots').innerText = momentPilots.toFixed(1);
  document.getElementById('momentPayload').innerText = momentPayload.toFixed(1);
  document.getElementById('zfw').innerText = zfw.toFixed(1);
  document.getElementById('momentZfw').innerText = momentZfw.toFixed(1);
  document.getElementById('momentFuel').innerText = momentFuel.toFixed(1);
  document.getElementById('rampWeight').innerText = rampWeight.toFixed(1);
  document.getElementById('momentRamp').innerText = momentRamp.toFixed(1);
  document.getElementById('momentTaxi').innerText = momentTaxi.toFixed(1);
  document.getElementById('takeoffWeight').innerText = takeoffWeight.toFixed(1);
  document.getElementById('momentTakeoff').innerText = momentTakeoff.toFixed(1);
  document.getElementById('macTakeoff').innerText = macTakeoff.toFixed(1);
  document.getElementById('momentDest').innerText = momentDest.toFixed(1);
  document.getElementById('landingWeight').innerText = landingWeight.toFixed(1);
  document.getElementById('momentLanding').innerText = momentLanding.toFixed(1);
  document.getElementById('macLanding').innerText = macLanding.toFixed(1);

  // Limites e avisos
  const effectivePayload = manualPayload > 0 ? manualPayload : payload;
  let maxPayload = 5730 - (aviao.peso + pilots + fuel);
  let maxFuel = 5730 - (aviao.peso + pilots + effectivePayload);

  document.getElementById('maxPayloadNote').innerText = maxPayload > 0
    ? ` | Máx Payload: ${maxPayload.toFixed(0)} kg`
    : " | Excede limite!";

  document.getElementById('maxFuelNote').innerHTML = maxFuel > 0
    ? `<small> | Máx Fuel: ${maxFuel.toFixed(0)} kg (${(maxFuel * 2.20462).toFixed(0)} lb)</small>`
    : "<small> | Excede limite!</small>";

  // Destaques visuais
  document.getElementById('rampWeight').classList.toggle('exceeded', rampWeight > 5730);
  document.getElementById('takeoffWeight').classList.toggle('exceeded', takeoffWeight > 5700);
  document.getElementById('landingWeight').classList.toggle('exceeded', landingWeight > 5700);

  document.getElementById('rampRow').style.backgroundColor = rampWeight > 5730 ? '#ffcccc' : '';
  document.getElementById('takeoffRow').style.backgroundColor = takeoffWeight > 5700 ? '#ffcccc' : '';
  document.getElementById('landingRow').style.backgroundColor = landingWeight > 5700 ? '#ffcccc' : '';
}

// Conversores
function convertKgToLb() {
  const kg = parseFloat(document.getElementById('kg').value) || 0;
  document.getElementById('toLb').innerText = (kg * 2.20462).toFixed(1);
}

function convertLbToKg() {
  const lb = parseFloat(document.getElementById('lb').value) || 0;
  document.getElementById('toKg').innerText = (lb / 2.20462).toFixed(1);
}

// Inicializa ao carregar
window.onload = () => {
  preencherDropdown();
  calculate();

  // Selecionar automaticamente os valores nos inputs e navega com Enter
  const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
  inputs.forEach((input, index) => {
    input.addEventListener('focus', () => input.select());

    input.addEventListener('keypress', (e) => {
      const char = String.fromCharCode(e.which);
      if (!/[0-9.]/.test(char)) e.preventDefault();

      if (e.key === 'Enter') {
        e.preventDefault();
        const next = inputs[index + 1];
        if (next) next.focus();
        else input.blur();
      }
    });

    input.addEventListener('input', calculate);
  });
};
