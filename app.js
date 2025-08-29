
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
let versaoApp = "288"; // Versão da aplicação

// --- Funções de Carregamento e Inicialização (Comum a ambas as páginas) ---

/**
 * Carrega as definições padrão do ficheiro `default_settings.json` se não existirem no localStorage.
 */
async function carregarValoresPadraoSeNecessario() {
    let definicoes = JSON.parse(localStorage.getItem('definicoesMB'));
    let rotas = JSON.parse(localStorage.getItem('rotasPadrao'));

    if (definicoes && rotas) {
        listaAvioes = definicoes.avioes || [];
        listaRotasPadrao = rotas || [];
        return;
    }

    try {
        const response = await fetch('default_settings.json');
        if (!response.ok) throw new Error('A resposta da rede não foi bem-sucedida ao carregar as definições padrão.');
        const defaults = await response.json();
        
        if (!definicoes) {
            definicoes = defaults.definicoesMB;
            localStorage.setItem("definicoesMB", JSON.stringify(definicoes));
        }
        if (!rotas) {
            rotas = defaults.rotasPadrao;
            localStorage.setItem("rotasPadrao", JSON.stringify(rotas));
        }
        listaAvioes = definicoes.avioes || [];
        listaRotasPadrao = rotas || [];
        console.log("Definições padrão carregadas com sucesso.");
    } catch (error) {
        console.error("Falha crítica ao carregar definições padrão.", error);
    }
}

// --- Funções de Cálculo Mass & Balance (Para `index.html`) ---

/**
 * Carrega todas as definições e dados do localStorage para a UI da página principal.
 */
function inicializarCalculadora() {
    const definicoes = JSON.parse(localStorage.getItem('definicoesMB')) || {};
    listaAvioes = definicoes.avioes || [];
    
    const selectAviao = document.getElementById('aviaoSelecionado');
    if (selectAviao) {
        selectAviao.innerHTML = '';
        listaAvioes.forEach((av, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${av.nome} (${av.MTOW} kg)`;
            if (i === (parseInt(localStorage.getItem('aviaoSelecionadoIndex')) || 0)) {
                opt.selected = true;
            }
            selectAviao.appendChild(opt);
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

/**
 * Devolve o avião atualmente selecionado.
 */
function getAviaoAtual() {
    const select = document.getElementById('aviaoSelecionado');
    if (!select) return {};
    const idx = parseInt(select.value) || 0;
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
    const pilots = parseFloat(document.getElementById('pilots')?.value) || 0;
    const manualPayload = parseFloat(document.getElementById('manualPayload')?.value) || 0;
    const fuel = parseFloat(document.getElementById('fuel')?.value) || 0;
    const fuelTaxi = parseFloat(document.getElementById('fuelTaxi')?.value) || 0;
    const fuelDest = parseFloat(document.getElementById('fuelDest')?.value) || 0;

    const momentPilots = pilots * ARM_PILOT;
    const momentPayload = manualPayload * ARM_PAYLOAD;
    const momentFuel = fuel * ARM_FUEL;
    const momentTaxi = fuelTaxi * ARM_FUEL;
    const momentDest = fuelDest * ARM_FUEL;

    const zfw = BEW + pilots + manualPayload;
    const momentZfw = momento + momentPilots + momentPayload;
    const rampWeight = zfw + fuel;
    const momentRamp = momentZfw + momentFuel;
    const takeoffWeight = rampWeight - fuelTaxi;
    const momentTakeoff = momentRamp - momentTaxi;
    const landingWeight = takeoffWeight - fuelDest;
    const momentLanding = momentTakeoff - momentDest;

    const macTakeoff = ((momentTakeoff / takeoffWeight - MAC_ZERO) / MAC_DIV) * 100;
    const macLanding = ((momentLanding / landingWeight - MAC_ZERO) / MAC_DIV) * 100;

    const updateElement = (id, value, fixed = 0) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value.toFixed(fixed);
    };

    updateElement('basicWeight', BEW, 0);
    updateElement('basicMoment', momento, 1);
    updateElement('momentPilots', momentPilots, 1);
    updateElement('momentPayload', momentPayload, 1);
    updateElement('zfw', zfw, 0);
    updateElement('momentZfw', momentZfw, 1);
    updateElement('momentFuel', momentFuel, 1);
    updateElement('rampWeight', rampWeight, 0);
    updateElement('momentRamp', momentRamp, 1);
    updateElement('momentTaxi', momentTaxi, 1);
    updateElement('takeoffWeight', takeoffWeight, 0);
    updateElement('momentTakeoff', momentTakeoff, 1);
    updateElement('macTakeoff', macTakeoff, 1);
    updateElement('momentDest', momentDest, 1);
    updateElement('landingWeight', landingWeight, 0);
    updateElement('momentLanding', momentLanding, 1);
    updateElement('macLanding', macLanding, 1);
    
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
    const kg = parseFloat(document.getElementById('kg')?.value) || 0;
    document.getElementById('toLb').innerText = (kg * 2.20462).toFixed(1);
}

/**
 * Converte LB para KG e atualiza o DOM.
 */
function convertLbToKg() {
    const lb = parseFloat(document.getElementById('lb')?.value) || 0;
    document.getElementById('toKg').innerText = (lb / 2.20462).toFixed(1);
}

// --- Funções de Gestão de Legs e Rotas (Para `index.html`) ---

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
    if (!tbody) return;
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
    if (!tbody) return;
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
    if (!dropdown) return;
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
    if (!tbody) return;
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
	
	guardarLegsNoLocalStorage();
	guardarLegs();
}

/**
 * Insere os valores de uma leg na calculadora principal.
 */
function inserirLeg(btn) {
    const row = btn.closest("tr");
    const depFuelLb = parseFloat(row.cells[1].querySelector("input")?.value) || 0;
    const payloadKg = parseFloat(row.cells[2].querySelector("input")?.value) || 0;
    const tripFuelLb = parseFloat(row.cells[3].querySelector("input")?.value) || 0;
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
    if (rows.length === 0) return;
    
    const pilots = parseFloat(document.getElementById("pilots")?.value) || 0;
    const taxiKg = parseFloat(document.getElementById("fuelTaxi")?.value) || 0;

    rows.forEach((row, i) => {
        const inputs = row.querySelectorAll("td input");
        const depFuelLb = parseFloat(inputs[1]?.value) || 0;
        const payloadKg = Math.round(parseFloat(inputs[2]?.value) || 0);
        const tripLb = parseFloat(inputs[3]?.value) || 0;

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
    if (!div || !input) return;
    input.value = div.textContent.trim();
    div.style.display = "none";
    input.style.display = "block";
    input.focus();
    input.select();
}
function fecharRota(input) {
    const td = input.parentElement;
    const div = td.querySelector('.rota-visual');
    if (!td || !div) return;
    div.textContent = input.value.trim();
    input.style.display = "none";
    div.style.display = "block";
    updateLdgAuto();
    guardarLegs();
}

function adicionarLinhaLeg() {
    const tbody = document.getElementById('legsTable');
    if (!tbody) return;
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
    if (!tbody) return;
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

// --- Funções para o Popup do Payload (Para `index.html`) ---

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
    
    const homens = parseInt(document.getElementById('ppHomens')?.value) || 0;
    const mulheres = parseInt(document.getElementById('ppMulheres')?.value) || 0;
    const criancas = parseInt(document.getElementById('ppCriancas')?.value) || 0;
    const bagagem = parseInt(document.getElementById('ppBagagem')?.value) || 0;
    
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
        homens: parseInt(document.getElementById('ppHomens')?.value) || 0,
        mulheres: parseInt(document.getElementById('ppMulheres')?.value) || 0,
        criancas: parseInt(document.getElementById('ppCriancas')?.value) || 0,
        bagagem: parseInt(document.getElementById('ppBagagem')?.value) || 0,
        payload: atualizarPopupTotal()
    };
    
    const tr = document.querySelectorAll('#legsTable tr')[legEmEdicao];
    if (tr) {
        const paylInput = tr.cells[2].querySelector('input');
        if (paylInput) paylInput.value = legsData[legEmEdicao].payload;
    }
    
    guardarLegsNoLocalStorage();
	guardarLegs();
    fecharPopupPayload();
    updateLdgAuto();
}

function fecharPopupPayload() {
    document.getElementById('popupPayload').style.display = 'none';
    legEmEdicao = null;
}

// --- Funções de Definições (Para `settings.html`) ---

function inicializarDefinicoes() {
    const defs = JSON.parse(localStorage.getItem('definicoesMB'));
    if (defs) {
        document.getElementById('pesoHomem').value = defs.pesoHomem;
        document.getElementById('pesoMulher').value = defs.pesoMulher;
        document.getElementById('pesoCrianca').value = defs.pesoCrianca;
        document.getElementById('pesoBagagem').value = defs.pesoBagagem;
        carregarTabelaAvioes(defs.avioes);
    }

    const rotas = JSON.parse(localStorage.getItem('rotasPadrao'));
    if (rotas) {
        carregarListaRotas(rotas);
    }
    document.getElementById('versaoApp').textContent = `Versão: ${versaoApp}`;
}

function carregarTabelaAvioes(avioes) {
    const tbody = document.getElementById('tabelaAvioes');
    if (!tbody) return;
    tbody.innerHTML = '';
    avioes.forEach((aviao, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" value="${aviao.nome}" data-index="${index}" data-key="nome"></td>
            <td><input type="number" value="${aviao.peso}" data-index="${index}" data-key="peso"></td>
            <td><input type="number" value="${aviao.momento}" data-index="${index}" data-key="momento"></td>
            <td><input type="number" value="${aviao.MRW}" data-index="${index}" data-key="MRW"></td>
            <td><input type="number" value="${aviao.MTOW}" data-index="${index}" data-key="MTOW"></td>
            <td><input type="number" value="${aviao.MLW}" data-index="${index}" data-key="MLW"></td>
            <td><button onclick="removerAviao(${index})">Remover</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function adicionarAviao() {
    const defs = JSON.parse(localStorage.getItem('definicoesMB')) || {};
    const avioes = defs.avioes || [];
    
    const novoAviao = {
        nome: document.getElementById('novoNome').value || 'Novo Avião',
        peso: parseFloat(document.getElementById('novoPeso').value) || 0,
        momento: parseFloat(document.getElementById('novoMomento').value) || 0,
        MRW: parseFloat(document.getElementById('novoMRW').value) || 0,
        MTOW: parseFloat(document.getElementById('novoMTOW').value) || 0,
        MLW: parseFloat(document.getElementById('novoMLW').value) || 0
    };

    avioes.push(novoAviao);
    defs.avioes = avioes;
    localStorage.setItem('definicoesMB', JSON.stringify(defs));
    inicializarDefinicoes();
}

function removerAviao(index) {
    const defs = JSON.parse(localStorage.getItem('definicoesMB')) || {};
    let avioes = defs.avioes || [];
    avioes.splice(index, 1);
    defs.avioes = avioes;
    localStorage.setItem('definicoesMB', JSON.stringify(defs));
    inicializarDefinicoes();
}

function guardarDefinicoes() {
    const defs = JSON.parse(localStorage.getItem('definicoesMB')) || {};
    defs.pesoHomem = parseFloat(document.getElementById('pesoHomem').value) || 0;
    defs.pesoMulher = parseFloat(document.getElementById('pesoMulher').value) || 0;
    defs.pesoCrianca = parseFloat(document.getElementById('pesoCrianca').value) || 0;
    defs.pesoBagagem = parseFloat(document.getElementById('pesoBagagem').value) || 0;

    const tabelaAvioes = document.getElementById('tabelaAvioes');
    if (tabelaAvioes) {
        const novosAvioes = [...tabelaAvioes.querySelectorAll('tr')].map(row => {
            const inputs = row.querySelectorAll('input');
            return {
                nome: inputs[0].value,
                peso: parseFloat(inputs[1].value) || 0,
                momento: parseFloat(inputs[2].value) || 0,
                MRW: parseFloat(inputs[3].value) || 0,
                MTOW: parseFloat(inputs[4].value) || 0,
                MLW: parseFloat(inputs[5].value) || 0
            };
        });
        defs.avioes = novosAvioes;
    }
    localStorage.setItem('definicoesMB', JSON.stringify(defs));

    const rotaTempBody = document.getElementById('rotaTemp');
    if (rotaTempBody) {
        const rotaAtual = {
            nome: document.getElementById('nomeRota').value,
            legs: [...rotaTempBody.querySelectorAll('tr')].map(row => ({
                route: row.cells[0].querySelector('input')?.value || '',
                depF: parseFloat(row.cells[1].querySelector('input')?.value) || 0,
                payl: parseFloat(row.cells[2].querySelector('input')?.value) || 0,
                tripF: parseFloat(row.cells[3].querySelector('input')?.value) || 0
            }))
        };
        if (rotaAtual.nome) {
            const rotas = JSON.parse(localStorage.getItem('rotasPadrao')) || [];
            rotas.push(rotaAtual);
            localStorage.setItem('rotasPadrao', JSON.stringify(rotas));
            inicializarDefinicoes();
            document.getElementById('nomeRota').value = '';
            document.getElementById('rotaTemp').innerHTML = '';
        }
    }

    alert('Definições guardadas com sucesso!');
}

function resetarDefinicoes() {
    localStorage.removeItem('definicoesMB');
    localStorage.removeItem('rotasPadrao');
    localStorage.removeItem('legsDataV2');
    localStorage.removeItem('rotaAtiva');
    localStorage.removeItem('aviaoSelecionadoIndex');
    localStorage.removeItem('rotaSelecionadaIndex');
    window.location.reload();
}

function abrirModalQR() {
    document.getElementById('modalQR').style.display = 'flex';
}
function fecharModalQR() {
    document.getElementById('modalQR').style.display = 'none';
}
function abrirModalReset() {
    document.getElementById('modalReset').style.display = 'flex';
}
function fecharModalReset() {
    document.getElementById('modalReset').style.display = 'none';
}

function carregarListaRotas(rotas) {
    const ul = document.getElementById('listaRotas');
    if (!ul) return;
    ul.innerHTML = '';
    rotas.forEach((rota, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${rota.nome}
            <button onclick="removerRota(${index})">Remover</button>
        `;
        ul.appendChild(li);
    });
}

function adicionarLinhaRota() {
    const tbody = document.getElementById('rotaTemp');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" placeholder="Origem-Destino"></td>
        <td><input type="number" inputmode="decimal" step="any"></td>
        <td><input type="number" inputmode="decimal" step="any"></td>
        <td><input type="number" inputmode="decimal" step="any"></td>
        <td><button onclick="removerLinhaRota(this)">-</button></td>
    `;
    tbody.appendChild(tr);
}

function removerLinhaRota(btn) {
    const row = btn.closest('tr');
    row.remove();
}

function removerRota(index) {
    const rotas = JSON.parse(localStorage.getItem('rotasPadrao')) || [];
    rotas.splice(index, 1);
    localStorage.setItem('rotasPadrao', JSON.stringify(rotas));
    inicializarDefinicoes();
}

// --- Event Listeners e Inicialização ---

document.addEventListener('DOMContentLoaded', async () => {
    await carregarValoresPadraoSeNecessario();

    if (document.body.classList.contains('settings-page')) {
        inicializarDefinicoes();
        document.getElementById('btnAddRouteLeg')?.addEventListener('click', adicionarLinhaRota);
        document.getElementById('btnGuardarDefinicoes')?.addEventListener('click', guardarDefinicoes);
    } else {
        inicializarCalculadora();
        
		
		
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
        
        document.getElementById('btnPopupSalvar')?.addEventListener('click', guardarPayloadDoPopup);
        document.getElementById('btnPopupLimpar')?.addEventListener('click', limparPayloadDoPopup);
        document.getElementById('btnPopupFechar')?.addEventListener('click', fecharPopupPayload);
        ['ppHomens', 'ppMulheres', 'ppCriancas', 'ppBagagem'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', atualizarPopupTotal);
        });
    
        calculate();
    }
	
	document.querySelectorAll('input[type="number"],input[type="text"]').forEach(inp=>inp.addEventListener('focus',e=>e.target.select()));
	
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
window.abrirModalQR = abrirModalQR;
window.fecharModalQR = fecharModalQR;
window.abrirModalReset = abrirModalReset;
window.fecharModalReset = fecharModalReset;
window.resetarDefinicoes = resetarDefinicoes;
window.carregarTabelaAvioes = carregarTabelaAvioes;
window.adicionarAviao = adicionarAviao;
window.removerAviao = removerAviao;
window.guardarDefinicoes = guardarDefinicoes;
window.carregarListaRotas = carregarListaRotas;
window.adicionarLinhaRota = adicionarLinhaRota;
window.removerLinhaRota = removerLinhaRota;
window.removerRota = removerRota;
