// Formulário em etapas: valida cada etapa antes de avançar, monta a revisão e
// envia tudo de uma vez para enviar.php. Sem bibliotecas.
const form = document.getElementById('form');
const etapas = [...form.querySelectorAll('.etapa')];
const passos = [...form.querySelectorAll('.progresso li')];
const barra = document.getElementById('barra');
const btnAvancar = document.getElementById('avancar');
const btnVoltar = document.getElementById('voltar');
const aviso = document.getElementById('aviso');
let atual = 0;
let csrf = '';
let pets = [];

const ROTULOS = {
  nome: 'Nome', email: 'E-mail', telefone: 'Telefone', bairro: 'Bairro', moradia: 'Moradia',
  telado: 'Telas', outros_pets: 'Outros animais', pet: 'Pet', porte: 'Porte', motivo: 'Motivo',
};

fetch('enviar.php', { credentials: 'same-origin' })
  .then(r => r.json()).then(j => { csrf = j.csrf; })
  .catch(() => mostrarAviso('Não foi possível iniciar o formulário. Recarregue a página.'));

// ---------------------------------------------------------------- retratos dos pets
// Cada pet ganha um retrato em SVG desenhado aqui, a partir das cores do
// pets.json: nenhuma foto para baixar e cada bicho fica com a sua cara.
// As cores passam por um filtro (#rrggbb) antes de entrar no SVG.
const cor = (v, padrao) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : padrao);

function retrato(v = {}) {
  const fundo = cor(v.fundo, '#f6e7d6'), pelo = cor(v.pelo, '#d9964a'), traco = cor(v.traco, '#3a2a22');
  const olhos = (x, y) => `<circle cx="${40 - x}" cy="${y}" r="2.8" fill="#2a1f1a"/><circle cx="${40 + x}" cy="${y}" r="2.8" fill="#2a1f1a"/>
    <circle cx="${41 - x}" cy="${y - 1}" r=".9" fill="#fff"/><circle cx="${41 + x}" cy="${y - 1}" r=".9" fill="#fff"/>`;
  let corpo;
  if (v.tipo === 'gato') {
    const olho = cor(v.olho, '#6fae5a');
    corpo = `
      <g class="orelhas"><path d="M19 31 22 9l15 13z" fill="${pelo}"/><path d="M23.5 26 25 15.5l7 6.5z" fill="#f2a9a0"/>
      <path d="M61 31 58 9 43 22z" fill="${pelo}"/><path d="M56.5 26 55 15.5 48 22z" fill="#f2a9a0"/></g>
      <ellipse cx="40" cy="43" rx="24" ry="21" fill="${pelo}"/>
      ${v.mancha ? `<path d="M40 22c9 0 17 4 21 11-6 4-14 3-17-3-1-3-2-6-4-8z" fill="${cor(v.mancha, pelo)}"/>` : ''}
      <ellipse cx="31" cy="40" rx="3.8" ry="4.6" fill="${olho}"/><ellipse cx="49" cy="40" rx="3.8" ry="4.6" fill="${olho}"/>
      <ellipse cx="31" cy="40" rx="1.3" ry="3.8" fill="#1d1a1a"/><ellipse cx="49" cy="40" rx="1.3" ry="3.8" fill="#1d1a1a"/>
      <path d="M37.8 47.5h4.4L40 50.2z" fill="#e58f8a"/>
      <path d="M40 50.2v1.8m0 0c-1.5 2-4 2-5 .4m5-.4c1.5 2 4 2 5 .4M27 49l-11-2m11 4.5-11 2M53 49l11-2m-11 4.5 11 2"
        stroke="${traco}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  } else if (v.tipo === 'cao') {
    const orelha = cor(v.orelha, '#b06f2c'), focinho = cor(v.focinho, '#f3d9b4');
    corpo = `
      <g class="orelhas"><ellipse cx="17" cy="35" rx="9" ry="17" fill="${orelha}" transform="rotate(18 17 35)"/>
      <ellipse cx="63" cy="35" rx="9" ry="17" fill="${orelha}" transform="rotate(-18 63 35)"/></g>
      <circle cx="40" cy="42" r="23" fill="${pelo}"/>
      ${v.mancha ? `<ellipse cx="50" cy="35" rx="9" ry="8.5" fill="${cor(v.mancha, pelo)}" opacity=".75"/>` : ''}
      <ellipse cx="40" cy="51" rx="12" ry="9" fill="${focinho}"/>
      <ellipse cx="40" cy="46.5" rx="4.2" ry="3" fill="#3a2a22"/>
      <path d="M40 49.5v4m0 0c-2 2.5-5 2.5-6.5.5m6.5-.5c2 2.5 5 2.5 6.5.5" stroke="#3a2a22" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      ${olhos(9, 38)}`;
  } else { // "qualquer um": um coração com patinha
    corpo = `<path d="M40 60C24 49 18 40 18 32a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 8-6 17-22 28z" fill="#e0703a"/>
      <ellipse cx="40" cy="41" rx="6.5" ry="5.2" fill="#fff"/><circle cx="31.5" cy="34" r="2.6" fill="#fff"/><circle cx="37" cy="30" r="2.8" fill="#fff"/>
      <circle cx="43" cy="30" r="2.8" fill="#fff"/><circle cx="48.5" cy="34" r="2.6" fill="#fff"/>`;
  }
  return `<svg class="retrato" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="38" fill="${fundo}"/>${corpo}</svg>`;
}

const PORTES = { pequeno: 'porte pequeno', medio: 'porte médio', grande: 'porte grande' };
let porteAutomatico = false;

fetch('dados/pets.json').then(r => r.json()).then(lista => {
  pets = lista;
  const caixa = document.getElementById('pets');
  const qualquer = { id: 'qualquer', nome: 'Qualquer um', especie: 'o abrigo indica', idade: '', tracos: ['surpresa boa'],
    sobre: 'A equipe sugere quem mais combina com a sua casa e a sua rotina.', visual: { tipo: 'coracao', fundo: '#fde3d3' } };
  for (const p of [...lista, qualquer]) {
    const el = document.createElement('label');
    el.className = 'pet';
    el.innerHTML = `<input type="radio" name="pet" value="${p.id}" required>
      <span class="ficha">${retrato(p.visual)}<strong></strong><span class="meta"></span><span class="tracos"></span></span>`;
    el.querySelector('strong').textContent = p.nome;          // textContent: nada de HTML vindo de dados
    el.querySelector('.meta').textContent = [p.especie, p.idade].filter(Boolean).join(' · ');
    for (const t of [PORTES[p.porte], ...(p.tracos || [])].filter(Boolean).slice(0, 3)) {
      const chip = document.createElement('span');
      chip.textContent = t;
      el.querySelector('.tracos').append(chip);
    }
    caixa.append(el);
  }
  // ao escolher: mostra a história do pet e sugere o porte dele (sem passar por cima de quem já escolheu)
  const detalhe = document.getElementById('pet-detalhe');
  caixa.addEventListener('change', (e) => {
    const p = [...lista, qualquer].find(x => x.id === e.target.value);
    if (!p) return;
    detalhe.replaceChildren();
    const nome = document.createElement('strong');
    nome.textContent = p.nome + ' · ';
    detalhe.append(nome, p.sobre);
    detalhe.hidden = false;
    if (!form.porte.value || porteAutomatico) {
      form.porte.value = p.porte || 'tanto-faz';
      porteAutomatico = true;
    }
    sinal('pet', { pet: p, detalhe });
  });
  form.porte.addEventListener('change', () => { porteAutomatico = false; });
  sinal('pets');
});

// Os efeitos visuais (efeitos.js) só escutam estes eventos. Sem eles o formulário
// funciona igual: a lógica não depende de animação nenhuma.
function sinal(nome, detalhe = {}) {
  document.dispatchEvent(new CustomEvent('form:' + nome, { detail: detalhe }));
}

function mostrarAviso(texto) {
  aviso.textContent = texto;
  aviso.hidden = !texto;
}

function limparErros(raiz) {
  raiz.querySelectorAll('.msg-erro').forEach(e => e.remove());
  raiz.querySelectorAll('.invalido').forEach(e => e.classList.remove('invalido'));
}

function marcarErro(nome, texto) {
  const campo = form.elements[nome];
  const alvo = campo instanceof RadioNodeList ? campo[0] : campo;
  if (!alvo) return;
  const rotulo = alvo.closest('label');
  const grupo = alvo.closest('.opcoes, .pets') || rotulo;
  if (!(campo instanceof RadioNodeList)) alvo.classList.add('invalido');
  const msg = document.createElement('span');
  msg.className = 'msg-erro';
  msg.textContent = texto;
  grupo.after(msg);
}

function etapaValida(i) {
  const fs = etapas[i];
  limparErros(fs);
  let ok = true;
  const vistos = new Set();
  for (const el of fs.querySelectorAll('input, select, textarea')) {
    if (vistos.has(el.name) || !el.name) continue;
    vistos.add(el.name);
    if (!el.checkValidity()) {
      ok = false;
      marcarErro(el.name, el.type === 'checkbox' ? 'Obrigatório para continuar.' : (el.validationMessage || 'Preencha este campo.'));
    }
  }
  if (!ok) {
    fs.querySelector('.invalido, .msg-erro')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    sinal('erro', { etapa: fs });
  }
  return ok;
}

function dados() {
  const fd = new FormData(form);
  const obj = Object.fromEntries(fd.entries());
  for (const nome of ['telado', 'todos_de_acordo', 'consentimento']) obj[nome] = fd.has(nome) ? 'sim' : 'nao';
  return obj;
}

function montarResumo() {
  const d = dados();
  const dl = document.getElementById('resumo');
  dl.replaceChildren();
  for (const [chave, rotulo] of Object.entries(ROTULOS)) {
    let valor = d[chave];
    if (!valor) continue;
    if (chave === 'pet') valor = pets.find(p => p.id === valor)?.nome || 'Qualquer um';
    if (chave === 'telado') valor = valor === 'sim' ? 'Sim' : 'Não';
    if (chave === 'moradia' || chave === 'porte') valor = form.querySelector(`[name="${chave}"] option[value="${valor}"], [name="${chave}"][value="${valor}"] + span`)?.textContent.replace(/^\W+/, '') || valor;
    const dt = document.createElement('dt'); dt.textContent = rotulo;
    const dd = document.createElement('dd'); dd.textContent = valor;
    dl.append(dt, dd);
  }
}

function irPara(i) {
  const volta = i < atual;
  etapas[atual].classList.remove('ativa', 'volta');
  atual = i;
  etapas[atual].classList.add('ativa');
  etapas[atual].classList.toggle('volta', volta);
  passos.forEach((p, k) => { p.classList.toggle('ativo', k === i); p.classList.toggle('feito', k < i); });
  barra.style.width = `${(i + 1) * 25}%`;
  btnVoltar.hidden = i === 0;
  btnAvancar.textContent = i === etapas.length - 1 ? 'Enviar pedido' : 'Continuar';
  if (i === etapas.length - 1) montarResumo();
  mostrarAviso('');
  etapas[atual].querySelector('input:not([type=radio]), select, textarea')?.focus({ preventScroll: true });
  sinal('etapa', { indice: i, total: etapas.length, volta, etapa: etapas[i] });
}

async function enviar() {
  btnAvancar.disabled = true;
  btnAvancar.textContent = 'Enviando…';
  try {
    const r = await fetch('enviar.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify(dados()),
    });
    const j = await r.json();
    if (!j.ok) {
      if (j.erros) {
        // erro do servidor: volta para a primeira etapa que tem o campo com problema
        const primeiro = Object.keys(j.erros)[0];
        const alvo = etapas.findIndex(fs => fs.querySelector(`[name="${primeiro}"]`));
        if (alvo >= 0) irPara(alvo);
        for (const [campo, msg] of Object.entries(j.erros)) marcarErro(campo, msg);
      } else {
        mostrarAviso(j.erro || 'Não foi possível enviar.');
      }
      return;
    }
    form.hidden = true;
    document.getElementById('protocolo').textContent = j.protocolo;
    document.getElementById('modo-demo').hidden = j.modo !== 'demonstracao';
    document.getElementById('pronto').hidden = false;
    sinal('enviado', { protocolo: j.protocolo });
  } catch {
    mostrarAviso('Sem conexão. Confira a internet e tente de novo.');
  } finally {
    btnAvancar.disabled = false;
    if (!form.hidden) btnAvancar.textContent = 'Enviar pedido';
  }
}

btnAvancar.addEventListener('click', () => {
  if (!etapaValida(atual)) return;
  if (atual < etapas.length - 1) irPara(atual + 1);
  else enviar();
});
btnVoltar.addEventListener('click', () => irPara(atual - 1));
form.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); btnAvancar.click(); }
});
form.addEventListener('input', e => {
  e.target.classList.remove('invalido');
  e.target.closest('label')?.nextElementSibling?.classList.contains('msg-erro') && e.target.closest('label').nextElementSibling.remove();
});
