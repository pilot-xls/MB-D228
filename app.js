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

  // Notas de limite
  const maxPayload = MRW - (BEW + pilots + fuel);
  const maxFuel    = MRW - (BEW + pilots + manualPayload);
  document.getElementById('maxPayloadNote').innerText = maxPayload > 0
    ? ` | Máx Payload: ${maxPayload.toFixed(0)} kg` : ' | Excede limite!';
  document.getElementById('maxFuelNote').innerHTML    = maxFuel > 0
    ? `<small> | Máx Fuel: ${maxFuel.toFixed(0)} kg (${(maxFuel*2.20462).toFixed(0)} lb)</small>`
    : '<small> | Excede limite!</small>';

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

function criarLinhaLeg(route='',depF='',payl='',tripF=''){
  const tbody=document.getElementById('legsTable');
  const tr=document.createElement('tr');
  tr.innerHTML=`<td>${route}</td>
    <td><input type="number" step="any" value="${depF}"></td>
    <td><input type="number" step="any" value="${payl}"></td>
    <td><input type="number" step="any" value="${tripF}"></td>
    <td class="ldg">0</td>
    <td><button class="route-insert">+</button></td>`;
  tbody.appendChild(tr);
  tr.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('focus',e=>e.target.select());
    inp.addEventListener('input',()=>{guardarLegs();updateLdgAuto();});
  });
  tr.querySelector('.route-insert').addEventListener('click',e=>{e.stopPropagation();inserirLeg(e.target);});
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
  const defsExist=localStorage.getItem('definicoesMB');
  const rotasExist=localStorage.getItem('rotasPadrao');
  if(defsExist&&rotasExist)return;
  try{const res=await fetch('default_settings.json');if(!res.ok)throw'';const d=await res.json();if(!defsExist)localStorage.setItem('definicoesMB',JSON.stringify(d.definicoesMB));if(!rotasExist)localStorage.setItem('rotasPadrao',JSON.stringify(d.rotasPadrao));}catch{if(!defsExist)localStorage.setItem('definicoesMB',JSON.stringify({pesoHomem:86,pesoMulher:68,pesoCrianca:35,pesoBagagem:10,avioes:[{nome:'Dornier 228',peso:3643,momento:26419}]}));if(!rotasExist)localStorage.setItem('rotasPadrao',JSON.stringify([]));}
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
  document.getElementById('btnAddLeg').addEventListener('click',criarLinhaLeg);
  document.getElementById('btnRemoveLeg').addEventListener('click',()=>{const sel=document.querySelector('#legsTable tr.selected');if(sel)sel.remove();});
  document.getElementById('dropdownRotas').addEventListener('change',preencherLegsComRota);

  calculate(); updateLdgAuto();
  if(window.feather)feather.replace();
});
