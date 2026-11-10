// Roda antes da primeira pintura: avisa o CSS que os efeitos vão assumir as
// entradas. Se o módulo de efeitos não chegar (navegador antigo, erro, bloqueio),
// o CSS mostra tudo sozinho depois de 2,5 s — nada fica invisível para sempre.
if ('noModule' in HTMLScriptElement.prototype && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('efeitos');
}
