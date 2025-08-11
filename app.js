// --- Constantes Globais ---
const ARM_PILOT = 4.21;
const ARM_PAYLOAD = 8.7;
const ARM_FUEL = 7.936;
const MAC_ZERO = 7.26;
const MAC_DIV = 2.042;

// --- Variáveis de Estado da Aplicação ---
let listaAvioes = [];
let listaRotasPadrao = [];
let legsData = [];
let legEmEdicao = null;
let linhaSelecionadaIndex = null;

// --- Funções de Carregamento e Inicialização ---

/**
 * Carrega as definições padrão do ficheiro `default_settings.json` se não existirem no localStorage.
 */
async function carregarValoresPadraoSeNecessario() {
    const definicoesExistem = localStorage.getItem("definicoesMB");
    const rotasExistem = localStorage.getItem("rotasPadrao");

    if (definicoesExistem && rotasExistem) {
        return;
    }

    try {
        const response = await fetch('default_settings.json');
        if (!response.ok) throw new Error('A resposta da rede não foi bem-sucedida ao carregar as definições padrão.');
        const defaults = await response.json();
        
        if (!definicoesExistem) {
            localStorage.setItem("definicoesMB", JSON.stringify(defaults.definicoesMB));
        }
        if (!rotasExistem) {
            localStorage.setItem("rotasPadrao", JSON.stringify(defaults.rotasPadrao));
        }
        console.log("Definições padrão carregadas com sucesso.");
    } catch (error) {
        console.error("Falha crítica ao carregar definições padrão.", error);
    }
}

/**
 * Carrega todas as definições e dados do localStorage para a UI.
 */
function carregarDefinicoes() {
    const definicoes = JSON.parse(localStorage.getItem('definicoesMB')) || {};
    listaAvioes = definicoes.avioes || [];
    
    // Preenche o dropdown de aviões
    const select = document.getElementById('aviaoSelecionado');
    if (select) {
        select.innerHTML = '';
        listaAvioes.forEach((av, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${av.nome} (${av.MTOW} kg)`;
            if (i === (parseInt(localStorage.getItem('aviaoSelecionadoIndex')) || 0)) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
    }

    listaRotasPadrao = JSON.parse(localStorage.getItem('rotasPadrao')) || [];
    preencherDropdownRotas();

    legsData = JSON.parse(localStorage.getItem('legsDataV2')) || Array(5).fill(0).map(()=>({homens:0, mulheres:0, criancas:0, bagagem:0, payload:0}));
    const rotaAtiva = JSON.parse(localStorage.getItem('rotaAtiva'));
    if (rotaAtiva && rotaAtiva.length > 0) {
        carregarLegs(rotaAtiva);
    } else {
        carregarLegs();
    }
}

// --- Funções de Cálculo Mass & Balance ---

/**
 * Devolve o avião atualmente selecionado.
 */
function getAviaoAtual() {
    const idx = parseInt(document.getElementById('aviaoSelecionado').value) || 0;
    localStorage.setItem('aviaoSelecionadoIndex', idx);
    const av = listaAvioes[idx] || {};
    return {
        nome: av.nome || '—',
        peso: av.peso || 0,
        momento: av.momento || 0,
        MRW: av.MRW || 0,
        MTOW: av.MTOW || 0,
        MLW: av.MLW || 0
    };
}

/**
 * Executa todos os cálculos de Mass & Balance e atualiza a interface.
 */
function calculate() {
    const { peso: BEW, momento, MRW, MTOW, MLW } = getAviaoAtual();
    const pilots = parseFloat(document.getElementById('pilots').value) || 0;
    const manualPayload = parseFloat(document.getElementById('manualPayload').value) || 0;
    const fuel = parseFloat(document.getElementById('fuel').value) || 0;
    const fuelTaxi = parseFloat(document.getElementById('fuelTaxi').value) || 0;
    const fuelDest = parseFloat(document.getElementById('fuelDest').value) || 0;

    // Cálculo dos momentos
    const momentPilots = pilots * ARM_PILOT;
    const momentPayload = manualPayload * ARM_PAYLOAD;
    const momentFuel = fuel * ARM_FUEL;
    const momentTaxi = fuelTaxi * ARM_FUEL;
    const momentDest = fuelDest * ARM_FUEL;

    // Pesos compostos
    const zfw = BEW + pilots + manualPayload;
    const momentZfw = momento + momentPilots + momentPayload;
    const rampWeight = zfw + fuel;
    const momentRamp = momentZfw + momentFuel;
    const takeoffWeight = rampWeight - fuelTaxi;
    const momentTakeoff = momentRamp - momentTaxi;
    const landingWeight = takeoffWeight - fuelDest;
    const momentLanding = momentTakeoff - momentDest;

    // Cálculo de MAC
    const macTakeoff = ((momentTakeoff / takeoffWeight - MAC_ZERO) / MAC_DIV) * 100;
    const macLanding = ((momentLanding / landingWeight - MAC_ZERO) / MAC_DIV) * 100;

    // Atualizar DOM
    document.getElementById('basicWeight').innerText = BEW.toFixed(0);
    document.getElementById('basicMoment').innerText = momento;
    document.getElementById('momentPilots').innerText = momentPilots.toFixed(1);
    document.getElementById('momentPayload').innerText = momentPayload.toFixed(1);
    document.getElementById('zfw').innerText = zfw.toFixed(0);
    document.getElementById('momentZfw').innerText = momentZfw.toFixed(1);
    document.getElementById('momentFuel').innerText = momentFuel.toFixed(1);
    document.getElementById('rampWeight').innerText = rampWeight.toFixed(0);
    document.getElementById('momentRamp').innerText = momentRamp.toFixed(1);
    document.getElementById('momentTaxi').innerText = momentTaxi.toFixed(1);
    document.getElementById('takeoffWeight').innerText = takeoffWeight.toFixed(0);
    document.getElementById('momentTakeoff').innerText = momentTakeoff.toFixed(1);
    document.getElementById('macTakeoff').innerText = macTakeoff.toFixed(1);
    document.getElementById('momentDest').innerText = momentDest.toFixed(1);
    document.getElementById('landingWeight').innerText = landingWeight.toFixed(0);
    document.getElementById('momentLanding').innerText = momentLanding.toFixed(1);
    document.getElementById('macLanding').innerText = macLanding.toFixed(1);

    // Notas de limite
    const maxFuel = MRW - (BEW + pilots + manualPayload);
    const fuelNote = document.getElementById('maxFuelNote');
    if (fuelNote) {
        fuelNote.innerText = maxFuel >= 0 ? `Máx Fuel: ${maxFuel.toFixed(0)} kg (${(maxFuel * 2.20462).toFixed(0)} lb)` : 'Excede limite!';
    }
    
    const maxPayload = MRW - (BEW + pilots + fuel);
    const payloadNote = document.getElementById('maxPayloadNote');
    if (payloadNote) {
        payloadNote.innerText = maxPayload >= 0 ? `Máx Payload: ${maxPayload.toFixed(0)} kg` : 'Excede limite!';
    }

    // Destacar linhas excedidas
    ['rampRow', 'takeoffRow', 'landingRow'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const weight = id === 'rampRow' ? rampWeight : id === 'takeoffRow' ? takeoffWeight : landingWeight;
        const limit = id === 'rampRow' ? MRW : id === 'takeoffRow' ? MTOW : MLW;
        el.classList.toggle('exceeded', weight > limit);
    });

    updateLdgAuto();
}

/**
 * Converte KG para LB e atualiza o DOM.
 */
function convertKgToLb() {
    const kg = parseFloat(document.getElementById('kg').value) || 0;
    document.getElementById('toLb').innerText = (kg * 2.20462).toFixed(1);
}

/**
 * Converte LB para KG e atualiza o DOM.
 */
function convertLbToKg() {
    const lb = parseFloat(document.getElementById('lb').value) || 0;
    document.getElementById('toKg').innerText = (lb / 2.20462).toFixed(1);
}

// --- Funções de Gestão de Legs e Rotas ---

/**
 * Guarda os dados das legs no localStorage.
 */
function guardarLegsNoLocalStorage() {
    localStorage.setItem('legsDataV2', JSON.stringify(legsData));
}

/**
 * Seleciona uma linha na tabela de legs.
 */
function selecionarLinhaLeg(tr) {
    document.querySelectorAll('#legsTable tr').forEach(row => row.classList.remove('selected'));
    tr.classList.add('selected');
    linhaSelecionadaIndex = Array.from(tr.parentNode.children).indexOf(tr);
}

/**
 * Preenche o dropdown de rotas com base no localStorage.
 */
function preencherDropdownRotas() {
    const dropdown = document.getElementById("dropdownRotas");
    if (!dropdown) return;
    dropdown.innerHTML = '<option value="">-- Selecionar rota --</option>';
    listaRotasPadrao.forEach((r, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.text = r.nome;
        dropdown.appendChild(opt);
    });
}

/**
 * Cria uma nova linha na tabela de legs.
 */
function criarLinhaLeg(route = '', depF = '', payl = '', tripF = '') {
    const tbody = document.getElementById('legsTable');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="rota-col" onclick="editarRota(this)">
            <div class="rota-visual">${route}</div>
            <input type="text" class="rota-edit" value="${route}" onblur="fecharRota(this)" style="display: none;">
        </td>
        <td><input type="number" inputmode="decimal" step="any" value="${depF}" data-auto="1"></td>
        <td><input type="number" inputmode="decimal" step="any" value="${payl}" style="width:60px" onclick="abrirPopupPayload(this)" readonly></td>
        <td><input type="number" inputmode="decimal" step="any" value="${tripF}"></td>
        <td class="ldg">0</td>
        <td><button class="route-insert" onclick="inserirLeg(this)">+</button></td>
    `;
    tbody.appendChild(tr);

    tr.addEventListener('click', e => {
        if (e.target.tagName !== "BUTTON") selecionarLinhaLeg(tr);
    });

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

/**
 * Guarda a rota atualmente preenchida na tabela temporária no localStorage.
 */
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

/**
 * Carrega os legs do localStorage para a tabela.
 */
function carregarLegs(dados = []) {
    const tbody = document.getElementById("legsTable");
    tbody.innerHTML = "";
    const dadosCarregar = dados.length > 0 ? dados : JSON.parse(localStorage.getItem('rotaAtiva') || '[]');
    if (dadosCarregar.length === 0) {
        for (let i = 0; i < 5; i++) criarLinhaLeg();
    } else {
        dadosCarregar.forEach(l => criarLinhaLeg(l.route, l.depF, l.payl, l.tripF));
    }
}

/**
 * Preenche a tabela de legs com os dados de uma rota guardada.
 */
function preencherLegsComRota() {
    const dropdown = document.getElementById("dropdownRotas");
    const idx = dropdown.value;
    
    legsData.forEach(leg => {
        leg.homens = 0;
        leg.mulheres = 0;
        leg.criancas = 0;
        leg.bagagem = 0;
        leg.payload = 0;
    });
    guardarLegsNoLocalStorage();

    localStorage.setItem('rotaSelecionadaIndex', dropdown.selectedIndex);
    const tbody = document.getElementById("legsTable");
    tbody.innerHTML = "";

    if (idx === "") {
        for (let i = 0; i < 5; i++) criarLinhaLeg();
        localStorage.removeItem('rotaAtiva');
    } else if (listaRotasPadrao[idx]) {
        listaRotasPadrao[idx].legs.forEach(leg => {
            criarLinhaLeg(leg.route, leg.depF, leg.payl, leg.tripF);
        });
    }
    updateLdgAuto();
}

/**
 * Insere os valores de uma leg na calculadora principal.
 */
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
    calculate();
}

/**
 * Atualiza o Landing Fuel e outras notas automáticas.
 */
function updateLdgAuto() {
    const { peso: BEW, MRW, MTOW } = getAviaoAtual();
    const rows = document.querySelectorAll("#legsTable tr");
    const pilots = parseFloat(document.getElementById("pilots").value) || 0;
    const taxiKg = parseFloat(document.getElementById("fuelTaxi").value) || 0;

    rows.forEach((row, i) => {
        const inputs = row.querySelectorAll("td input");
        const depFuelLb = parseFloat(inputs[1]?.value || 0);
        const payloadKg = Math.round(parseFloat(inputs[2]?.value || 0));
        const tripLb = parseFloat(inputs[3]?.value || 0);

        const depFuelKg = Math.round(depFuelLb / 2.20462);
        const maxFuelKg = MRW - (BEW + pilots + payloadKg);
        const maxFuelLb = Math.round(maxFuelKg * 2.20462);
        const maxPayloadKg = MTOW - (BEW + pilots + depFuelKg);
        const takeoffUnderload = MTOW - (BEW + pilots + payloadKg + depFuelKg - taxiKg);

        const ldgCell = row.querySelector(".ldg");
        if (ldgCell) {
            ldgCell.innerHTML = `
                <div>Max PayL: ${maxPayloadKg.toFixed(0)} kg</div>
                <div>Max Fuel: ${maxFuelLb.toFixed(0)} lb</div>
                <div>Underload: ${takeoffUnderload.toFixed(0)} Kg</div>
            `;
        }

        const ldgKg = depFuelLb - tripLb;
        if (i + 1 < rows.length) {
            const nextDepInput = rows[i + 1].cells[1]?.querySelector("input");
            const isAuto = nextDepInput?.dataset.auto;
            if (nextDepInput && (!nextDepInput.value || isAuto === "1")) {
                nextDepInput.value = ldgKg.toFixed(0);
                nextDepInput.dataset.auto = "1";
            }
        }
        row.classList.toggle("overweight", depFuelLb > maxFuelLb);
    });
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

function adicionarLinhaLeg() {
    const tbody = document.getElementById('legsTable');
    let idx = linhaSelecionadaIndex !== null ? linhaSelecionadaIndex : tbody.children.length - 1;
    const novaLinha = tbody.children[idx]?.cloneNode(true) || null;
    if (novaLinha) {
        novaLinha.querySelectorAll('input').forEach(input => input.value = '');
        novaLinha.querySelector('.rota-visual').textContent = '';
        novaLinha.querySelector('.rota-edit').value = '';
        tbody.insertBefore(novaLinha, tbody.children[idx + 1]);
        selecionarLinhaLeg(novaLinha);
        legsData.splice(idx + 1, 0, {homens:0, mulheres:0, criancas:0, bagagem:0, payload:0});
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
    if (idx !== null && tbody.children.length > 1) {
        tbody.removeChild(tbody.children[idx]);
        legsData.splice(idx, 1);
        linhaSelecionadaIndex = null;
        guardarLegsNoLocalStorage();
        guardarLegs();
        updateLdgAuto();
    }
}

// --- Funções para o Popup do Payload ---

function abrirPopupPayload(input) {
    const tr = input.closest('tr');
    const idx = Array.from(tr.parentNode.children).indexOf(tr);
    legEmEdicao = idx;

    if (!legsData[idx]) {
        legsData[idx] = {homens:0, mulheres:0, criancas:0, bagagem:0, payload:0};
    }

    document.getElementById('ppHomens').value = legsData[idx].homens ?? 0;
    document.getElementById('ppMulheres').value = legsData[idx].mulheres ?? 0;
    document.getElementById('ppCriancas').value = legsData[idx].criancas ?? 0;
    document.getElementById('ppBagagem').value = legsData[idx].bagagem ?? 0;
    atualizarPopupTotal();
    document.getElementById('popupPayload').style.display = 'flex';
}

function atualizarPopupTotal() {
    const definicoes = JSON.parse(localStorage.getItem('definicoesMB')) || {};
    const pesos = {
        homem: definicoes.pesoHomem || 86,
        mulher: definicoes.pesoMulher || 68,
        crianca: definicoes.pesoCrianca || 35,
        bagagem: definicoes.pesoBagagem || 10
    };
    
    const homens = parseInt(document.getElementById('ppHomens').value) || 0;
    const mulheres = parseInt(document.getElementById('ppMulheres').value) || 0;
    const criancas = parseInt(document.getElementById('ppCriancas').value) || 0;
    const bagagem = parseInt(document.getElementById('ppBagagem').value) || 0;
    
    const total = (homens * pesos.homem) + (mulheres * pesos.mulher) + (criancas * pesos.crianca) + bagagem;
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
        homens: parseInt(document.getElementById('ppHomens').value) || 0,
        mulheres: parseInt(document.getElementById('ppMulheres').value) || 0,
        criancas: parseInt(document.getElementById('ppCriancas').value) || 0,
        bagagem: parseInt(document.getElementById('ppBagagem').value) || 0,
        payload: atualizarPopupTotal()
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

// --- Event Listeners e Inicialização ---

document.addEventListener('DOMContentLoaded', async () => {
    // Carregar dados iniciais e UI
    await carregarValoresPadraoSeNecessario();
    carregarDefinicoes();
    
    // Selecionar texto todo ao focar
    document.querySelectorAll('input').forEach(inp => inp.addEventListener('focus', e => e.target.select()));
    
    // Eventos principais
    document.getElementById('aviaoSelecionado')?.addEventListener('change', calculate);
    ['pilots', 'manualPayload', 'fuel', 'fuelTaxi', 'fuelDest'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculate);
    });
    document.getElementById('btnCalcular')?.addEventListener('click', calculate);
    document.getElementById('kg')?.addEventListener('input', convertKgToLb);
    document.getElementById('lb')?.addEventListener('input', convertLbToKg);
    document.getElementById('btnAddLeg')?.addEventListener('click', adicionarLinhaLeg);
    document.getElementById('btnRemoveLeg')?.addEventListener('click', removerLinhaLeg);
    document.getElementById('dropdownRotas')?.addEventListener('change', preencherLegsComRota);
    
    // Eventos para o popup de payload
    document.getElementById('btnPopupSalvar')?.addEventListener('click', guardarPayloadDoPopup);
    document.getElementById('btnPopupLimpar')?.addEventListener('click', limparPayloadDoPopup);
    document.getElementById('btnPopupFechar')?.addEventListener('click', fecharPopupPayload);
    ['ppHomens', 'ppMulheres', 'ppCriancas', 'ppBagagem'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', atualizarPopupTotal);
    });

    // Evento para fechar modais ao clicar fora
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
    }
    
    // Inicializar cálculos e ícones
    calculate();
    feather.replace();
});

// Expor funções para uso em `onclick` no HTML
window.adicionarLinhaLeg = adicionarLinhaLeg;
window.removerLinhaLeg = removerLinhaLeg;
window.inserirLeg = inserirLeg;
window.editarRota = editarRota;
window.fecharRota = fecharRota;
window.abrirPopupPayload = abrirPopupPayload;
window.guardarPayloadDoPopup = guardarPayloadDoPopup;
window.limparPayloadDoPopup = limparPayloadDoPopup;
window.fecharPopupPayload = fecharPopupPayload;
