// Constantes para braços de momento e MAC
const ARM_PILOT = 4.21;
const ARM_PAYLOAD = 8.7;
const ARM_FUEL = 7.936;
const MAC_ZERO = 7.26;
const MAC_DIV = 2.042;

// --- Funções de Definições ---
function getDefs() {
  try {
    return JSON.parse(localStorage.getItem('definicoesMB')) || {};
  } catch (e) {
    console.error('Definições inválidas no localStorage:', e);
    return {};
  }
}

function getAviaoAtual() {
  const defs = getDefs();
  const select = document.getElementById('aviaoSelecionado');
  const idx = select ? select.selectedIndex : 0;
  localStorage.setItem('aviaoSelecionadoIndex', idx);
  const av = (defs.avioes && defs.avioes[idx]) || {};
  return {
    nome:    av.nome    || '—',
    peso:    av.peso    || 0,
    momento: av.momento || 0,
    MRW:     av.MRW     || 0,
    MTOW:    av.MTOW    || 0,
    MLW:     av.MLW     || 0
  };
}

function preencherDropdown() {
  const defs = getDefs();
  const select = document.getElementById('aviaoSelecionado');
  if (!select) return;
  const avioes = defs.avioes || [];
  const lastIdx = parseInt(localStorage.getItem('aviaoSelecionadoIndex')) || 0;
  select.innerHTML = '';
  avioes.forEach((av, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${av.nome} (${av.peso} kg)`;
    if (i === lastIdx) opt.selected = true;
    select.appendChild(opt);
  });
}

// --- Cálculo Mass & Balance ---
function calculate() {
  const { peso: BEW, momento, MRW, MTOW, MLW } = getAviaoAtual();
  const pilots = parseFloat(document.getElementById('pilots').value) || 0;
  const manualPayload = parseFloat(document.getElementById('manualPayload').value) || 0;
  const fuel = parseFloat(document.getElementById('fuel').value) || 0;
  const fuelTaxi = parseFloat(document.getElementById('fuelTaxi').value) || 0;
  const fuelDest = parseFloat(document.getElementById('fuelDest').value) || 0;

  // Cálculo dos momentos
  const momentPilots  = pilots * ARM_PILOT;
  const momentPayload = manualPayload * ARM_PAYLOAD;
  const momentFuel    = fuel * ARM_FUEL;
  const momentTaxi    = fuelTaxi * ARM_FUEL;
  const momentDest    = fuelDest * ARM_FUEL;

  // Pesos compostos
  const zfw            = BEW + pilots + manualPayload;
  const momentZfw      = momento + momentPilots + momentPayload;
  const rampWeight     = zfw + fuel;
  const momentRamp     = momentZfw + momentFuel;
  const takeoffWeight  = rampWeight - fuelTaxi;
  const momentTakeoff  = momentRamp - momentTaxi;
  const landingWeight  = takeoffWeight - fuelDest;
  const momentLanding  = momentTakeoff - momentDest;

  // Cálculo de MAC
  const macTakeoff = ((momentTakeoff / takeoffWeight - MAC_ZERO) / MAC_DIV) * 100;
  const macLanding = ((momentLanding / landingWeight - MAC_ZERO) / MAC_DIV) * 100;

  // Atualizar DOM
  document.getElementById('basicWeight').innerText   = BEW.toFixed(0);
  document.getElementById('basicMoment').innerText   = momento;
  document.getElementById('momentPilots').innerText  = momentPilots.toFixed(1);
  document.getElementById('momentPayload').innerText = momentPayload.toFixed(1);
  document.getElementById('zfw').innerText           = zfw.toFixed(0);
  document.getElementById('momentZfw').innerText     = momentZfw.toFixed(1);
  document.getElementById('momentFuel').innerText    = momentFuel.toFixed(1);
  document.getElementById('rampWeight').innerText    = rampWeight.toFixed(0);
  document.getElementById('momentRamp').innerText    = momentRamp.toFixed(1);
  document.getElementById('momentTaxi').innerText    = momentTaxi.toFixed(1);
  document.getElementById('takeoffWeight').innerText = takeoffWeight.toFixed(0);
  document.getElementById('momentTakeoff').innerText = momentTakeoff.toFixed(1);
  document.getElementById('macTakeoff').innerText    = macTakeoff.toFixed(1);
  document.getElementById('momentDest').innerText    = momentDest.toFixed(1);
  document.getElementById('landingWeight').innerText = landingWeight.toFixed(0);
  document.getElementById('momentLanding').innerText = momentLanding.toFixed(1);
  document.getElementById('macLanding').innerText    = macLanding.toFixed(1);

  //
  // --- Notas de limite ---
  // 1) Máx Fuel (vai aparecer na row do Payload)
  const maxFuel = MRW - (BEW + pilots + manualPayload);
  const fuelNote = document.getElementById('maxFuelNote');
  if (maxFuel >= 0) {
    fuelNote.innerHTML = `<small> | Máx Fuel: ${maxFuel.toFixed(0)} kg (${(maxFuel * 2.20462).toFixed(0)} lb)</small>`;
  } else {
    fuelNote.innerHTML = '<small> | Excede limite!</small>';
  }
  
  // 2) Máx Payload (vai aparecer na row do Fuel loading)
  const maxPayload = MRW - (BEW + pilots + fuel);
  const payloadNote = document.getElementById('maxPayloadNote');
  if (maxPayload >= 0) {
    payloadNote.innerText = ` | Máx Payload: ${maxPayload.toFixed(0)} kg`;
  } else {
    payloadNote.innerText = ' | Excede limite!';
  } 
  
  
  // Destacar linhas excedidas
  ['rampRow','takeoffRow','landingRow'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const weight = id==='rampRow'? rampWeight : id==='takeoffRow'? takeoffWeight: landingWeight;
    const limit  = id==='rampRow'? MRW : id==='takeoffRow'? MTOW      : MLW;
    el.classList.toggle('exceeded', weight>limit);
  });
}

// --- Conversores ---
function convertKgToLb() {
  const kg = parseFloat(document.getElementById('kg').value)||0;
  document.getElementById('toLb').innerText = (kg*2.20462).toFixed(1);
}
function convertLbToKg() {
  const lb = parseFloat(document.getElementById('lb').value)||0;
  document.getElementById('toKg').innerText = (lb/2.20462).toFixed(1);
}

// --- Rotas e Legs ---

let legsData = [];
let legEmEdicao = null;
let linhaSelecionadaIndex = null;

function carregarLegsDoLocalStorage() {
  let dados = localStorage.getItem('legsDataV2');
  if (dados) {
    legsData = JSON.parse(dados);
  } else {
    legsData = Array(5).fill(0).map(()=>({homens:0, mulheres:0, criancas:0, bagagem:0, payload:0}));
  }
}
function guardarLegsNoLocalStorage() {
  localStorage.setItem('legsDataV2', JSON.stringify(legsData));
}
function selecionarLinhaLeg(tr) {
  document.querySelectorAll('#legsTable tr').forEach(row => row.classList.remove('selected'));
  tr.classList.add('selected');
  linhaSelecionadaIndex = Array.from(tr.parentNode.children).indexOf(tr);
}
function preencherDropdownRotas() {
    const rotas = JSON.parse(localStorage.getItem("rotasPadrao") || "[]");
    const dropdown = document.getElementById("dropdownRotas");
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">-- Selecionar rota --</option>';
    rotas.forEach((r, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.text = r.nome;
        dropdown.appendChild(opt);
    });
}
function criarLinhaLeg(route = '', depF = '', payl = '', tripF = '') {
    const tbody = document.getElementById('legsTable');
    const tr = document.createElement('tr');

    tr.innerHTML = `
        <td class="rota-col" onclick="editarRota(this)">
          <div class="rota-visual">${route}</div>
          <input type="text" class="rota-edit" value="${route}" onblur="fecharRota(this)" style="display: none;">
        </td>
        <td><input type="number" inputmode="decimal" step="any" value="${depF}" data-auto="1"></td>
        <td>
		<input type="number" inputmode="decimal" step="any" value="${payl}" 
		style="width:60px"
		onclick="abrirPopupPayload(this)" 
		readonly>
	</td>
        <td><input type="number" inputmode="decimal" step="any" value="${tripF}"></td>
        <td class="ldg">0</td>
        <td><button class="route-insert" onclick="inserirLeg(this)">+</button></td>
    `;

    tr.addEventListener('click', function(e) {
      if (e.target.tagName === "BUTTON") return;
      selecionarLinhaLeg(tr);
    });

    tbody.appendChild(tr);

    tr.querySelectorAll('input').forEach(input => {
        input.addEventListener('focus', () => input.select());
        input.addEventListener('input', () => {
            input.dataset.auto = "0";
            updateLdgAuto();
            guardarLegs();
        });
    });

    updateLdgAuto();
}
function editarRota(td) {
    const div = td.querySelector('.rota-visual');
    const input = td.querySelector('.rota-edit');
    input.value = div.textContent.trim();
    div.style.display = "none";
    input.style.display = "block";
    input.focus();
    input.select();
}
function fecharRota(input) {
    const td = input.parentElement;
    const div = td.querySelector('.rota-visual');
    div.textContent = input.value.trim();
    input.style.display = "none";
    div.style.display = "block";
    updateLdgAuto();
    guardarLegs();
}
function guardarLegs() {
    const linhas = [...document.querySelectorAll('#legsTable tr')];
    const dados = linhas.map(row => ({
        route: row.cells[0].querySelector('.rota-edit').value.trim(),
        depF: row.cells[1].querySelector("input")?.value || '',
        payl: row.cells[2].querySelector("input")?.value || '',
        tripF: row.cells[3].querySelector("input")?.value || ''
    }));
    localStorage.setItem('rotaAtiva', JSON.stringify(dados));
}
function carregarLegs() {
    const dados = JSON.parse(localStorage.getItem('rotaAtiva') || '[]');
    const tbody = document.getElementById("legsTable");
    tbody.innerHTML = "";

    if (dados.length === 0) {
        for (let i = 0; i < 5; i++) criarLinhaLeg();
    } else {
        dados.forEach(l => criarLinhaLeg(l.route, l.depF, l.payl, l.tripF));
    }
}
function preencherLegsComRota() {
    const dropdown = document.getElementById("dropdownRotas");
    const idx = dropdown.value;
    localStorage.setItem('rotaSelecionadaIndex', dropdown.selectedIndex);

    if (idx === "") {
        const tbody = document.getElementById("legsTable");
        tbody.innerHTML = "";
        for (let i = 0; i < 5; i++) criarLinhaLeg();
        localStorage.removeItem('rotaAtiva');
        guardarLegs();
        return;
    }
    const rotas = JSON.parse(localStorage.getItem("rotasPadrao") || "[]");
    if (!rotas[idx]) return;

    const rotaSelecionada = rotas[idx];
    const tbody = document.getElementById("legsTable");
    tbody.innerHTML = "";

    rotaSelecionada.legs.forEach(leg => {
        criarLinhaLeg(leg.route, leg.depF, leg.payl, leg.tripF);
    });

    guardarLegs();
updateLdgAuto();
}
function inserirLeg(btn) {
    const row = btn.closest("tr");
    const depFuelLb = parseFloat(row.cells[1].querySelector("input")?.value || 0);
    const payloadKg = parseFloat(row.cells[2].querySelector("input")?.value || 0);
    const tripFuelLb = parseFloat(row.cells[3].querySelector("input")?.value || 0);
    const depFuelKg = depFuelLb / 2.20462;
    const tripFuelKg = tripFuelLb / 2.20462;
    document.getElementById("manualPayload").value = Math.round(payloadKg);
    document.getElementById("fuel").value = Math.round(depFuelKg);
    document.getElementById("fuelDest").value = Math.round(tripFuelKg);
    if (typeof calculate === "function") calculate();
}
function updateLdgAuto() {
    const rows = document.querySelectorAll("#legsTable tr");
    rows.forEach((row, i) => {
        const inputs     = row.querySelectorAll("td input");
        const depFuelLb  = parseFloat(inputs[1].value) || 0;
        const payloadKg  = Math.round(parseFloat(inputs[2].value) || 0);
        const tripLb     = parseFloat(inputs[3].value) || 0;
        const BEW        = parseFloat(document.getElementById("basicWeight").innerText) || 0;
        const pilots     = parseFloat(document.getElementById("pilots").value) || 0;
        const taxiKg     = parseFloat(document.getElementById("fuelTaxi").value) || 0;
        const depFuelKg  = Math.round(depFuelLb / 2.20462);
        const maxFuelKg  = 5730 - (BEW + pilots + payloadKg);
        const maxFuelLb  = Math.round(maxFuelKg * 2.20462);
        const maxPayloadKg = 5730 - (BEW + pilots + depFuelKg);
	const TakeoffUnderLoad = 5700 - (BEW + pilots + payloadKg + depFuelKg - taxiKg);    
        const ldgCell = row.querySelector(".ldg");
        if (ldgCell) {
            ldgCell.innerHTML = `
                <div>Max PayL: ${maxPayloadKg.toFixed(0)} kg</div>
                <div>Max Fuel: ${maxFuelLb.toFixed(0)} lb</div>
		<div>Underload: ${TakeoffUnderLoad.toFixed(0)} Kg</div>
            `;
        }
        const ldgKg = depFuelLb - tripLb;
        if (i + 1 < rows.length) {
            const nextDepInput = rows[i + 1].cells[1].querySelector("input");
            const atual        = nextDepInput.value || "";
            const isAuto       = nextDepInput.dataset.auto;
            if (!atual || atual === "0" || isAuto === "1") {
                nextDepInput.value = ldgKg;
                nextDepInput.dataset.auto = "1";
            }
        }
        row.classList.toggle("overweight", depFuelLb > maxFuelLb);
    });
}
function criarLinhaLegHandlers(tr) {
    tr.addEventListener('click', function(e) {
        if (e.target.tagName === "BUTTON") return;
        selecionarLinhaLeg(tr);
    });
}
// Funções adicionar/remover linha sincronizam com legsData!
function adicionarLinhaLeg() {
  const tbody = document.getElementById('legsTable');
  let idx = linhaSelecionadaIndex;
  if (idx == null || idx < 0) idx = tbody.children.length - 1;
  const novaLinha = tbody.children[idx]?.cloneNode(true) || null;
  if (novaLinha) {
    novaLinha.querySelectorAll('input').forEach(input => input.value = '');
    novaLinha.querySelector('.rota-visual').textContent = '';
    novaLinha.querySelector('.rota-edit').value = '';
    tbody.insertBefore(novaLinha, tbody.children[idx + 1]);
    criarLinhaLegHandlers(novaLinha);
    selecionarLinhaLeg(novaLinha);
    legsData.splice(idx+1, 0, {homens:0, mulheres:0, criancas:0, bagagem:0, payload:0});
    guardarLegsNoLocalStorage();
    guardarLegs();
    updateLdgAuto();
  } else {
    criarLinhaLeg();
  }
}
function removerLinhaLeg() {
  const tbody = document.getElementById('legsTable');
  let idx = linhaSelecionadaIndex;
  if (idx == null || idx < 0) return;
  if (tbody.children.length <= 1) return;
  tbody.removeChild(tbody.children[idx]);
  legsData.splice(idx, 1);
  linhaSelecionadaIndex = null;
  guardarLegsNoLocalStorage();
  guardarLegs();
  updateLdgAuto();
}

// --- Popup Payload ---
function abrirPopupPayload(input) {
    const tr = input.closest('tr');
    const idx = Array.from(tr.parentNode.children).indexOf(tr);
    legEmEdicao = idx;

    if (!window.legsData) window.legsData = [];
    if (!legsData[idx]) legsData[idx] = {homens:0, mulheres:0, criancas:0, bagagem:0, payload:0};

    document.getElementById('ppHomens').value   = legsData[idx].homens   ?? 0;
    document.getElementById('ppMulheres').value = legsData[idx].mulheres ?? 0;
    document.getElementById('ppCriancas').value = legsData[idx].criancas ?? 0;
    document.getElementById('ppBagagem').value  = legsData[idx].bagagem  ?? 0;
    atualizarPopupTotal();
    document.getElementById('popupPayload').style.display = 'flex';
}
function atualizarPopupTotal() {
    const defs = JSON.parse(localStorage.getItem('definicoesMB')) || {};
    const pH = defs.pesoHomem   || 86;
    const pM = defs.pesoMulher  || 68;
    const pC = defs.pesoCrianca || 35;
    const homens   = parseInt(document.getElementById('ppHomens').value)   || 0;
    const mulheres = parseInt(document.getElementById('ppMulheres').value) || 0;
    const criancas = parseInt(document.getElementById('ppCriancas').value) || 0;
    const bagagem  = parseInt(document.getElementById('ppBagagem').value)  || 0;
    const total = homens * pH + mulheres * pM + criancas * pC + bagagem;
    document.getElementById('ppTotal').innerText = total;
    return total;
}
function limparPayloadDoPopup() {
    document.getElementById('ppHomens').value = 0;
    document.getElementById('ppMulheres').value = 0;
    document.getElementById('ppCriancas').value = 0;
    document.getElementById('ppBagagem').value = 0;
    atualizarPopupTotal();
}
function guardarPayloadDoPopup() {
    if (legEmEdicao === null) return;
    legsData[legEmEdicao] = {
        homens:   parseInt(document.getElementById('ppHomens').value)   || 0,
        mulheres: parseInt(document.getElementById('ppMulheres').value) || 0,
        criancas: parseInt(document.getElementById('ppCriancas').value) || 0,
        bagagem:  parseInt(document.getElementById('ppBagagem').value)  || 0,
        payload:  atualizarPopupTotal()
    };
    const tr = document.querySelectorAll('#legsTable tr')[legEmEdicao];
    if (tr) {
        const paylInput = tr.cells[2].querySelector('input');
        if (paylInput) paylInput.value = legsData[legEmEdicao].payload;
    }
    guardarLegsNoLocalStorage();
    fecharPopupPayload();
	updateLdgAuto();
	
}
function fecharPopupPayload() {
    document.getElementById('popupPayload').style.display = 'none';
    legEmEdicao = null;
}
['ppHomens', 'ppMulheres', 'ppCriancas', 'ppBagagem'].forEach(id => {
    document.getElementById(id).addEventListener('input', atualizarPopupTotal);
});


async function carregarValoresPadraoSeNecessario(){
  try {
    const res = await fetch('default_settings.json');
    if (!res.ok) throw new Error('Não foi possível carregar defaults');
    const d = await res.json();
    // Guarda sempre as definições vindas do JSON
    localStorage.setItem('definicoesMB', JSON.stringify(d.definicoesMB));
    localStorage.setItem('rotasPadrao', JSON.stringify(d.rotasPadrao));
  } catch (err) {
    console.error('Erro ao carregar default_settings.json:', err);
    // Aqui podes avisar o utilizador ou manter o que já está no localStorage
  }
}

document.addEventListener('DOMContentLoaded',async()=>{
  await carregarValoresPadraoSeNecessario();
  preencherDropdown();
  preencherDropdownRotas();
  carregarLegsDoLocalStorage();
  carregarLegs();
  
  // Selecionar texto todo ao focar
  document.querySelectorAll('input[type="number"],input[type="text"]').forEach(inp=>inp.addEventListener('focus',e=>e.target.select()));
  
  // Eventos principais
  document.getElementById('aviaoSelecionado').addEventListener('change',calculate);
  ['pilots','manualPayload','fuel','fuelTaxi','fuelDest'].forEach(id=>document.getElementById(id).addEventListener('input',calculate));
  document.getElementById('kg').addEventListener('input',convertKgToLb);
  document.getElementById('lb').addEventListener('input',convertLbToKg);
  document.getElementById('btnAddLeg').addEventListener('click', adicionarLinhaLeg);
  document.getElementById('btnRemoveLeg').addEventListener('click',()=>{const sel=document.querySelector('#legsTable tr.selected');if(sel)sel.remove();});
  document.getElementById('dropdownRotas').addEventListener('change',preencherLegsComRota);

  calculate(); 
  updateLdgAuto();
  if(window.feather)feather.replace();
});

window.preencherDropdownRotas    = preencherDropdownRotas;
window.carregarDropdownRotas     = carregarDropdownRotas;   
window.inserirLeg                = inserirLeg;
window.editarRota                = editarRota;
window.fecharRota                = fecharRota;
window.abrirPopupPayload         = abrirPopupPayload;
window.atualizarPopupTotal       = atualizarPopupTotal;
window.limparPayloadDoPopup      = limparPayloadDoPopup;
window.guardarPayloadDoPopup     = guardarPayloadDoPopup;
window.fecharPopupPayload        = fecharPopupPayload;
