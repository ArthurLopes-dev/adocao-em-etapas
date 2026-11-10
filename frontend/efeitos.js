// Camada de movimento da página de adoção (anime.js v4 + cena three.js).
//
// Quatro camadas, cada uma no seu limite (skill de anime.js):
//   entrada  — constrói a página uma vez, ~1,6 s
//   ambiente — patinhas respirando na cena 3D (≤ 0,18 de amplitude)
//   input    — resposta a escolha, erro e troca de etapa (120–520 ms)
//   evento   — a "festa" quando o pedido é enviado
//
// Três caminhos funcionam: normal; prefers-reduced-motion (nada se move, nenhum
// loop); e sem este arquivo (o formulário em app.js não depende dele).
import { animate, createTimeline, stagger, splitText, svg, utils, spring, engine } from 'animejs';
import { criarCena } from './cena.js';

const raiz = document.documentElement;
const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;

engine.defaults.ease = 'out(3)';
engine.precision = 3;

function mod(nome, fn) {
  try { return fn(); } catch (e) { console.warn(`[${nome}] ignorado:`, e && e.message); return null; }
}

const cena = mod('cena', () => criarCena(document.getElementById('cena'), { reduzir }));

// Tira o estado inicial do CSS ([data-hide]) já com opacity 0 inline, para o
// elemento não piscar entre a remoção do atributo e o primeiro quadro.
function preparar(alvos) {
  const lista = typeof alvos === 'string' ? [...document.querySelectorAll(alvos)] : [].concat(alvos).filter(Boolean);
  lista.forEach((el) => { el.style.opacity = '0'; el.removeAttribute('data-hide'); });
  return lista;
}

function mostrarTudo() {
  document.querySelectorAll('[data-hide]').forEach((el) => el.removeAttribute('data-hide'));
}

let passoAtual = 0;

if (reduzir || !raiz.classList.contains('efeitos')) {
  mostrarTudo();
  marcarPasso(0);
} else {
  mod('entrada', entrada);
}
mod('etapas', etapas);
mod('escolhas', escolhas);
mod('envio', envio);

// ------------------------------------------------------------------ entrada
function entrada() {
  const titulo = document.querySelector('.titulo');
  const tl = createTimeline({ defaults: { duration: 720, ease: 'out(4)' } });

  tl.add(preparar('.topo'), { opacity: [0, 1], y: [-14, 0], duration: 600 }, 0);

  const pata = svg.createDrawable('.pata-traco');
  tl.add(pata, { draw: ['0 0', '0 1'], duration: 900, delay: stagger(90), ease: 'inOut(2)' }, 120);

  tl.add(preparar('.selo-topo'), { opacity: [0, 1], y: [10, 0], duration: 520 }, 180);

  // título palavra por palavra, cada uma subindo de dentro de uma máscara
  preparar(titulo).forEach((el) => { el.style.opacity = '1'; });
  const partes = splitText(titulo, { words: { wrap: 'clip', class: 'palavra' } });
  tl.add(partes.words, { y: ['110%', '0%'], duration: 820, delay: stagger(55), ease: 'out(4)' }, 240);

  tl.add(preparar('.sub'), { opacity: [0, 1], y: [14, 0] }, 520);
  const fatos = preparar('.fatos li');
  tl.add(fatos, { opacity: [0, 1], y: [18, 0], delay: stagger(80) }, 640);
  tl.add(preparar('.coluna-form'), { opacity: [0, 1], y: [34, 0], scale: [0.985, 1], duration: 900, ease: 'out(4)' }, 380);

  // contadores dos fatos
  document.querySelectorAll('[data-contar]').forEach((el, i) => {
    const valor = { v: 0 };
    const fim = Number(el.dataset.contar);
    el.textContent = '0';
    tl.add(valor, {
      v: fim, duration: 1100, ease: 'out(4)', modifier: utils.round(0),
      onRender: () => { el.textContent = valor.v.toLocaleString('pt-BR'); },
    }, 700 + i * 80);
  });

  if (cena) {
    // soltas: descem no lugar com mola
    cena.soltas().forEach((p, i) => {
      p.pulo.position.y = 5;
      p.pulo.scale.setScalar(0.001);
      tl.add(p.pulo.position, { y: 0, ease: spring({ bounce: 0.4, duration: 1000 }) }, 250 + i * 90);
      tl.add(p.pulo.scale, { x: 1, y: 1, z: 1, duration: 700, ease: 'outBack(1.5)' }, 250 + i * 90);
    });
    // trilha: cada pegada "pisa" depois da anterior, como alguém andando
    cena.trilha().forEach((p, i) => {
      p.pulo.scale.setScalar(0.001);
      p.pulo.position.z = 1.2;
      tl.add(p.pulo.scale, { x: 1, y: 1, z: 1, duration: 420, ease: 'outBack(2.2)' }, 900 + i * 190);
      tl.add(p.pulo.position, { z: 0, duration: 420, ease: 'out(3)' }, 900 + i * 190);
    });
    tl.then(() => marcarPasso(passoAtual)); // não .call(): ele pode disparar no init (armadilha 4)
  }

  // Rede de segurança: se o relógio de quadros parar (aba em segundo plano,
  // economia de energia), a entrada termina sozinha e nada fica invisível.
  setTimeout(() => { if (!tl.completed) tl.complete(); }, 3500);
}

// ------------------------------------------------------------------ troca de etapa
function etapas() {
  document.addEventListener('form:etapa', (e) => {
    const { etapa, volta, indice } = e.detail;
    passoAtual = indice;
    marcarPasso(indice);
    if (reduzir) return;
    const filhos = [...etapa.children].filter((c) => c.tagName !== 'LEGEND');
    createTimeline({ defaults: { ease: 'out(3)' } })
      .add(etapa, { opacity: [0, 1], x: [volta ? -36 : 36, 0], duration: 480 }, 0)
      .add(etapa.querySelector('legend'), { opacity: [0, 1], y: [10, 0], duration: 380 }, 60)
      .add(filhos, { opacity: [0, 1], y: [14, 0], duration: 420, delay: stagger(45) }, 90);

    if (etapa.querySelector('.pets')) {
      animate(etapa.querySelectorAll('.pet'), {
        opacity: [0, 1], scale: [0.92, 1], y: [10, 0], duration: 520,
        delay: stagger(55, { grid: [3, 2], from: 'center' }), ease: 'out(3)',
      });
    }
    pular();
  });

  // erro: a mensagem desce e o primeiro campo errado sacode
  document.addEventListener('form:erro', (e) => {
    if (reduzir) return;
    const fs = e.detail.etapa;
    animate(fs.querySelectorAll('.msg-erro'), { opacity: [0, 1], y: [-6, 0], duration: 320 });
    const alvo = fs.querySelector('.invalido') || fs.querySelector('.msg-erro')?.previousElementSibling;
    if (alvo) animate(alvo, { x: [0, -9, 8, -6, 4, 0], duration: 460, ease: 'inOut(2)' });
  });
}

// A trilha mostra o progresso: pegadas até a etapa atual ficam laranja.
// Sem movimento (reduced-motion) a cor muda igual — a informação não se perde.
function marcarPasso(indice) {
  if (!cena) return;
  cena.trilha().forEach((p, i) => {
    const cor = i <= indice ? 'laranja' : 'creme';
    if (p.cor === cor) return;
    cena.pintar(p, cor);
    if (reduzir) return;
    if (cor === 'laranja') {
      animate(p.pulo.scale, { x: [1.35, 1], y: [1.35, 1], z: [1.35, 1], ease: spring({ bounce: 0.55, duration: 700 }) });
      animate(p.pulo.position, { z: [0.8, 0], duration: 500, ease: 'out(3)' });
    }
  });
  if (reduzir) cena.renderizar();
}

// cada avanço faz as patinhas soltas darem um pulinho
function pular() {
  if (!cena || reduzir) return;
  cena.soltas().forEach((p, i) => {
    animate(p.pulo.position, { y: [0, 0.7, 0], duration: 620, delay: i * 60, ease: 'out(2)' });
  });
}

// ------------------------------------------------------------------ escolhas
function escolhas() {
  document.getElementById('form').addEventListener('change', (e) => {
    if (reduzir || e.target.type !== 'radio') return;
    const cartao = e.target.nextElementSibling;
    if (cartao) animate(cartao, { scale: [0.94, 1], ease: spring({ bounce: 0.55, duration: 520 }) });
  });
  // pet escolhido: o retrato balança a cabeça, as orelhas mexem e a história dele aparece
  document.addEventListener('form:pet', (e) => {
    if (reduzir) return;
    const cartao = document.querySelector(`.pet input[value="${e.detail.pet.id}"] + .ficha`);
    const retrato = cartao && cartao.querySelector('.retrato');
    if (retrato) {
      animate(retrato, {
        rotate: [0, -12, 9, -5, 0], scale: [1, 1.14, 1], duration: 680, ease: 'out(2)',
        onComplete: (a) => utils.cleanInlineStyles(a),   // devolve o transform ao CSS (hover)
      });
      const orelhas = retrato.querySelector('.orelhas');
      if (orelhas) animate(orelhas, { y: [0, -2.5, 0, -1.5, 0], duration: 620, ease: 'inOut(2)' });
    }
    animate(e.detail.detalhe, { opacity: [0, 1], y: [-6, 0], duration: 360 });
  });

  // botões: um aperto rápido no clique
  document.querySelectorAll('.acoes button').forEach((b) => {
    b.addEventListener('pointerdown', () => { if (!reduzir) animate(b, { scale: [1, 0.95], duration: 120, ease: 'out(2)' }); });
    b.addEventListener('pointerup', () => { if (!reduzir) animate(b, { scale: 1, ease: spring({ bounce: 0.5, duration: 420 }) }); });
  });
}

// ------------------------------------------------------------------ envio
function envio() {
  document.addEventListener('form:enviado', () => {
    if (reduzir) return;
    const pronto = document.getElementById('pronto');
    const check = svg.createDrawable('.selo-check');   // o selo já está renderizado aqui
    utils.set(check, { draw: '0 0' });
    createTimeline({ defaults: { ease: 'out(3)' } })
      .add(pronto, { opacity: [0, 1], y: [24, 0], scale: [0.97, 1], duration: 560 }, 0)
      .add('.selo-fundo', { scale: [0, 1], ease: spring({ bounce: 0.5, duration: 700 }) }, 120)
      .add(check, { draw: ['0 0', '0 1'], duration: 520, ease: 'inOut(3)' }, 420)
      .add(pronto.querySelectorAll('h2, p:not([hidden])'), { opacity: [0, 1], y: [12, 0], delay: stagger(80), duration: 460 }, 520);

    // festa: a trilha inteira pula em onda e as soltas dão uma volta
    if (!cena) return;
    marcarPasso(3);
    cena.trilha().forEach((p, i) => {
      animate(p.pulo.position, { y: [0, 0.9, 0], duration: 700, delay: 250 + i * 110, ease: 'out(2)' });
    });
    cena.soltas().forEach((p, i) => {
      animate(p.pulo.position, { y: [0, 1.4, 0], duration: 900, delay: 350 + i * 80, ease: 'out(2)' });
      animate(p.pulo.rotation, { y: p.pulo.rotation.y + Math.PI * 2, duration: 1300, delay: 350 + i * 80, ease: 'inOut(3)' });
    });
  });
}
