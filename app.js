// Constantes para braços de momento e MAC
const ARM_PILOT = 4.21;
const ARM_PAYLOAD = 8.7;
const ARM_FUEL = 7.936;
const MAC_ZERO = 7.26;
const MAC_DIV = 2.042;

let linhaSelecionadaIndex = null;

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

// --- Gestão de Rotas e Legs ---
let legsData=[];

function carregarLegsDoLocalStorage(){
  const data=localStorage.getItem('legsDataV2');
  legsData=data?JSON.parse(data):Array(5).fill().map(()=>({homens:0,mulheres:0,criancas:0,bagagem:0,payload:0}));
}
function guardarLegsNoLocalStorage(){localStorage.setItem('legsDataV2',JSON.stringify(legsData));}


function adicionarLinhaLeg() {
  // Função para adicionar uma nova perna com o btn
  const tbody = document.getElementById('legsTable');
  // Se não houver linha seleccionada, coloca no fim
  let idx = (linhaSelecionadaIndex != null && linhaSelecionadaIndex >= 0)
            ? linhaSelecionadaIndex
            : tbody.children.length - 1;

  // Clona a linha de referência
  const refRow = tbody.children[idx];
  const nova = refRow.cloneNode(true);

  // Limpa todos os inputs da linha nova
  nova.querySelectorAll('input').forEach(i => i.value = '');

  // Insere a nova linha logo a seguir
  tbody.insertBefore(nova, tbody.children[idx + 1]);

  // Regista o handler de clique para seleccionar
  nova.addEventListener('click', () => {
    document.querySelectorAll('#legsTable tr').forEach(r => r.classList.remove('selected'));
    nova.classList.add('selected');
    linhaSelecionadaIndex = Array.from(nova.parentNode.children).indexOf(nova);
  });

  // Marca-a como seleccionada imediatamente
  document.querySelectorAll('#legsTable tr').forEach(r => r.classList.remove('selected'));
  nova.classList.add('selected');
  linhaSelecionadaIndex = idx + 1;

  // Actualiza o estado e o localStorage
  guardarLegs();           // sincroniza a tabela com legsData
  updateLdgAuto();         // recalcula os valores
}

function criarLinhaLeg(route = '', depF = '', payl = '', tripF = '') {
  const tbody = document.getElementById('legsTable');
  const tr = document.createElement('tr');

  tr.innerHTML = `
  <td class="rota-col" contenteditable="true">${route}</td>
  <td><input type="number" inputmode="decimal" step="any" value="${depF}"></td>
  <td><input type="number" inputmode="decimal" step="any" value="${payl}"></td>
  <td><input type="number" inputmode="decimal" step="any" value="${tripF}"></td>
  <td class="ldg">0</td>
  <td><button class="route-insert">+</button></td>
`;

  // 2) Logo depois de criar o <tr>, regista o click handler:
  tr.addEventListener('click', () => {
    // limpa todas as seleções anteriores
    document.querySelectorAll('#legsTable tr').forEach(r => r.classList.remove('selected'));
    // marca esta linha
    tr.classList.add('selected');
    // guarda o índice desta linha
    linhaSelecionadaIndex = Array.from(tr.parentNode.children).indexOf(tr);
  });

  // 3) Continua com o resto da lógica de inputs e botões:
  tr.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('focus', e => e.target.select());
    inp.addEventListener('input', () => {
      guardarLegs();
      updateLdgAuto();
    });
  });
  tr.querySelector('.route-insert').addEventListener('click', e => {
    e.stopPropagation();
    inserirLeg(e.target);
  });

  tbody.appendChild(tr);
}

function guardarLegs(){
  const linhas=Array.from(document.querySelectorAll('#legsTable tr'));
  const data=linhas.map(row=>{const i=row.querySelectorAll('input');return{route:row.cells[0].textContent.trim(),depF:i[0].value,payl:i[1].value,tripF:i[2].value};});
  localStorage.setItem('rotaAtiva',JSON.stringify(data));
}

function carregarLegs(){
  const saved=JSON.parse(localStorage.getItem('rotaAtiva')||'[]');
  const tbody=document.getElementById('legsTable');tbody.innerHTML='';
  (saved.length?saved:Array(5).fill()).forEach((l,i)=>criarLinhaLeg(l.route||'',l.depF||'',l.payl||'',l.tripF||''));
}

function preencherDropdownRotas(){
  const dropdown=document.getElementById('dropdownRotas');
  const rotas=JSON.parse(localStorage.getItem('rotasPadrao')||'[]');
  dropdown.innerHTML='<option value="">-- Selecionar rota --</option>';
  rotas.forEach((r,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=r.nome;dropdown.appendChild(opt);});
}

function preencherLegsComRota(){
  const idx=document.getElementById('dropdownRotas').value;
  if(idx===''){localStorage.removeItem('rotaAtiva');carregarLegs();guardarLegs();return;}
  const rotas=JSON.parse(localStorage.getItem('rotasPadrao')||'[]');
  if(!rotas[idx])return;const{legs}=rotas[idx];
  const tbody=document.getElementById('legsTable');tbody.innerHTML='';legs.forEach(l=>criarLinhaLeg(l.route,l.depF,l.payl,l.tripF));guardarLegs();updateLdgAuto();
}

function inserirLeg(btn){
  const row=btn.closest('tr');
  const i=row.querySelectorAll('input');
  document.getElementById('manualPayload').value=Math.round(parseFloat(i[1].value)||0);
  document.getElementById('fuel').value=  Math.round((parseFloat(i[0].value)||0)/2.20462);
  document.getElementById('fuelDest').value=Math.round((parseFloat(i[2].value)||0)/2.20462);
  calculate();
}

function updateLdgAuto(){
  const{MRW}=getAviaoAtual();
  const rows=document.querySelectorAll('#legsTable tr');
  rows.forEach((row,i)=>{
    const inp=row.querySelectorAll('input');
    const dep=parseFloat(inp[0].value)||0;
    const payl=Math.round(parseFloat(inp[1].value)||0);
    const BEW=parseFloat(document.getElementById('basicWeight').innerText)||0;
    const pilots=parseFloat(document.getElementById('pilots').value)||0;
    const taxi=parseFloat(document.getElementById('fuelTaxi').value)||0;
    const maxFuelLb=Math.round((MRW-(BEW+pilots+payl))*2.20462);
    const under=MRW-(BEW+pilots+payl+Math.round(dep/2.20462)-taxi);
    row.querySelector('.ldg').innerHTML=`<div>Max PayL: ${ (MRW-(BEW+pilots+Math.round(dep/2.20462))) } kg</div><div>Max Fuel: ${maxFuelLb} lb</div><div>Under: ${under} kg</div>`;
    if(i+1<rows.length){const next=rows[i+1].querySelector('input');if(!next.value||next.dataset.auto==='1'){next.value=(dep-(parseFloat(inp[2].value)||0)).toFixed(0);next.dataset.auto='1';}}
    row.classList.toggle('overweight',dep>maxFuelLb);
  });
}

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
