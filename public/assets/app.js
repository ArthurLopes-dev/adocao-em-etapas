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

fetch('dados/pets.json').then(r => r.json()).then(lista => {
  pets = lista;
  const caixa = document.getElementById('pets');
  const qualquer = { id: 'qualquer', nome: 'Qualquer um', especie: 'deixo o abrigo indicar', idade: '', sobre: 'A equipe sugere quem combina com sua casa.' };
  for (const p of [...lista, qualquer]) {
    const el = document.createElement('label');
    el.className = 'pet';
    el.innerHTML = `<input type="radio" name="pet" value="${p.id}" required>
      <span class="ficha"><strong></strong><span class="meta"></span><p></p></span>`;
    el.querySelector('strong').textContent = p.nome;          // textContent: nada de HTML vindo de dados
    el.querySelector('.meta').textContent = [p.especie, p.idade].filter(Boolean).join(' · ');
    el.querySelector('p').textContent = p.sobre;
    caixa.append(el);
  }
});

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
  if (!ok) fs.querySelector('.invalido, .msg-erro')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
