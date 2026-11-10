// Cena 3D de fundo: patinhas de "massinha".
//
// - Uma TRILHA de 4 pegadas no canto livre embaixo dos números: cada pegada é
//   uma etapa do formulário e fica laranja quando a pessoa chega nela.
// - Algumas patinhas soltas nas margens, mais longe e mais transparentes.
// - Modeladas no código (almofada + 4 dedos, esferas achatadas) com
//   MeshMatcapMaterial e matcap desenhado num canvas: aparência de argila sem
//   luz, sem HDR, sem imagem para baixar (receita 03 da skill de three.js).
// - Posições relativas à tela (-1..1) e só onde não há texto; sem WebGL, o
//   canvas sai da página e nada mais muda.
import {
  WebGLRenderer, Scene, PerspectiveCamera, SphereGeometry, MeshMatcapMaterial,
  CanvasTexture, SRGBColorSpace, Group, Mesh, Timer, MathUtils,
} from 'three';

export const CORES = {
  laranja: ['#f08345', '#a8441a'],
  pessego: ['#f2b27a', '#8f4f22'],
  creme: ['#efe2d0', '#a68867'],
  caramelo: ['#9a6440', '#3b1f10'],
  rosa: ['#f0a3a0', '#8e4343'],
};

// Soltas: [x, y] da tela, z, tamanho, cor
const SOLTAS_LARGO = [
  [0.14, 0.84, -5, 0.4, 'pessego'],
  [0.97, 0.12, -3, 0.44, 'rosa'],
  [-1.02, 0.02, -6, 0.5, 'caramelo'],
  [0.78, -0.8, -2, 0.36, 'creme'],
];
const SOLTAS_ESTREITO = [
  [0.88, 0.93, -3, 0.32, 'rosa'],
  [-0.9, -0.95, -2, 0.3, 'pessego'],
];
// Trilha: começa no canto e "anda" para cima e para a direita
const TRILHA_LARGO = { de: [-0.86, -0.86], ate: [-0.2, -0.5], tamanho: 0.27, passo: 0.06 };

function gerarMatcap([base, sombra]) {
  const t = 256, R = t / 2;
  const c = document.createElement('canvas');
  c.width = c.height = t;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, t, t);
  const borda = g.createRadialGradient(R * 0.92, R * 0.88, R * 0.2, R, R, R);
  borda.addColorStop(0, 'rgba(0,0,0,0)');
  borda.addColorStop(1, sombra);
  g.fillStyle = borda;
  g.fillRect(0, 0, t, t);
  const brilho = g.createRadialGradient(R * 0.66, R * 0.58, 0, R * 0.66, R * 0.58, R * 0.6);
  brilho.addColorStop(0, 'rgba(255,255,255,0.75)');
  brilho.addColorStop(0.35, 'rgba(255,255,255,0.25)');
  brilho.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = brilho;
  g.fillRect(0, 0, t, t);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace; // matcap é imagem de cor
  return tex;
}

export function criarCena(canvas, { reduzir = false } = {}) {
  if (!canvas) return null;
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    canvas.remove();
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);

  const cena = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  const geometria = new SphereGeometry(1, 36, 24);
  const matcaps = Object.fromEntries(Object.entries(CORES).map(([k, v]) => [k, gerarMatcap(v)]));

  // pata = base (posição na tela) > pulo (anime.js) > corpo (respira e gira)
  function criarPata(cor) {
    const material = new MeshMatcapMaterial({ matcap: matcaps[cor], transparent: true });
    const corpo = new Group();
    const almofada = new Mesh(geometria, material);
    almofada.scale.set(1.05, 0.88, 0.3);
    almofada.position.y = -0.36;
    corpo.add(almofada);
    for (const [x, y, s] of [[-1, 0.5, 0.36], [-0.36, 1.06, 0.4], [0.36, 1.06, 0.4], [1, 0.5, 0.36]]) {
      const dedo = new Mesh(geometria, material);
      dedo.scale.set(s, s * 1.2, s * 0.55);
      dedo.position.set(x, y, 0);
      dedo.rotation.z = -x * 0.3;
      corpo.add(dedo);
    }
    const pulo = new Group();
    pulo.add(corpo);
    const base = new Group();
    base.add(pulo);
    cena.add(base);
    return { base, pulo, corpo, material, cor };
  }

  const trilha = Array.from({ length: 4 }, () => criarPata('creme'));
  const soltas = SOLTAS_LARGO.map((s) => criarPata(s[4]));
  soltas.forEach((p, i) => { p.fase = i * 1.9; p.giro = (i % 2 ? 1 : -1) * 0.08; });

  function noMundo(nx, ny, z) {
    const meiaAlt = Math.tan(MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - z);
    return [nx * meiaAlt * camera.aspect, ny * meiaAlt];
  }

  let largura = 0, altura = 0, estreito = false;
  function posicionar() {
    largura = window.innerWidth;
    altura = window.innerHeight;
    renderer.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
    estreito = largura < 900;

    const lista = estreito ? SOLTAS_ESTREITO : SOLTAS_LARGO;
    soltas.forEach((p, i) => {
      const item = lista[i];
      p.base.visible = Boolean(item);
      if (!item) return;
      const [nx, ny, z, escala, cor] = item;
      const [x, y] = noMundo(nx, ny, z);
      p.base.position.set(x, y, z);
      p.base.scale.setScalar(escala);
      p.material.matcap = matcaps[cor];
      p.material.opacity = MathUtils.clamp(1 + z * 0.09, 0.4, 1); // mais longe, mais clara
      p.corpo.rotation.set(0.3, (i % 2 ? 0.25 : -0.25), (i % 2 ? -0.5 : 0.45));
    });

    // trilha: só onde existe o canto livre (telas largas)
    const t = TRILHA_LARGO;
    const [x0, y0] = noMundo(t.de[0], t.de[1], 0);
    const [x1, y1] = noMundo(t.ate[0], t.ate[1], 0);
    const ang = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2; // dedos apontando para onde anda
    const lado = [-(y1 - y0), x1 - x0];
    const norma = Math.hypot(lado[0], lado[1]) || 1;
    trilha.forEach((p, i) => {
      p.base.visible = !estreito;
      const k = i / (trilha.length - 1);
      const desvio = (i % 2 ? 1 : -1) * t.passo * Math.hypot(x1 - x0, y1 - y0);
      p.base.position.set(x0 + (x1 - x0) * k + (lado[0] / norma) * desvio, y0 + (y1 - y0) * k + (lado[1] / norma) * desvio, 0);
      p.base.scale.setScalar(t.tamanho);
      p.corpo.rotation.set(0.35, 0, ang + (i % 2 ? 0.12 : -0.12));
    });
  }
  posicionar();
  window.addEventListener('resize', posicionar, { passive: true });

  // o ponteiro desloca a câmera de leve (parallax entre perto e longe)
  const alvo = { x: 0, y: 0 };
  if (!reduzir) {
    window.addEventListener('pointermove', (e) => {
      alvo.x = (e.clientX / largura - 0.5) * 2;
      alvo.y = (e.clientY / altura - 0.5) * 2;
    }, { passive: true });
  }

  const timer = new Timer();
  function quadro() {
    timer.update();
    const t = timer.getElapsed();
    const dt = Math.min(timer.getDelta(), 0.05);
    camera.position.x = MathUtils.damp(camera.position.x, alvo.x * 0.5, 3, dt);
    camera.position.y = MathUtils.damp(camera.position.y, -alvo.y * 0.35, 3, dt);
    camera.lookAt(0, 0, 0);
    for (const p of soltas) {
      if (!p.base.visible) continue;
      p.corpo.position.y = Math.sin(t * 0.55 + p.fase) * 0.16;    // respiração lenta, amplitude pequena
      p.corpo.rotation.z += p.giro * dt;
    }
    renderer.render(cena, camera);
  }

  if (reduzir) {
    const desenhar = () => renderer.render(cena, camera);
    desenhar();                                   // um quadro parado, nenhum loop
    window.addEventListener('resize', desenhar, { passive: true });
  } else {
    renderer.setAnimationLoop(quadro);            // rAF: pausa sozinho com a aba oculta
  }

  return {
    trilha: () => trilha.filter((p) => p.base.visible),
    soltas: () => soltas.filter((p) => p.base.visible),
    pintar: (p, cor) => { p.material.matcap = matcaps[cor]; p.cor = cor; },
    renderizar: () => renderer.render(cena, camera),
  };
}
